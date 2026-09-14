# project-olympus

The Angular + NestJS counterpart to `node-mono-repo-template` — same monorepo philosophy (pnpm + Turborepo, `common/*` shared packages, Claude Code agents driving the build), different stack: NestJS instead of Fastify, Angular instead of React/Next.js, MySQL instead of PostgreSQL, Azure MSAL instead of custom JWT.

## Instruction precedence

When guidance conflicts, resolve in this order:

1. The user's explicit request
2. Security/permission constraints in `.claude/settings.json`
3. Current repository code and committed configuration (e.g. `docker-compose.yaml`, `schema.*.prisma`) — a written example never overrides what's actually committed
4. Path-specific files in `.claude/rules/`
5. The selected subagent in `.claude/agents/`
6. This file
7. Deep-dive reference docs in `.claude/instructions/`
8. Legacy commands in `.claude/commands/` — thin entry points that delegate to an agent; treat any command content that contradicts a higher-precedence source as stale, not authoritative

If a command, agent, and rule genuinely disagree instead of one being simply out of date, say so and ask rather than silently picking one.

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
| `infrastructure` | Terraform (Azure canonical; AWS/GCP structural stubs), Kubernetes, Docker Compose, NGINX |
| `vps-bootstrap` | One-time fresh-VPS setup — prerequisite to deployment-coolify |
| `deployment-coolify` | Additional self-hosted deploy path: Coolify, GHCR image builds, managed MySQL/Redis, DNS — Azure remains primary |
| `testing` | Unit/integration tests, Jest config, factories |
| `typescript-standards` | Type-safety review outside a full code review |
| `code-review` | Full quality/security audit |

For anything not covered by a subagent above, read the relevant file in `.claude/instructions/` before writing code.

## Model selection when delegating to a subagent

Every subagent's `model:` frontmatter is `inherit` unless noted below — it runs on whatever model this session is running on. The `Agent` tool also accepts a per-call `model` override that beats the agent's own frontmatter; use it deliberately to control cost, not by default.

**Override down to `claude-haiku-4-5-20251001` only when *all* of these hold:**
- The task mirrors an existing, unambiguous pattern already in this codebase (e.g. "add a 6th CRUD entity shaped exactly like the other 5") — not a first-of-its-kind design decision.
- Nothing security-, auth-, RBAC-, payment-, or PII-adjacent is being written or touched.
- A mistake would be caught by `tsc`/lint/tests before merge — not the kind of subtle logic error that slips past mechanical checks and only shows up as a real bug later.
- The blast radius is one file or one entity, not a shared `common/*` package or a cross-cutting concern.

`new-service-scaffold` and `testing` (for straightforward, already-understood service/controller test-writing — not for designing a test strategy for something novel) default to Haiku in their own frontmatter for exactly this reason: they're closer to templating than judgment. That default is a starting point, not a floor — bump either back to Sonnet for an unusually complex instance of their normal work.

**Never override down — keep Sonnet (or the session's own model) — for:** `rbac`, `database-migrations`, `domain-modeler`, `code-review`, `typescript-standards`, `deployment-coolify`, `infrastructure`, `vps-bootstrap`, `enterprise-scale`, `full-stack-orchestrator`, `audit-log`, `webhook-events`, `common-packages`, `relational-database`. These carry either security consequences, wide blast radius, or genuine architectural judgment that a mistake won't surface as a clean typecheck failure — it surfaces as a production incident or a silent vulnerability. `code-review` in particular is the backstop for everything else in this list; downgrading the backstop defeats the point of having one.

Everything else (`api-builder`, `frontend-angular`, `frontend-page-builder`, `mobile`, `feature-flags`, `backend-service`, `external-api`) is task-dependent — judge the specific request against the four bullets above each time rather than a fixed per-agent answer.

This list is a starting point, not a settled policy — if a Haiku-delegated task comes back needing real rework, that's a signal to tighten these criteria (or move that agent to the "never override" list), not to push through it.

## Path-gated rules (automatic)

Files under `.claude/rules/` load automatically when a matching file enters context — no manual reading required:

| Rule | Loads for |
|---|---|
| `backend.md` | `apps/backend/**/*.ts` |
| `frontend.md` | `apps/frontend/**/*.ts`, `**/*.html` |
| `mobile.md` | `apps/mobile/**/*.ts`, `**/*.html` |
| `prisma.md` | `common/database/prisma/**`, `common/database/src/**` |
| `docker.md` | `apps/backend/*/Dockerfile`, `apps/frontend/*/Dockerfile`, `dev-ops/docker-compose*.yml`, `dev-ops/k8s/**`, `docker-compose.yaml` (repo root) |
| `testing.md` | `**/*.test.ts`, `**/*.spec.ts`, `**/tests/**/*.ts` |

## Deployment — Azure is canonical; Coolify is an additional self-hosted path

This project's primary, cloud-provisioned deployment target is **Azure** (Container Apps/AKS, Azure Database for MySQL Flexible Server, Azure Cache for Redis, Azure Blob Storage, Application Insights) — see `infrastructure.md`. Auth stays on Azure MSAL regardless of which deployment path is active.

Alongside Azure, this project also supports deploying to a **self-hosted VPS via Coolify**, mirroring the `zynkosi-tech` sibling template's canonical deploy path: `vps-bootstrap` runs once on a fresh server (installs Coolify); `deployment-coolify` covers everything after that (root `docker-compose.yaml`, GHCR image builds via `.github/workflows/docker-build.yml`, Coolify-managed MySQL/Redis, DNS). The root `docker-compose.yaml` is a separate stack from `dev-ops/docker-compose.yml` — see `rules/docker.md`. Use Coolify only when explicitly asked; new infrastructure work defaults to Azure.

`infrastructure/terraform/aws/` and `infrastructure/terraform/gcp/` also exist, mirroring the Azure module structure (ECS/RDS MySQL/ElastiCache vs. Cloud Run/Cloud SQL MySQL/Memorystore) — see `infrastructure/terraform/README.md`. These are **structural stubs, not provisioned or deployed today**; they exist so a future multi-cloud requirement doesn't need a redesign. Do not run `terraform apply` against them without the user explicitly asking to activate that path.

`dev-ops/docker-compose.yml`, per-service `Dockerfile`s (now under `apps/backend/*/Dockerfile` and `apps/frontend/*/Dockerfile`, not `dev-ops/docker/`), `dev-ops/k8s/*.yaml`, and `infrastructure/terraform/azure/*` have been reconciled to the MySQL + Azure MSAL + multi-schema `DATABASE_URL_*` + ports 4000–4004 target state described in `infrastructure.md` and `rules/docker.md`. Remaining known gaps: `infrastructure/terraform/azure/environments/staging.tfvars` and `prod.tfvars` (only `dev.tfvars` was reconciled) and `infrastructure/terraform/azure/terraform.tfvars.example` still reference the old `khula*`/Postgres-era naming; the `key-vault` module has a pre-existing `sensitive` value used in a `for_each` (Terraform-invalid, blocks `validate` regardless of secret content); `static-site` module's `outputs.tf` references a CDN attribute not in the pinned `azurerm` provider version; `infrastructure/terraform/main.tf` (the file directly under `infrastructure/terraform/`, not inside `azure/`/`aws/`/`gcp/`) is orphaned leftover generic AWS example code unrelated to this project — flagged, not deleted, pending the developer's call. Angular's `admin-web`/`customer-web` have no `fileReplacements` wired in `angular.json`, so `environment.prod.ts` is currently dead code — build-time config injection (the equivalent of Vite/Next `ARG`-baked env vars used in the Coolify Dockerfiles) isn't wired up yet on either deployment path.

## Skills (invoke with /name or auto-invoked by description match)

| Skill | When to use |
|---|---|
| `/ui-ux-pro-max` | Before building any frontend page or component — design system lookup, color, typography, UX patterns |
| `/build-page` | Build a complete Angular page end-to-end with design intelligence baked in |
| `/impeccable` | After a page/component is built — 23-command design taste pass (`critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `animate`, ...) plus a deterministic 59-rule anti-"AI slop" detector (gradient text, purple/violet gradients, glowing dark-mode accents, overused fonts, WCAG contrast, bounce easing) |
| `emil-design-eng` | Animation and micro-interaction review — Emil Kowalski's (Sonner/Vaul author) design-engineering rules: keep UI animations under 300ms, never `ease-in` for entrances, custom easing over CSS defaults, spring physics, before/after review tables |
| `design-taste-frontend` (`taste-skill`) | Anti-slop pass for **`customer-web` marketing/landing pages, portfolios, and redesigns only** — explicitly not scoped for dashboards, data tables, or multi-step product UI, so skip it for `admin-web` CRUD screens. Vendored from a React/Next.js source — translate its code samples to Angular before use (its own file has the detail). Tunable via `DESIGN_VARIANCE`/`MOTION_INTENSITY`/`VISUAL_DENSITY` (1–10) |
| `/security-review` | Audit code for auth gaps, injection risks, and secrets before merge |
| `/code-review-skill` | Full quality review: types, naming, security, form validation coverage |
| `/seo-optimization` | Audit/improve SEO for `customer-web` (Angular, CSR-only today) — per-route Title/Meta, structured data, sitemaps, Open Graph, Core Web Vitals; leads with the SSR/prerender recommendation the CSR baseline needs |

### Design taste stack

`ui-ux-pro-max` and `build-page` remain the primary design authority for this monorepo — design-system lookup, palettes, fonts, and Angular-specific component patterns for the actual build. `impeccable`, `emil-design-eng`, and `design-taste-frontend` are an **additive taste/anti-slop layer** run after a page or component is built, not a replacement:

- **`impeccable`** is the general-purpose one — works for any surface (dashboards included), framework-agnostic since it operates on rendered browser output. Run `/impeccable audit <target>` or `/impeccable polish <target>` as a finishing pass on new frontend work.
- **`emil-design-eng`** narrows to motion/animation review specifically — invoke when a page has non-trivial transitions, loading states, or micro-interactions worth scrutinizing. Almost entirely CSS-based and framework-agnostic.
- **`design-taste-frontend`** only fits `customer-web` marketing/landing surfaces (its own description explicitly excludes dashboards and data tables) — do not reach for it on `admin-web`. Its design-taste judgment (palette/type/spacing/motion decisions, the anti-slop checklist) is framework-agnostic; its code samples are React/Next.js and must be translated to Angular (Signals, standalone components, `afterNextRender`) before use — see the note at the top of its `SKILL.md`.

Vendored from `pbakaus/impeccable`, `emilkowalski/skills`, and `Leonxlnx/taste-skill` respectively (Apache-2.0 / MIT / MIT) — see each skill folder's `SOURCE.md` for the commit vendored and how to refresh it. `impeccable`'s own PostToolUse/Stop hook auto-run was **not** wired into `.claude/settings.local.json` — it's available to invoke manually via `/impeccable ...`; opt into the automatic per-edit hook yourself if you want it (see `.claude/skills/impeccable/reference/hooks.md`).

## Commands (legacy, still work)

`/add-endpoint`, `/add-entity`, `/add-service`, `/add-pages`, `/add-tests`, `/design-database`, `/review`, `/build-system`, `/provision-infrastructure`, `/init-project`, `/sync-from-template`, `/deploy-coolify`, `/request-logging`

## Memory — Claude Mem (optional)

Serena (LSP-backed code navigation MCP server) is not used on this project — Claude Code drives navigation through its own tools instead. If the team wants cross-session memory (decisions and context persisting between sessions instead of vanishing when one ends), **Claude Mem** is the option this template's sibling project uses: it hooks into the session lifecycle (`SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Stop`, `SessionEnd`) and stores a local SQLite + vector-search summary of what happened.

This is a per-developer, one-time install — Claude does not run it for you:

```bash
npx claude-mem install
```

Local dashboard (session history, memory search): `http://localhost:37777`. Wrap anything session-specific and sensitive (API keys, customer data) in `<private>...</private>` in a prompt to exclude it from what gets stored. Not currently installed on this project — this section documents the option for the developer to opt into, not a standing requirement.

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
- No god structures: never name a controller, service, DTO, or file after the project/app itself (e.g. `olympus.controller.ts`, `admin.service.ts`) as a catch-all that encapsulates every entity's logic. Each entity gets its own service layer and DTOs under its own file, named after the entity (`user.service.ts`, `user.dto.ts`). A controller may still be entity-scoped (`user.controller.ts`) or composed into a dashboard/aggregate controller that calls into per-entity services — the composition happens at the controller/route layer, never by collapsing entity logic into one shared file. See `.claude/agents/backend-service.md` and `.claude/agents/api-builder.md` for the controller/service/DTO file layout this produces.
- please build all apps using tsconfig tsc to ensure no build surprise errors during deployment run.

## Folder structure (immutable)

```text
apps/backend/        NestJS services (api-gateway, admin-api, customer-api, schedule-api, partner-api)
apps/frontend/        Angular (admin-web and customer-web)
apps/mobile/           Ionic Angular + Capacitor (customer-mobile)
apps/cms/               Directus (Docker-based, managed independently)
apps/automation/        n8n
common/                  shared packages only
dev-ops/                  Docker, Docker Compose, Kubernetes manifests, VPS bootstrap + Coolify migrate scripts
infrastructure/            NGINX, Terraform (Azure canonical; aws/ and gcp/ are structural stubs)
docker-compose.yaml         repo-root file (not a new top-level folder) — Coolify deployment stack, see rules/docker.md
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
