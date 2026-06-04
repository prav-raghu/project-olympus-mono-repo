# Node.js Monorepo Template - AI Coding Agent Instructions

## Architecture Overview

This is a production-ready **pnpm monorepo** template with TypeScript across the entire stack. The architecture follows a microservices pattern with NestJS backends. When asked to setup please follow these guidelines:

- install dependencies using `pnpm install`
- rename the @mono-repo-template scope to the appropriate project scope for apporiate referencing
- ensure all dependencies are up to date and compatible with the latest stable versions of Node.js and TypeScript.
- maintain the existing folder structure for scalability and organization.
- ensure that all services are properly configured to communicate with each other as needed.
- set up environment variables and configuration files as per the project's requirements.

## Workspace Structure

```
apps/backend/          # NestJS microservices
apps/frontend/         # Angular web apps
apps/mobile/           # Ionic Angular + Capacitor app (optional)
common/                # Shared libraries (@project-olympus/*)
├── database/          # Prisma schema & migrations
├── types/             # Shared TypeScript types
├── config/            # Environment config utilities
├── logging/           # Logging utilities (Azure Monitor)
├── cache/             # Caching service (Redis)
├── email/             # Email service
└── utilities/         # Helper functions
```

## Environment Variables
- Infer the appropriate environment variables from tech used and any keys, api keys, secrets tokens are to be managed via environment variables and not hard coded in the codebase add them to .env and .env.example files accordingly.

## Package Naming

- All packages use a consistent scope: `@project-olympus/`
- Workspace protocol references: `workspace:*`
- Package names use kebab-case: `@project-olympus/customer-api`, `@project-olympus/database`

## TypeScript Rules

### Never Use 'any'

- **Prohibited**: Never use `any` type in any codebase
- **Instead use**:
  - `unknown` for truly unknown types (with type guards)
  - Generic types `<T>` for flexible but typed code
  - Union types `string | number` for multiple possibilities
  - `Record<string, unknown>` for object maps
  - Custom interfaces or types for complex structures

### Type Safety Examples

**❌ Wrong:**
```typescript
function processData(data: any): any {
  return data.value;
}
```

**✅ Correct:**
```typescript
interface DataPayload {
  value: string;
  timestamp: number;
}

function processData(data: DataPayload): string {
  return data.value;
}

// Or with generics
function processData<T extends { value: string }>(data: T): string {
  return data.value;
}
```
### Unknown vs Any

When type is truly unknown, use `unknown` with type guards:

```typescript
function parseJson(jsonString: string): unknown {
  return JSON.parse(jsonString);
}

function processUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String(value);
  }
  throw new Error('Invalid type');
}
```
### Generic Types

Use generics for reusable, type-safe code:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

async function fetchUsers(): Promise<ApiResponse<UserResponse[]>> {
  // Implementation
}
```

## Backend Services

- **NestJS DI**: All services/guards/interceptors decorated with `@Injectable()`, injected via constructor
- **Standalone modules**: Each domain has its own NestJS module (`@Module`)
- **Class-based DTOs**: DTOs are classes with `class-validator` decorators — never plain interfaces
- **Azure MSAL auth**: `AzureAuthGuard` extends base from `@project-olympus/auth`
- **Global pipes/filters/interceptors** registered in `main.ts`

### Key Backend Service Boundaries

- **api-gateway** (port 4000): Public entry point, MSAL auth, proxies to services
- **customer-api** (port 4002): Customer-facing business logic
- **admin-api** (port 4001): Administrative operations
- **schedule-api** (port 4003): Scheduling, appointments, background jobs

### Backend Structure for Each Service
Every backend service should follow this consistent structure:

```
apps/backend/[service-name]/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   ├── env.config.ts
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

### Service Architecture

- **NestJS DI**: All services injected via constructor — never instantiated directly
- **Standalone modules**: Core functionality (Prisma, caching, authentication) registered as NestJS modules
- **Class-based DTOs**: DTOs use `class-validator` + `class-transformer` decorators
- **MSAL auth**: Azure MSAL Bearer token validation via `AzureAuthGuard`

### NestJS Coding Conventions

- **Code style**: `camelCase` for variables, functions, methods, properties
- **Controller files**: `kebab-case` (e.g., `user-profile.controller.ts`)
- **Directory names**: `kebab-case` (e.g., `modules/`, `dto/`, `interfaces/`)
- **Class names**: `PascalCase` (e.g., `UserController`, `AuthService`)
- **DTO names**: `PascalCase` with `Dto` suffix (e.g., `CreateUserDto`, `UpdateUserDto`)
- **Type names**: `PascalCase` (e.g., `UserId`, `ApiResponse`)
- **Enum names**: `PascalCase` with UPPER_CASE values

### Validation Strategy

- **Backend Validation**: Use **class-validator** + **class-transformer** for all DTO validation
- **DTOs**: Always classes with decorators — never plain interfaces or AJV schemas
- **Frontend Validation**: Angular apps use reactive forms with validators
- **Never use Zod or AJV on backend**: `class-validator` exclusively

### DTO Classes (Backend)

All DTOs must be TypeScript classes with `class-validator` decorators:

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string = '';

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;
}
```

### Controller Pattern

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
  public async findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.usersService.findAll(Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get user by ID' })
  public async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create user' })
  public async create(@Body() dto: CreateUserDto, @CurrentUser() user: AzureUser) {
    return this.usersService.create(dto, user.id);
  }

  @Put(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update user' })
  public async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AzureUser) {
    return this.usersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete user' })
  public async remove(@Param('id') id: string, @CurrentUser() user: AzureUser) {
    return this.usersService.softDelete(id, user.id);
  }
}
```

### Security & Rate Limiting

- **Azure MSAL**: Bearer token validation via `AzureAuthGuard` — never custom JWT
- **Rate limiting**: `@nestjs/throttler` with tiers from `rate-limit.config.ts`
- **Input validation**: All inputs validated via `class-validator` — never manual parsing
- **CORS**: Configured for frontend origins only
- **Helmet**: Applied at bootstrap in `main.ts`
- **Bearer token handling**: Always extracted and validated via `AzureAuthGuard`, never bypassed

### Database & State Management

- **MySQL** with **Prisma ORM** (schemas in `common/database/prisma/`)
- Multi-schema database with clear domain boundaries per service
- Redis for caching (ioredis via `@project-olympus/cache`)
- BullMQ for async job queues via `@project-olympus/queue`

### Naming Conventions for Database Schema

- **Table names**: `snake_case` via `@@map` (e.g., `users`, `appointment_slots`)
- **Column names**: `snake_case` via `@map` (e.g., `user_id`, `created_at`)
- **Relations**: Use Prisma's `@relation` with clear field names

```prisma
model User {
  id        String   @id @db.VarChar(36)
  email     String   @unique
  createdAt DateTime @db.DateTime(0)
  updatedAt DateTime @db.DateTime(0)

  @@map("users")
}
```

### Prisma Commands

```bash
pnpm --filter @project-olympus/database prisma:generate   # Generate client after schema changes
pnpm --filter @project-olympus/database prisma:studio     # Open database browser
```

## Class-Based Implementation with Access Modifiers

**ALWAYS use class-based architecture with proper TypeScript access modifiers** where applicable:

- **Controllers**: Must be classes with `public` methods for route handlers and `private` helper methods
- **Services**: Must be classes with `public` methods for business logic and `private` internal methods
- **Guards/Interceptors**: Must extend NestJS base classes with `public` lifecycle methods
- **Access Modifiers**:
  - `public`: For methods/properties that are part of the class's public API
  - `private`: For internal methods/properties that should not be accessed outside the class
  - `readonly`: For properties that should not be reassigned after initialization
  - Constructor parameters with access modifiers (e.g., `private readonly`) for dependency injection

**✅ Correct Class-Based Pattern:**

```typescript
// modules/users/users.service.ts
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

  public async create(dto: CreateUserDto, userId: string): Promise<ResponseDto<unknown>> {
    const item = await this.prisma.user.create({
      data: { id: crypto.randomUUID(), ...dto, createdBy: userId, modifiedBy: userId },
    });
    return { isSuccessful: true, data: item };
  }

  public async findById(id: string): Promise<ResponseDto<unknown>> {
    const item = await this.prisma.user.findUnique({ where: { id, isActive: true } });
    if (!item) return { isSuccessful: false, message: 'Not found' };
    return { isSuccessful: true, data: item };
  }
}
```

**❌ Wrong: Avoid plain functions for business logic:**

```typescript
// ❌ DON'T DO THIS
export async function createUser(dto: CreateUserDto): Promise<User> {
  // No proper encapsulation, hard to test, no dependency management
}
```

**When to use functions vs classes:**

- **Use Classes**: Controllers, Services, Guards, Interceptors, Filters, Factories with state
- **Use Functions**: Pure utility functions, formatters, validators, type guards without state

```typescript
// ✅ Utility functions are fine (stateless, pure functions)
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Testing

- Jest configuration in each service with `tests/setup.ts`
- Run tests: `pnpm test` (individual services) or root-level `pnpm test`
- Unit tests mock all dependencies using `jest.fn()`
- Integration tests use a real test database
- Coverage: `pnpm test:coverage`

### Critical Integration Points

- **Database schema**: All entities in Prisma schema with clear service boundaries per schema file
- **API Gateway routing**: Proxy configuration determines service routing
- **Shared logging**: Azure Monitor via `@project-olympus/logging`
- **Docker orchestration**: Services depend on MySQL, api-gateway depends on backend services

### Starting Services

```bash
pnpm --filter @project-olympus/api-gateway dev
pnpm --filter @project-olympus/customer-api dev
pnpm --filter @project-olympus/admin-api dev
pnpm --filter @project-olympus/schedule-api dev
```

## Frontend

### Admin Web App Using Angular (latest)
Admin dashboards and internal tools use Angular with Angular Signals for state management.

### Customer Web App Using Angular (latest)
Customer-facing web uses Angular with proper SEO via `Title` and `Meta` services.

### Frontend Coding Conventions
- **Components**: `PascalCase` (e.g., `UserProfileComponent`, `LoginFormComponent`)
- **Services**: `camelCase` with `Service` suffix (e.g., `userService`, `authService`)
- **Utilities**: `camelCase` (e.g., `formatDate.ts`, `apiClient.ts`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`, `MAX_FILE_SIZE`)
- **Directories**: `kebab-case` (e.g., `components/`, `services/`, `utils/`)
- **Follow Angular best practices**: Standalone components, Signals, reactive forms

### Example Frontend Structure

```
apps/frontend/[app-name]/
├── src/
│   ├── app/
│   │   ├── features/
│   │   │   └── [feature]/
│   │   │       ├── [feature].component.ts
│   │   │       └── [feature].service.ts
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   ├── shared/
│   │   │   └── components/
│   │   ├── app.routes.ts
│   │   └── app.config.ts
│   └── environments/
│       └── environment.ts
├── package.json
├── tsconfig.json
└── angular.json
```

### Frontend Validation

Angular apps use reactive forms with built-in Angular validators. Never use Zod or AJV on the frontend.

### Security & Rate Limiting

- **Azure MSAL**: MSAL Angular for token acquisition — never custom JWT
- **Route guards**: `MsalGuard` on protected routes
- **HTTP interceptors**: MSAL interceptor adds Bearer tokens automatically

### Data Fetching Strategy

Use Angular `HttpClient` with services for all API calls. Implement loading/error/empty states in every component.

## Mobile (Ionic + Angular)

Mobile apps in `apps/mobile/` use Ionic + Capacitor + Angular standalone components.

## Common Packages Structure

```
common/[package-name]/
├── src/
│   ├── index.ts                    # Main exports
│   ├── services/                   # Service implementations
│   ├── interfaces/                 # TypeScript interfaces
│   ├── types/                      # Type definitions
│   └── utils/                      # Utility functions
├── tests/
├── tsconfig.json
├── package.json
└── README.md
```

## Environment & Deployment

- **Development**: Individual service startup via pnpm filters
- **Production**: Docker Compose with service dependencies
- **Configuration**: `.env` files per service, shared config utilities in `common/config`
- **Ports**: Gateway (4000), Admin API (4001), Customer API (4002), Schedule API (4003)

## Best Practices Summary

1. **Class-Based Architecture**: Use classes with proper access modifiers (`public`, `private`, `readonly`) for controllers, services, and guards
2. **Type Safety**: Never use `any` type; prefer explicit types, generics, or `unknown` with type guards
3. **Validation**: Backend uses `class-validator` exclusively; frontend uses Angular reactive forms
4. **DTOs**: Always use classes with decorators — never plain interfaces
5. **Naming Conventions**: Follow strict naming conventions for database, backend, and frontend
6. **File Structure**: Maintain consistent directory structure across all services
7. **Service Boundaries**: Respect service boundaries and database domain separation
8. **Authentication**: Azure MSAL only — no custom JWT, no bcrypt user-password auth
9. **Logging**: Azure Monitor via `@project-olympus/logging` — no `console.log` in production
10. **Database**: MySQL only via Prisma — no PostgreSQL

When working on this codebase, always consider:
- Class-based implementation with proper encapsulation using access modifiers
- Service boundaries and shared database implications
- Consistent naming conventions across all layers
- Type safety and validation at every layer
- File structure consistency for maintainability — do not alter folder structures and file naming conventions unless explicitly instructed
- Do not modify the copilot-instructions.md file itself
- Do not put sensitive information in the codebase — all secrets must be managed via environment variables
- Do not put comments in code
- If instructed to create a new service or frontend, use the above structures and conventions strictly and reference existing apps within the project workspace
- Always run prisma generate when making schema changes
- Work against SonarQube code quality — no errors or warnings in code
