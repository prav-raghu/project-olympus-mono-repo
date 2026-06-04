---
name: New Service Scaffold Agent
description: >
  Use when creating a brand new backend service, frontend app, or common package from scratch.
  Covers full scaffolding of NestJS backend services, Angular web apps, Ionic mobile apps,
  and common library packages. Includes pnpm workspace setup, package naming, environment variables,
  Docker configuration, port assignments, and dependency installation. Also use when bootstrapping
  a new monorepo project from the template.
tools:
  - read_file
  - write_file
  - run_terminal_command
---

# New Service Scaffold Agent

## Initial Setup Rules

```bash
pnpm install
```

- The project scope `@project-olympus` is a placeholder — when initializing a new project, run the `init-project` prompt to rename it everywhere
- The scope MUST be identical across every `package.json`, `tsconfig.json` path mapping, import statement, and code example in agent/instruction files
- Ensure all dependencies are latest stable versions compatible with current Node.js LTS and TypeScript
- Do not alter the existing folder structure
- Set up `.env` and `.env.example` for every service — infer required variables from the tech used
- Never hardcode secrets, API keys, or tokens

## Monorepo Structure

```
apps/backend/
apps/frontend/
apps/mobile/               # Ionic Angular + Capacitor (optional)
common/
├── database/              # Prisma schema & migrations
├── types/                 # Shared TypeScript types
├── config/                # Environment config utilities
├── logging/               # Azure Monitor logging
├── cache/                 # Redis caching service
├── email/                 # Email service
└── utilities/             # Helper functions
```

## Package Naming

- Scope: `@{project-scope}/` for ALL packages — both apps and common packages
- The project scope is defined in `package.json` root `name` field and set during `init-project`
- Format: `kebab-case` — e.g., `@project-olympus/customer-api`, `@project-olympus/database`
- Workspace references: `workspace:*`
- NEVER use `@app/` or `@common/` — every package in the monorepo uses the same single scope

## Port Assignments

| Service | Port |
|---|---|
| api-gateway | 4000 |
| admin-api | 4001 |
| customer-api | 4002 |
| schedule-api | 4003 |

## Scaffolding a New Backend Service

1. Copy the structure from an existing service (e.g., `customer-api`)
2. Update `package.json` with new name and scope
3. Update `src/config/env.config.ts` with correct port and service name
4. Register new service in root `docker-compose.yml`
5. Add proxy route in `api-gateway`
6. Create `.env` and `.env.example`
7. Run `pnpm install` from root

### New Backend Service Checklist

- [ ] `main.ts` — NestJS bootstrap with Helmet, ValidationPipe, versioning, Swagger
- [ ] `app.module.ts` — root module wiring all domain modules
- [ ] `config/env.config.ts` — env validation with `class-validator`
- [ ] `config/rate-limit.config.ts` — throttler tiers
- [ ] `modules/health/` — liveness and readiness endpoints
- [ ] `modules/auth/` — `AzureAuthGuard`, `CurrentUser` decorator
- [ ] At least one domain module stub (`modules/[domain]/`)
- [ ] `common/filters/http-exception.filter.ts`
- [ ] `common/interceptors/logging.interceptor.ts`
- [ ] `tests/setup.ts` with Jest config
- [ ] `tsconfig.json` and `tsconfig.build.json` extending root config
- [ ] `package.json` with correct scope and workspace deps
- [ ] `.env` and `.env.example`

## Scaffolding a New Angular Frontend App

1. Use Angular CLI to generate with TypeScript
2. Set up MSAL Angular for authentication
3. Configure `HttpClient` with MSAL interceptor
4. Set up Angular Router with `MsalGuard` on protected routes
5. Add admin layout (sidenav + topnav + content area) if admin app
6. Use Angular Signals for component state — no RxJS BehaviorSubject stores

### New Angular App Checklist

- [ ] `app.config.ts` — MSAL provider, HttpClient, Router
- [ ] `app.routes.ts` — routes with `loadComponent` + `MsalGuard`
- [ ] `src/environments/environment.ts` with API base URL and MSAL config
- [ ] `core/interceptors/` — HTTP error interceptor
- [ ] `core/guards/` — auth guard
- [ ] `shared/components/` — loading, error, empty state components
- [ ] `.env` / `environment.ts` with `apiBaseUrl`

## Scaffolding a New Common Package

```
common/[package-name]/
├── src/
│   ├── index.ts
│   ├── services/
│   ├── interfaces/
│   ├── types/
│   └── utils/
├── tests/
├── tsconfig.json
├── package.json
└── README.md
```

- Export everything from `src/index.ts`
- Reference via `workspace:*` in consuming services

## Docker Compose

When adding a new backend service, add to `docker-compose.yml`:

```yaml
[service-name]:
  build:
    context: .
    dockerfile: apps/backend/[service-name]/Dockerfile
  ports:
    - "[PORT]:[PORT]"
  environment:
    - DATABASE_URL=${DATABASE_URL}
  depends_on:
    - mysql
    - api-gateway
```

## Environment Variables Template

```env
# Service
NODE_ENV=development
PORT=4002

# Database
DATABASE_URL=mysql://user:password@localhost:3306/dbname

# Azure MSAL
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id

# Redis
REDIS_URL=redis://localhost:6379

# Azure Monitor
APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

Always add to both `.env` (with real values, gitignored) and `.env.example` (with placeholder values, committed).

## After Scaffolding

```bash
pnpm install                                                    # Install all deps from root
pnpm --filter @{scope}/database prisma:generate                 # If schema changed
pnpm --filter @{scope}/[service-name] dev                       # Start new service
```

## Reference Existing Apps

When creating new services or frontends, always inspect existing apps in the workspace to maintain consistency in patterns, modules, and configuration before writing new code.
