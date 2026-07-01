# Workflows

This folder documents multi-step processes that span several agents. There's no special file format Claude Code auto-loads here — these are reference documents for Claude (and Prav) to follow when a task doesn't map to a single command.

## Building a new full-stack feature

1. Scope it using `templates/scope.template.md`
2. Hand off to `full-stack-orchestrator.md`, which delegates to:
   - `domain-modeler.md` → Prisma schema
   - `api-builder.md` or `backend-service.md` → NestJS API layer
   - `rbac.md` → new permissions, if any
   - `frontend-page-builder.md` → Angular pages
3. Run `pnpm --filter @project-olympus/database prisma:generate`
4. Run `pnpm typecheck` across affected packages
5. Run `code-review.md` before considering it done

## Adding a new backend service

1. `new-service-scaffold.md` for the boilerplate
2. `backend-service.md` for the module/controller/service conventions
3. `rbac.md` for auth wiring
4. `infrastructure.md` + `rules/docker.md` for the Dockerfile and Docker Compose entry
5. `database-migrations.md` if it owns a new schema

## Adding a webhook-emitting feature

1. `webhook-events.md` for the Prisma models, `EventBusService`, and delivery processor
2. `rbac.md` for the `WEBHOOK_READ`/`WEBHOOK_WRITE` permissions
3. `audit-log.md` if subscription changes should be audited

## Rolling out a feature behind a flag

1. `feature-flags.md` for the flag definition and evaluation
2. Build the feature normally, gated by `featureFlags.isEnabled(...)`
3. Increase `rolloutPercent` gradually
4. Once fully rolled out, follow the "Removing a flag" section in `feature-flags.md`

## Provisioning a new environment

1. `infrastructure.md` for the Terraform module layout — Azure only
2. `terraform.instructions.md` for naming/security conventions
3. Apply via `pnpm`/`terraform` commands listed in `infrastructure.md`, always plan before apply

## Forking this repo into a new client project

1. `commands/init-project.md` — scope rename and environment setup
2. Later, to pull in improvements made here: `commands/sync-from-template.md`
