# admin-api

NestJS backend service for administrative operations. Port 4001.

## Responsibilities

- User management
- Reporting and analytics
- Batch operations
- Role-based access control
- MSAL-authenticated endpoints

## Stack

- NestJS 10 with class-validator DTOs
- Prisma + MySQL (`app_admin` database)
- Azure MSAL Bearer token validation
- Azure Monitor logging
- BullMQ for async operations

## Structure

```text
src/
├── app.module.ts
├── main.ts
├── config/
│   ├── env.config.ts          # Re-exports from @project-olympus/config
│   └── rate-limit.config.ts   # Throttler tiers
├── modules/
│   ├── auth/                  # MSAL guard, roles guard, decorators
│   ├── health/                # Liveness + readiness
│   └── users/                 # User management (stub — extend here)
└── common/
    ├── filters/               # HttpExceptionFilter
    ├── interceptors/          # LoggingInterceptor, ResponseTransformInterceptor
    └── pipes/                 # ValidationPipe re-export
tests/
├── unit/
│   ├── controllers/
│   └── services/
└── mocks/
```

## Running

```bash
# Development
pnpm --filter @project-olympus/admin-api dev

# Production
pnpm --filter @project-olympus/admin-api build
pnpm --filter @project-olympus/admin-api start

# Tests
pnpm --filter @project-olympus/admin-api test
```

## Environment

Copy `.env.example` to `.env` and fill in:

```env
NODE_ENV=development
PORT=4001
CORS_ORIGIN=http://localhost:4200
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_API_AUDIENCE=
DATABASE_URL_ADMIN=mysql://appuser:apppassword@localhost:3306/app_admin
DATABASE_URL_SHARED=mysql://appuser:apppassword@localhost:3306/app_shared
REDIS_URL=redis://localhost:6379
```

## Swagger

Available at <http://localhost:4001/api-docs> in non-production environments.

## Adding a Domain Module

1. Create `src/modules/<domain>/` with module, controller, service, DTOs, and interface files
2. Use `class-validator` decorators on all DTO classes — never plain interfaces
3. Inject the Prisma client via `@Inject(ADMIN_DB) private readonly prisma: PrismaClient`
4. Import the module in `src/app.module.ts`
