# project-olympus

The Angular + NestJS counterpart to `node-mono-repo-template` — same monorepo philosophy (pnpm + Turborepo, `common/*` shared packages, Claude Code agents driving the build), different stack: NestJS instead of Fastify, Angular instead of React/Next.js, MySQL instead of PostgreSQL, Azure MSAL instead of custom JWT.

## Subagents (auto-invoked by description match)

| Subagent | Scope |
|---|---|
| `full-stack-orchestrator` | Builds spanning database + backend + frontend together |
| `backend-service` | General NestJS service work (modules, controllers, guards, interceptors) |
| `api-builder` | Generating full CRUD layers from an existing Prisma model |
| `domain-modeler` | Designing new Prisma models from business requirements |
| `relational-database` | Prisma operations — migrations, seeding, naming, MySQL issues |
| `database-migrations` | Zero-downtime migration patterns, backfills, K8s Job execution, CI checklist |
| `audit-log` | Audit trail pattern for state-changing operations |
| `enterprise-scale` | Cross-cutting 1M+ concurrent user patterns — cache, queue, pagination |
| `frontend-angular` | Both admin-web and customer-web (Angular standalone components) |
| `frontend-page-builder` | Generating full page/component/service layers for a domain |
| `mobile` | Ionic Angular + Capacitor customer-mobile app |
| `common-packages` | Shared `common/*` packages (database, cache, config, logging, etc.) |
| `new-service-scaffold` | Scaffolding a brand new service, app, or package |
| `rbac` | Permissions, guards, role-to-permission mapping |
| `webhook-events` | Outbound webhooks and the internal event bus |
| `feature-flags` | DB-backed feature flag store and evaluation |
| `external-api` | New `common/external-apis/` integrations (forRootAsync pattern) |
| `infrastructure` | Terraform (Azure only), Kubernetes, Docker Compose, NGINX |
| `testing` | Unit/integration tests, Jest config, factories |
| `typescript-standards` | Type-safety review outside a full code review |
| `code-review` | Full quality/security audit |

For anything not covered by a subagent above, read the relevant file in `.claude/instructions/` before writing code.

## Path-gated rules (automatic)

Files under `.claude/rules/` load automatically when a matching file enters context — no manual reading required:

| Rule | Loads for |
|---|---|
| `backend.md` | `apps/backend/**/*.ts` |
| `frontend.md` | `apps/frontend/**/*.ts`, `**/*.html` |
| `mobile.md` | `apps/mobile/**/*.ts`, `**/*.html` |
| `prisma.md` | `common/database/prisma/**`, `common/database/src/**` |
| `docker.md` | `apps/backend/*/Dockerfile`, `apps/frontend/*/Dockerfile`, `dev-ops/docker-compose*.yml`, `dev-ops/k8s/**` |
| `testing.md` | `**/*.test.ts`, `**/*.spec.ts`, `**/tests/**/*.ts` |

## Deployment — Azure only

This project provisions and deploys to **Azure exclusively** (Container Apps/AKS, Azure Database for MySQL Flexible Server, Azure Cache for Redis, Azure Blob Storage, Application Insights) — see `infrastructure.md`. No other cloud provider is used.

`dev-ops/docker-compose.yml`, per-service `Dockerfile`s (now under `apps/backend/*/Dockerfile`, not `dev-ops/docker/`), `dev-ops/k8s/*.yaml`, and `infrastructure/terraform/azure/*` have been reconciled to the MySQL + Azure MSAL + multi-schema `DATABASE_URL_*` + ports 4000–4004 target state described in `infrastructure.md` and `rules/docker.md`. Remaining known gaps: `infrastructure/terraform/azure/environments/staging.tfvars` and `prod.tfvars` (only `dev.tfvars` was reconciled) and `infrastructure/terraform/azure/terraform.tfvars.example` still reference the old `khula*`/Postgres-era naming; the `key-vault` module has a pre-existing `sensitive` value used in a `for_each` (Terraform-invalid, blocks `validate` regardless of secret content); `static-site` module's `outputs.tf` references a CDN attribute not in the pinned `azurerm` provider version.

## Skills (invoke with /name or auto-invoked by description match)

| Skill | When to use |
|---|---|
| `/ui-ux-pro-max` | Before building any frontend page or component — design system lookup, color, typography, UX patterns |
| `/build-page` | Build a complete Angular page end-to-end with design intelligence baked in |
| `/security-review` | Audit code for auth gaps, injection risks, and secrets before merge |
| `/code-review-skill` | Full quality review: types, naming, security, form validation coverage |

## Commands (legacy, still work)

`/add-endpoint`, `/add-entity`, `/add-service`, `/add-pages`, `/add-tests`, `/design-database`, `/review`, `/build-system`, `/provision-infrastructure`, `/init-project`, `/sync-from-template`

## UI/UX skill setup (one-time global install)

```bash
npm install -g ui-ux-pro-max-cli
uipro init --ai claude --global
```

Requires Python 3.x. This is optional — `.claude/skills/ui-ux-pro-max/SKILL.md` has project-specific design guidance that works without the global CLI.

## Non-negotiable rules

- NestJS (latest) — no Fastify, no Express
- Angular (latest) for all web frontends — no React, no Next.js, no Vue on the web
- React used only inside the Ionic mobile app at `apps/mobile/` — and even there it's **Ionic Angular**, not Ionic React; there is no actual React code anywhere in this repo
- `class-validator` + `class-transformer` for backend validation — never Zod, never AJV
- TypeScript strict — no `any`, no `as unknown as T`, no `@ts-ignore`
- DTOs are classes with decorators — never plain interfaces
- MSAL for all auth — no custom JWT, no bcrypt user-password auth
- MySQL only — no PostgreSQL
- Azure Monitor for all logging — no Pino, no `console.log` in production
- No comments in code (inline `// [comment text]` allowed where genuinely non-obvious)
- No hardcoded secrets — all secrets via environment variables
- Folder structure is immutable — do not create new top-level folders
- `common/` for all shared packages — not `packages/` or `libs/`
- All packages scoped as `@project-olympus/[name]` — never `@common/` as a separate scope
- All interfaces, models, DTOs, and constants in their own files
- Match existing coding style — keep functions, do not switch to arrow functions at the class level
- UUIDs generated at the application layer with `crypto.randomUUID()` — never `@default(uuid())` in Prisma, never DB-generated
- No Prisma scalar list fields (`String[]`, `Int[]`) — MySQL doesn't support them; use a join table or `Json` column
- Do not run database migrations — leave for the user
- Do not run Git operations — leave for the user
- Use `#region` / `#endregion` for logical code grouping in TypeScript/C#
- Before marking any TypeScript task complete, run `pnpm --filter <app> typecheck` — zero errors required
- All frontend forms must implement the full validation chain — see `validation-chain.instructions.md`: client `Validators` failures show inline, server errors show in a `serverError` signal/toast, never the other way round
- please build all apps using tsconfig tsc to ensure no build surprise errors during deployment run.

## Folder structure (immutable)

```text
apps/backend/        NestJS services (api-gateway, admin-api, customer-api, schedule-api, partner-api)
apps/frontend/        Angular (admin-web and customer-web)
apps/mobile/           Ionic Angular + Capacitor (customer-mobile)
apps/cms/               Directus (Docker-based, managed independently)
apps/automation/        n8n
common/                  shared packages only
dev-ops/                  Docker, Docker Compose, Kubernetes manifests
infrastructure/            NGINX, Terraform (Azure only)
documentation/               markdown docs
.github/                       CI/CD workflows only — agent/instruction config lives in .claude/
.claude/                        Claude Code configuration
  agents/                       subagent definitions (auto-invoked by description)
  commands/                     legacy slash commands (single-file)
  hooks/                        scripts run on tool use events
  instructions/                 applyTo-gated reference files
  rules/                        path-gated rules (load when matching files enter context)
  skills/                       reusable skills invoked with /name
  templates/                    scope and PR templates
  workflows/                    multi-agent workflow reference docs
.mcp.json                       MCP server config (project root, committed)
```

`.github/agents/`, `.github/instructions/`, and `.github/prompts/` are superseded by `.claude/agents/`, `.claude/instructions/`, and `.claude/commands/` respectively — see the migration note at the bottom of this file.

## Common packages

| Package | Purpose |
| --- | --- |
| `@project-olympus/auth` | Azure MSAL token validator + NestJS `AzureAuthGuard` base class |
| `@project-olympus/cache` | ioredis-backed cache-aside service |
| `@project-olympus/config` | Env validation with `class-validator` + `EnvConfig`, `FeatureFlagService` |
| `@project-olympus/database` | Prisma + MySQL multi-schema clients + injection tokens |
| `@project-olympus/email` | Mailgun (MailHog SMTP in dev) |
| `@project-olympus/export` | CSV/Excel/PDF export utilities |
| `@project-olympus/external-apis` | `forRootAsync` NestJS HTTP client modules for third-party integrations |
| `@project-olympus/logging` | `AzureMonitorLogger` (NestJS `LoggerService` implementation) |
| `@project-olympus/metrics` | Application metrics |
| `@project-olympus/queue` | BullMQ + `EventBusService` for webhook/event publishing |
| `@project-olympus/sms` | SMS provider integration |
| `@project-olympus/storage` | Azure Blob + S3 file storage |
| `@project-olympus/types` | Shared types, `Permission`/`RolePermissions`/`RoleName`, response DTOs |
| `@project-olympus/utilities` | Shared helper functions |

## Package manager

pnpm — always use `pnpm`, never `npm` or `yarn`. Internal deps: `workspace:*`.

## Port assignments

| Service | Port |
|---|---|
| api-gateway | 4000 |
| admin-api | 4001 |
| customer-api | 4002 |
| schedule-api | 4003 |
| partner-api | 4004 |
| admin-web (dev) | 4200 |
| customer-web (dev) | 5173 |

## Using this as a template — project name substitution

`project-olympus` is itself a base template, parallel to `node-mono-repo-template`, for future Angular + NestJS client projects. When forking for a new project, replace `project-olympus` with the project slug everywhere, and `@project-olympus/` with `@your-scope/`. This covers `package.json` name fields, `tsconfig.json` path aliases, `pnpm-workspace.yaml`, import paths, this file, every file under `.claude/agents/`, every file under `.claude/commands/`, and every file under `.claude/instructions/`. `commands/init-project.md` and `commands/sync-from-template.md` automate this.

After substitution, fill in `infrastructure/terraform/azure/environments/*.tfvars`, `apps/backend/*/.env`, `apps/frontend/**/src/environments/environment.ts`, and Azure AD app registration client IDs/tenant ID, then replace this section with project-specific notes.

## Migration note (`.github/` → `.claude/`)

This repo previously drove Claude Code from `.github/agents/`, `.github/instructions/`, and `.github/prompts/`. Those have been superseded by `.claude/agents/`, `.claude/instructions/`, and `.claude/commands/` respectively, plus new additions the old structure didn't have: path-gated `.claude/rules/`, `.claude/skills/`, `.claude/hooks/`, and a `.claude/templates/` folder for PR/scope templates. The old `.github/agents/`, `.github/instructions/`, and `.github/prompts/` folders can be removed once the team has confirmed the new structure covers everything they relied on — `.github/` should be left holding only CI/CD workflow files (`.github/workflows/`) going forward.
