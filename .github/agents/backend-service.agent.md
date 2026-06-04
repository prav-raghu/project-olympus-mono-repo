---
name: Backend Service Agent
description: >
  Use when working on any NestJS backend service including api-gateway, customer-api, admin-api,
  or schedule-api. Covers modules, controllers, services, DTOs, guards, interceptors, filters,
  authentication (Azure MSAL), rate limiting, health checks, error handling, and backend business
  logic. Also activates for adding new endpoints, refactoring existing services, or debugging
  backend issues.
tools:
  - read_file
  - write_file
  - run_terminal_command
  - grep_search
---

# Backend Service Agent

## Service Registry

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | 4000 | Public entry point, MSAL auth, proxies to services |
| `customer-api` | 4002 | Customer-facing business logic |
| `admin-api` | 4001 | Administrative operations |
| `schedule-api` | 4003 | Scheduling, appointments, background jobs |

## Directory Structure

Every backend service must follow this exact structure:

```
apps/backend/[service-name]/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   ├── env.config.ts           ← re-export from @project-olympus/config
│   │   └── rate-limit.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── azure-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── decorators/
│   │   │       ├── roles.decorator.ts
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

## Architecture Rules

- **NestJS DI** — all services/guards/interceptors decorated with `@Injectable()`, injected via constructor
- **Standalone modules** — each domain has its own NestJS module (`@Module`)
- **Class-based DTOs** — DTOs are classes with `class-validator` decorators, never plain interfaces
- **No AJV** — validation via `class-validator` + `class-transformer` + `ValidationPipe`
- **Azure MSAL auth** — `AzureAuthGuard` extends base from `@project-olympus/auth`
- **Global pipes/filters/interceptors** registered in `main.ts`

## Controller Pattern

```typescript
import { Controller, Get, Post, Body, Param, UseGuards, Version } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Create user' })
  public async create(@Body() dto: CreateUserDto, @CurrentUser() user: AzureUser) {
    return this.usersService.create(dto, user.id);
  }
}
```

## Service Pattern

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

## DTO Pattern (class-validator)

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

## Security Rules

- Azure MSAL Bearer token validation via `AzureAuthGuard` — never custom JWT
- Rate limiting via `@nestjs/throttler` with tiers from `rate-limit.config.ts`
- All inputs validated via `class-validator` — never manual parsing
- CORS configured for frontend origins only
- Helmet applied at bootstrap
- All secrets in environment variables — never hardcoded

## Enterprise Scale

- **Stateless**: No in-memory sessions — all state in MySQL/Redis
- **Cache-aside**: Read-heavy service methods check Redis before DB, cache on miss, invalidate on write
- **Queue-backed**: Heavy I/O (email, PDF, webhooks) dispatched to BullMQ — never in request handlers
- **Cursor pagination**: Customer-facing lists use `cursor + take`, never `skip + take`
- **Select fields**: List queries always use Prisma `select` to minimise payload
- **UUIDs at app layer**: Generate with `crypto.randomUUID()` — never DB-generated

## Required Health Endpoints

Every service MUST expose (via `HealthModule`):

- `GET /health` — liveness: always returns `{ status: 'ok' }`
- `GET /health/ready` — readiness: check DB + Redis connectivity

## Rate Limiting Tiers

```typescript
export const RateLimitConfig = {
  global: { ttl: 60_000, limit: 200 },
  auth: { ttl: 60_000, limit: 10 },
  sensitiveEndpoints: { ttl: 60_000, limit: 5 },
  adminOperations: { ttl: 60_000, limit: 100 },
};
```

Apply `@Throttle(RateLimitConfig.auth)` on sensitive endpoints.

## Starting Services

```bash
pnpm --filter @project-olympus/api-gateway dev
pnpm --filter @project-olympus/customer-api dev
pnpm --filter @project-olympus/admin-api dev
pnpm --filter @project-olympus/schedule-api dev
```
