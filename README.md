# project-olympus-mono-repo

<p align="left">
  <img
    src="https://res.cloudinary.com/dcamhhp29/image/upload/v1780557049/project_olympus_mono_repo_pc6dsp.png"
    alt="Project Olympus Mono Repo"
    width="250"
  />
</p>

A production-ready NestJS monorepo for building scalable TypeScript applications. Provides a complete Nest.js backend, Angular web frontends, Ionic mobile app, Directus CMS, and shared common packages — all orchestrated by Turborepo and pnpm workspaces.

## Stack

| Layer | Technology |
| --- | --- |
| Backend | NestJS 10, class-validator, Prisma |
| Database | MySQL 8.0 (multi-schema) |
| Auth | Azure MSAL (Bearer token validation) |
| Logging | Azure Monitor (Application Insights) |
| Admin frontend | Angular 19 (standalone, Signals) |
| Customer frontend | Angular 19 (standalone, Signals) |
| Mobile | Ionic + Capacitor (React) |
| CMS | Directus (Docker) |
| Cache | Redis (ioredis) |
| Queue | BullMQ (Redis) |
| Automation | n8n |
| Build | Turborepo + pnpm workspaces |

<p align="left">
  <img src="https://img.shields.io/badge/NestJS-10-red" />
  <img src="https://img.shields.io/badge/Angular-19-red" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue" />
  <img src="https://img.shields.io/badge/Turborepo-Latest-black" />
  <img src="https://img.shields.io/badge/pnpm-9-orange" />
</p>

## Structure

```text
project-olympus/
├── apps/
│   ├── backend/
│   │   ├── admin-api/          # NestJS admin service (port 4001)
│   │   ├── api-gateway/        # NestJS gateway (port 4000)
│   │   ├── customer-api/       # NestJS customer service (port 4002)
│   │   └── schedule-api/       # NestJS schedule service (port 4003)
│   ├── frontend/
│   │   ├── admin-web/          # Angular admin dashboard (port 4200)
│   │   └── customer-web/       # Angular customer portal (port 5173)
│   ├── mobile/
│   │   └── customer-mobile/    # Ionic + Capacitor mobile app
│   ├── cms/                    # Directus CMS (Docker, port 8055)
│   └── automation/
│       └── n8n/                # Workflow automation
├── common/
│   ├── auth/                   # Azure MSAL validator + NestJS guard
│   ├── cache/                  # Redis (ioredis)
│   ├── config/                 # Env validation (class-validator)
│   ├── database/               # Prisma + MySQL multi-schema
│   ├── email/                  # Mailgun + MailHog (dev)
│   ├── external-apis/          # Shared external HTTP client modules
│   ├── export/                 # PDF / Excel export
│   ├── logging/                # AzureMonitorLogger (NestJS LoggerService)
│   ├── metrics/                # Prometheus metrics
│   ├── queue/                  # BullMQ
│   ├── sms/                    # SMS service
│   ├── storage/                # Azure Blob + S3
│   ├── types/                  # Shared TypeScript types
│   └── utilities/              # Shared utilities
├── dev-ops/
│   ├── docker/                 # Dockerfiles per service
│   ├── docker-compose.dev.yml  # Local dev stack
│   ├── mysql-init/             # Database init SQL
│   └── k8s/                    # Kubernetes manifests
├── infrastructure/
│   ├── nginx/                  # Nginx config
│   └── terraform/              # IaC
└── documentation/
```
## Architecture

```mermaid
flowchart TD

    A[Angular Admin]
    B[Angular Customer]
    C[Ionic Mobile]

    A --> D[API Gateway]
    B --> D
    C --> D

    D --> E[Admin API]
    D --> F[Customer API]
    D --> G[Schedule API]

    E --> H[(MySQL)]
    F --> I[(MySQL)]
    G --> J[(MySQL)]

    E --> K[(Redis)]
    F --> K
    G --> K

    L[Directus CMS] --> D
    M[n8n Automation] --> D
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Docker and Docker Compose

### Installation

```bash
# Install all dependencies
pnpm install

# Start local infrastructure (MySQL, Redis, Directus, MailHog, Adminer)
docker compose -f dev-ops/docker-compose.dev.yml up -d

# Copy and fill environment variables
cp .env.example .env
# Fill in AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_API_AUDIENCE for each service

# Generate Prisma clients (after filling DATABASE_URL_* vars)
pnpm --filter @project-olympus/database prisma:generate
```

### Running services

```bash
pnpm dev:gateway          # API Gateway   — port 4000
pnpm dev:admin-api        # Admin API     — port 4001
pnpm dev:customer-api     # Customer API  — port 4002
pnpm dev:schedule-api     # Schedule API  — port 4003
pnpm dev:admin-web        # Admin Web     — port 4200
pnpm dev:customer-web     # Customer Web  — port 5173
pnpm dev:cms              # Directus CMS  — port 8055 (Docker)
```

### Scripts

| Script | Description |
| --- | --- |
| `pnpm build` | Build all packages via Turborepo |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | ESLint across workspace |
| `pnpm format` | Prettier across workspace |
| `pnpm typecheck` | TypeScript check across workspace |
| `pnpm debug:admin-api` | Build + start admin-api |
| `pnpm debug:customer-api` | Build + start customer-api |
| `pnpm debug:api-gateway` | Build + start api-gateway |
| `pnpm debug:schedule-api` | Build + start schedule-api |

## Environment Variables

Copy `.env.example` to `.env` in each service directory. Key variables:

```env
# Azure MSAL (required for auth)
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_API_AUDIENCE=
AZURE_AUTHORITY=https://login.microsoftonline.com/<tenant-id>

# Azure Monitor (optional in dev)
APPLICATIONINSIGHTS_CONNECTION_STRING=

# MySQL (multi-database)
DATABASE_URL_ADMIN=mysql://appuser:apppassword@localhost:3306/app_admin
DATABASE_URL_CUSTOMER=mysql://appuser:apppassword@localhost:3306/app_customer
DATABASE_URL_SCHEDULE=mysql://appuser:apppassword@localhost:3306/app_schedule
DATABASE_URL_SHARED=mysql://appuser:apppassword@localhost:3306/app_shared

# Redis
REDIS_URL=redis://localhost:6379

# Mailgun (production) / MailHog used automatically in development
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
```

See `.env.example` at the repo root for the full reference.

## Database

Each backend service has its own MySQL database. Prisma schemas live in `common/database/prisma/`.

```bash
# Generate all Prisma clients
pnpm --filter @project-olympus/database prisma:generate

# Run migrations (do not run via Claude — run manually)
pnpm --filter @project-olympus/database prisma:migrate:admin
pnpm --filter @project-olympus/database prisma:migrate:customer
pnpm --filter @project-olympus/database prisma:migrate:schedule
pnpm --filter @project-olympus/database prisma:migrate:shared

# Open Prisma Studio
pnpm --filter @project-olympus/database prisma:studio:admin
```

## Testing

```bash
pnpm test                                              # All packages
pnpm test:coverage                                     # With coverage
pnpm --filter @project-olympus/admin-api test  # Single service
```

## Docker

```bash
# Development stack (MySQL, Redis, Directus, MailHog, Adminer, redis-commander)
docker compose -f dev-ops/docker-compose.dev.yml up -d

# Production stack
docker compose -f dev-ops/docker-compose.yml up -d
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Scopes — Backend: `api-gateway`, `customer-api`, `admin-api`, `schedule-api`
Scopes — Frontend: `admin-web`, `customer-web`, `customer-mobile`
Scopes — Common: `database`, `auth`, `cache`, `config`, `email`, `logging`, `types`, `utilities`

## Changesets

```bash
pnpm changeset          # Create a changeset
pnpm changeset:version  # Bump versions
pnpm changeset:publish  # Build and publish
```

## Project Name Substitution

When forking, replace `project-olympus` with your project slug across:

- All `common/*/package.json` name fields
- All `apps/backend/*/package.json` name fields
- All import paths
- `pnpm-workspace.yaml`
- `CLAUDE.md`
geset: `pnpm changeset`
5. Commit using conventional commit format
6. Open a Pull Request

### Pre-commit Hooks

Husky runs the following checks before each commit:
- **Lint-staged**: ESLint and Prettier on staged files
- **Commitlint**: Validates commit message format
- **Type check**: TypeScript compilation check

## Roadmap

- [ ] OpenTelemetry support for Azure
- [ ] RabbitMQ transport layer
- [ ] GraphQL Gateway
- [ ] Event Sourcing module
- [ ] Peach Payments integration package
- [ ] Keycloak authentication option
- [ ] Azure deployment template
- [ ] GitHub Actions CI/CD pipelines
- [ ] Helm charts

## 📄 License

See LICENSE file for details.
