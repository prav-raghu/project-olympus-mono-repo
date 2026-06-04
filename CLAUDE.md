# project-olympus

## Read these files first — always

Before writing any code, creating any file, or running any command:

1. `.github/agents/full-stack-orchestrator.agent.md`
2. `.github/agents/backend-service.agent.md`
3. `.github/agents/api-builder.agent.md`
4. `.github/instructions/backend-services.instructions.md`
5. `.github/instructions/enterprise-scale.instructions.md`
6. `.github/instructions/prisma-schema.instructions.md`
7. `.github/instructions/api-response.instructions.md`
8. `.github/instructions/rbac.instructions.md`

For domain-specific work, also read the relevant agent:

- **Testing**: `.github/agents/testing.agent.md` + `.github/instructions/testing.instructions.md`
- **RBAC / Permissions**: `.github/agents/rbac.agent.md`
- **Mobile**: `.github/agents/mobile.agent.md` + `.github/instructions/mobile.instructions.md`
- **Angular frontend**: `.github/agents/frontend-angular.agent.md`
- **Mobile (Ionic Angular)**: `.github/agents/mobile.agent.md`
- **Webhooks / Events**: `.github/agents/webhook-events.agent.md` + `.github/instructions/webhook-events.instructions.md`
- **Feature Flags**: `.github/agents/feature-flags.agent.md` + `.github/instructions/feature-flags.instructions.md`
- **External APIs**: `.github/agents/external-api.agent.md`
- **Audit Logging**: `.github/instructions/audit-log.instructions.md`
- **Request / Response Logging**: `.github/instructions/request-logging.instructions.md`
- **Database Migrations**: `.github/instructions/database-migrations.instructions.md`
- **OpenAPI / Swagger**: `.github/instructions/openapi.instructions.md`

## Non-negotiable rules

- NestJS (latest) — no Fastify, no Express
- `class-validator` + `class-transformer` for backend validation — never Zod, never AJV
- TypeScript strict — no `any`, no `as unknown as T`
- DTOs are classes with decorators — never plain interfaces
- MSAL for all auth — no custom JWT, no bcrypt user-password auth
- MySQL only — no PostgreSQL
- Azure Monitor for all logging — no Pino, no `console.log` in production
- Angular (latest) for all web frontends — no React, no Next.js on web
- React used only in the Ionic mobile app (`apps/mobile/`)
- No comments in code (inline `// [comment text]` allowed where non-obvious)
- No hardcoded secrets
- Folder structure is immutable — do not create new top-level folders
- `common/` for all shared packages — not `packages/` or `libs/`
- All packages scoped as `@project-olympus/[name]`
- All interfaces, models, DTOs, constants must each be in their own files
- Keep functions (not arrow function conversions at the class level)
- Do not run database migrations — leave for the user
- Do not run Git operations — leave for the user
- Use `#region` / `#endregion` for logical code grouping in TypeScript

## Folder structure (immutable)

```text
apps/backend/       ← NestJS services (admin-api, customer-api, schedule-api, api-gateway)
apps/frontend/      ← Angular (admin-web and customer-web)
apps/mobile/        ← Ionic + Capacitor (React — mobile only)
apps/cms/           ← Directus (Docker-based)
apps/automation/    ← n8n
common/             ← shared packages only
dev-ops/            ← Docker, K8s
infrastructure/     ← Nginx, Terraform
documentation/      ← markdown docs
.github/            ← CI, agents, prompts, instructions
```

## Common packages

| Package | Purpose |
| --- | --- |
| `@project-olympus/auth` | Azure MSAL token validator + NestJS base guard |
| `@project-olympus/cache` | ioredis (unchanged) |
| `@project-olympus/config` | Env validation with class-validator + EnvConfig |
| `@project-olympus/database` | Prisma + MySQL multi-schema + DatabaseModule |
| `@project-olympus/email` | Mailgun (Mailhog SMTP in dev) |
| `@project-olympus/external-apis` | forRootAsync NestJS HTTP client modules |
| `@project-olympus/logging` | AzureMonitorLogger (NestJS LoggerService) |
| `@project-olympus/metrics` | Prometheus metrics (NestJS interceptor pattern) |
| `@project-olympus/queue` | BullMQ (unchanged) |
| `@project-olympus/sms` | SMS (unchanged) |
| `@project-olympus/storage` | Azure Blob + S3 (unchanged) |
| `@project-olympus/types` | Shared types + AzureAuthenticatedUser |
| `@project-olympus/utilities` | Utilities (unchanged) |

## Package manager

pnpm — always use `pnpm`, never `npm` or `yarn`

Internal deps: `workspace:*`

## Using this as a template — project name substitution

When forking this repo for a new project, replace all occurrences of `project-olympus` with your project's name.

| Find | Replace with | Where it appears |
| --- | --- | --- |
| `project-olympus` | your-project-slug (lowercase, hyphenated) | Terraform `variables.tf`, `tfvars.example`, GCP/ECR examples |
| `@project-olympus/` | `@your-scope/` | All `package.json` `name` fields in `common/` and `apps/backend/`; all import paths; `pnpm-workspace.yaml` |

After substitution:

- Fill in all `infrastructure/terraform/*/environments/*.tfvars`
- Fill in all `apps/backend/*/.env` and `apps/frontend/**/src/environments/environment.ts`
- Fill in Azure AD app registration client IDs and tenant ID
- Remove or replace this section in `CLAUDE.md` with project-specific notes
