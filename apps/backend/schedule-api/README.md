# schedule-api

NestJS backend service for scheduling, jobs, and background processing. Port 4003.

## Responsibilities

- Scheduled job management
- Background task processing via BullMQ
- Calendar and availability logic
- MSAL-authenticated endpoints

## Stack

- NestJS 10 with class-validator DTOs
- Prisma + MySQL (`app_schedule` database)
- Azure MSAL Bearer token validation
- Azure Monitor logging
- BullMQ for background jobs

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
│   └── jobs/
└── common/
    ├── filters/
    ├── interceptors/
    └── pipes/
tests/
├── unit/
│   ├── controllers/
│   ├── services/
│   └── jobs/
└── mocks/
```

## Running

```bash
pnpm --filter @project-olympus/schedule-api dev
pnpm --filter @project-olympus/schedule-api test
```

## Environment

```env
NODE_ENV=development
PORT=4003
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_API_AUDIENCE=
DATABASE_URL_SCHEDULE=mysql://appuser:apppassword@localhost:3306/app_schedule
REDIS_URL=redis://localhost:6379
```

## Swagger

Available at <http://localhost:4003/api-docs> in non-production environments.
