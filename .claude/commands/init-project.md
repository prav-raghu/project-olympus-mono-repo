---
description: "Initialize a new client project from this project-olympus template - rename scope, update branding, configure environment"
agent: "new-service-scaffold"
argument-hint: "New project name, e.g. 'acme-portal'"
---

Initialize a new client project from the project-olympus template:

**New project name:** {{ input }}

## Steps

1. Rename the package scope from `@project-olympus/` to `@{{ input }}/` across every `package.json`, `tsconfig.json` path mapping, and import statement
2. Update `pnpm-workspace.yaml` and root `package.json` `name` field
3. Rename Docker image references, Kubernetes manifest labels, and Terraform resource-name prefixes in `dev-ops/` and `infrastructure/`
4. Update `.env.example` files with the new project's expected values (keep `AZURE_*`/MySQL variable *names* identical — only values change)
5. Update `README.md` and `CLAUDE.md` title/references
6. Update `apps/frontend/*/src/environments/environment*.ts` MSAL `clientId`/`authority` placeholders
7. Search the entire repo for the literal string `project-olympus` and confirm every remaining occurrence is either a generic pattern example that should stay, or something that needs renaming
8. Run `pnpm install` to regenerate the lockfile against the new package names
9. Run `pnpm typecheck` across the monorepo to confirm nothing broke

## Do not touch

- The actual architecture (NestJS, Angular, MySQL, MSAL, Redis, BullMQ) — this is a rename, not a re-platform
- `.claude/agents/`, `.claude/instructions/`, `.claude/rules/` content beyond literal scope-string replacement — see `sync-from-template.md` if the new project should also pull in agent/instruction updates made here after the fork
