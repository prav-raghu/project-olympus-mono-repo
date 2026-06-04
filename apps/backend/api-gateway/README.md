# api-gateway

NestJS API gateway — the public entry point for all clients. Port 4000.

## Responsibilities

- Centralized MSAL auth validation
- Rate limiting (global throttler)
- Request logging via LoggingInterceptor
- Health and readiness probes
- Routes traffic to downstream services

## Stack

- NestJS 10
- Azure MSAL Bearer token validation
- Azure Monitor logging
- `@nestjs/throttler` rate limiting

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
│   └── health/
└── common/
    ├── filters/
    ├── interceptors/
    └── pipes/
tests/
├── unit/
│   └── services/
└── setup.ts
```

## Running

```bash
pnpm --filter @project-olympus/api-gateway dev
pnpm --filter @project-olympus/api-gateway test
```

## Environment

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:4200
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_API_AUDIENCE=
REDIS_URL=redis://localhost:6379
```

## Health endpoints

- `GET /health` — liveness probe, always returns `{ status: 'ok' }`
- `GET /health/ready` — readiness probe, returns `{ status: 'ready', timestamp }`

## Swagger

Available at <http://localhost:4000/api-docs> in non-production environments.
