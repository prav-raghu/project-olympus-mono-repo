---
name: backend-service
description: Use when working on any NestJS backend service including api-gateway, customer-api, admin-api, or schedule-api. Covers modules, controllers, services, DTOs, guards, interceptors, filters, Azure MSAL authentication, rate limiting, health checks, error handling, and general backend business logic. Also activates for refactoring existing services or debugging backend issues. For generating a full CRUD layer from an existing Prisma model, use api-builder instead.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

## Service registry

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | 4000 | Public entry point, MSAL auth, proxies to services |
| `admin-api` | 4001 | Administrative operations |
| `customer-api` | 4002 | Customer-facing business logic |
| `schedule-api` | 4003 | Scheduling, appointments, background jobs |

## Directory structure (immutable)

```
apps/backend/[service-name]/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   ├── env.config.ts           ← re-exports from @project-olympus/config
│   │   └── rate-limit.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── azure-auth.guard.ts
│   │   │   │   ├── permissions.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── decorators/
│   │   │       ├── roles.decorator.ts
│   │   │       ├── permissions.decorator.ts
│   │   │       └── current-user.decorator.ts
│   │   ├── health/
│   │   │   ├── health.module.ts
│   │   │   └── health.controller.ts
│   │   └── [domain]/
│   │       ├── [domain].module.ts
│   │       ├── [domain].controller.ts
│   │       ├── [domain].service.ts
│   │       ├── dto/
│   │       │   ├── create-[domain].dto.ts
│   │       │   └── update-[domain].dto.ts
│   │       └── interfaces/
│   │           └── [domain].interface.ts
│   └── common/
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   ├── logging.interceptor.ts
│       │   └── response-transform.interceptor.ts
│       └── pipes/
│           └── validation.pipe.ts
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   └── services/
│   └── mocks/
├── jest.config.ts
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── .env.example
```

Do not alter this structure or naming conventions unless explicitly instructed.

## Architecture rules

NestJS DI — every service/guard/interceptor decorated with `@Injectable()`, injected via constructor, never instantiated directly. Standalone modules — each domain has its own `@Module`. Class-based DTOs — `class-validator` + `class-transformer` decorators, never plain interfaces, never AJV, never Zod. Azure MSAL auth — `AzureAuthGuard` extends the base from `@project-olympus/auth`. Global pipes/filters/interceptors registered in `main.ts`.

## Controller pattern

```typescript
import { Controller, Get, Post, Body, Param, UseGuards, Version, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AzureUser } from '@project-olympus/auth';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List users' })
  public async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Version('1')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create user' })
  public async create(@Body() dto: CreateUserDto, @CurrentUser() user: AzureUser) {
    return this.usersService.create(dto, user.id);
  }
}
```

## Service pattern

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@project-olympus/logging';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@prisma/client/admin';
import type { ResponseDto } from '@project-olympus/types';
import type { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  public async findAll(): Promise<ResponseDto<unknown[]>> {
    const items = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, email: true, azureOid: true, createdAt: true },
    });
    return { isSuccessful: true, data: items };
  }

  public async create(dto: CreateUserDto, userId: string): Promise<ResponseDto<unknown>> {
    const item = await this.prisma.user.create({
      data: { id: crypto.randomUUID(), ...dto, createdBy: userId, modifiedBy: userId },
    });
    return { isSuccessful: true, data: item };
  }
}
```

## DTO pattern (class-validator)

```typescript
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;
}
```

See `backend-schemas.instructions.md` for the full DTO decorator reference, and `validation-chain.instructions.md` for how Prisma constraints flow into DTO decorators and Angular `Validators`.

## Response envelope (always)

```typescript
{ isSuccessful: boolean; message?: string; data?: T; dateTimeStamp?: Date }
```

Never embed the entity at the root (`{ isSuccessful, user: {...} }` is wrong) — always `data`. See `api-response.instructions.md`.

## Security rules

Azure MSAL Bearer token validation via `AzureAuthGuard` — never custom JWT. Rate limiting via `@nestjs/throttler` with tiers from `rate-limit.config.ts`. All inputs validated via `class-validator` + global `ValidationPipe` — never manual parsing. CORS configured for frontend origins only. Helmet applied at bootstrap in `main.ts`. Never allow auth to be bypassed via query params, headers, or terminal flags. All secrets in environment variables.

## Enterprise scale

Stateless — no in-memory sessions, all state in MySQL/Redis. Horizontally scalable — every service works with N replicas. Cache-aside reads — Redis checked before MySQL on read-heavy methods, cache populated on miss, invalidated on write. Queue-backed writes — heavy I/O (email, PDF, webhooks, image processing) dispatched to BullMQ, never in request handlers. Connection pooling via `DATABASE_CONNECTION_LIMIT` env var (default 10).

Required health endpoints, via `HealthModule`:

```typescript
@Controller('health')
export class HealthController {
  @Get()
  public liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  public async readiness() {
    // check DB + Redis connectivity
    return { status: 'ready' };
  }
}
```

Graceful shutdown is handled by NestJS automatically via `OnApplicationShutdown` — implement it on `DatabaseModule`/`CacheModule` to close connections cleanly; do not add a manual `process.on('SIGTERM', ...)` handler.

Rate limiting tiers (`@nestjs/throttler`):

```typescript
export const RateLimitConfig = {
  global: { ttl: 60_000, limit: 200 },
  auth: { ttl: 60_000, limit: 10 },
  sensitiveEndpoints: { ttl: 60_000, limit: 5 },
  adminOperations: { ttl: 60_000, limit: 100 },
};
```

Apply `@Throttle(RateLimitConfig.auth)` on sensitive endpoints.

Cursor pagination for customer-facing lists:

```typescript
public async findAllCursor(cursor: string | undefined, take: number): Promise<CursorResponseDto<IEntity>> {
  const cursorOption = cursor ? { cursor: { id: cursor }, skip: 1 } : {};
  const items = await this.prisma.entity.findMany({
    where: { isActive: true },
    ...cursorOption,
    take: take + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const hasMore = items.length > take;
  const results = hasMore ? items.slice(0, take) : items;
  return { isSuccessful: true, data: results, nextCursor: hasMore ? results[results.length - 1].id : undefined, hasMore };
}
```

POST endpoints creating resources accept an optional idempotency key. Propagate `x-correlation-id` through downstream calls for distributed tracing (see `request-logging.instructions.md`).

## Testing

Jest config per service with `tests/setup.ts`. Unit tests mock all dependencies; integration tests use a real test database and `@nestjs/testing`. `pnpm test` per service or root-level, `pnpm test:coverage` for coverage. See `testing.md`.

## Starting services

```bash
pnpm --filter @project-olympus/api-gateway dev
pnpm --filter @project-olympus/customer-api dev
pnpm --filter @project-olympus/admin-api dev
pnpm --filter @project-olympus/schedule-api dev
```
