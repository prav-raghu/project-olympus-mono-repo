# customer-api

NestJS backend service for customer-facing operations. Port 4002.

## Responsibilities

- Customer profile management
- Customer-accessible data endpoints
- Webhook subscriptions and delivery
- MSAL-authenticated endpoints

## Stack

- NestJS 10 with class-validator DTOs
- Prisma + MySQL (`app_customer` database)
- Azure MSAL Bearer token validation
- Azure Monitor logging
- BullMQ for async operations

## Structure

```text
src/
├── app.module.ts
├── main.ts
├── config/
│   ├── env.config.ts
│   └── rate-limit.config.ts
├── modules/
│   ├── auth/
│   ├── health/
│   └── users/
└── common/
    ├── filters/
    ├── interceptors/
    └── pipes/
tests/
├── unit/
│   ├── controllers/
│   └── services/
└── mocks/
```

## Running

```bash
pnpm --filter @project-olympus/customer-api dev
pnpm --filter @project-olympus/customer-api test
```

## Environment

```env
NODE_ENV=development
PORT=4002
CORS_ORIGIN=http://localhost:5173
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_API_AUDIENCE=
DATABASE_URL_CUSTOMER=mysql://appuser:apppassword@localhost:3306/app_customer
DATABASE_URL_SHARED=mysql://appuser:apppassword@localhost:3306/app_shared
REDIS_URL=redis://localhost:6379
```

## Swagger

Available at <http://localhost:4002/api-docs> in non-production environments.
