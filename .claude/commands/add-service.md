---
description: "Add a complete new backend service to the monorepo with all boilerplate"
agent: "new-service-scaffold"
argument-hint: "Service name and purpose, e.g. 'notification-api for push notifications and email alerts'"
---

Scaffold a new backend service:

**Service:** {{ input }}

## Requirements

1. Create the full directory structure under `apps/backend/{service-name}/`
2. Copy and adapt patterns from `customer-api` for:
   - `main.ts` with NestJS bootstrap (Helmet, global `ValidationPipe`, versioning, Swagger gated to non-production)
   - `app.module.ts` root module
   - `config/env.config.ts` with `class-validator` env validation
   - Module registrations (`DatabaseModule`, `AuthModule`, `HealthModule`, `ThrottlerModule`)
   - Route structure with `@Version('1')` on all controllers
   - `jest.config.ts`, `tsconfig.json`, `tsconfig.build.json`, `package.json`
3. Assign the next available port (check existing: 4000, 4001, 4002, 4003)
4. Add to root `package.json` dev scripts
5. Add to `dev-ops/docker-compose.yml` and, if needed, `dev-ops/k8s/`
6. Add proxy route in `api-gateway`
7. Create `.env` and `.env.example`
8. Run `pnpm install`
