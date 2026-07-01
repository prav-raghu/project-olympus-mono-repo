---
paths:
  - "dev-ops/docker/**"
  - "dev-ops/docker-compose*.yml"
  - "dev-ops/k8s/**"
---

# Docker & Kubernetes Rules

You are working on containerization config for this monorepo. Dockerfiles live under `dev-ops/docker/`, Kubernetes manifests under `dev-ops/k8s/`, and Docker Compose stacks at `dev-ops/docker-compose*.yml`.

⚠️ Several files currently checked into these paths still reference `postgres`, `JWT_SECRET`, a single `DATABASE_URL`, the old `@project-olympus-template` scope, and ports `3000`–`3002`. Those predate the MySQL + Azure MSAL architecture and are drift, not the target state — see `infrastructure.md` for the full explanation. Follow the rules below, not whatever a given file currently contains, and flag any file you touch that still has the old values.

## Build context is always the monorepo root

Every Dockerfile uses the repo root as its build context so it can reach `common/`, `turbo.json`/`pnpm-workspace.yaml`. `dockerfile:` points at `dev-ops/docker/<service>.Dockerfile`; `context:` is `.` from the repo root (or `..` from `dev-ops/`, matching whatever the compose file's own location implies).

## Multi-stage pattern (required)

| Stage | Purpose |
|---|---|
| `base` | `node:22-alpine` + `corepack enable` |
| `builder` | `pnpm install --frozen-lockfile`, `pnpm --filter @project-olympus/database prisma:generate`, `pnpm --filter "@project-olympus/<service>..." build`, `pnpm deploy --filter @project-olympus/<service> --prod /prod/<service>` |
| `runner` | Lean runtime image, non-root user, `EXPOSE` matching the authoritative port table, `CMD ["node", "dist/main.js"]` |

## Authoritative EXPOSE values

| Service | `EXPOSE` |
|---|---|
| api-gateway | 4000 |
| admin-api | 4001 |
| customer-api | 4002 |
| schedule-api | 4003 |

## Environment variables each backend container needs

`NODE_ENV`, `PORT`, the relevant `DATABASE_URL_ADMIN`/`DATABASE_URL_CUSTOMER`/`DATABASE_URL_SCHEDULE`/`DATABASE_URL_SHARED` (only the ones the service actually reads), `REDIS_URL`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_API_AUDIENCE`, `AZURE_AUTHORITY`, `APPLICATIONINSIGHTS_CONNECTION_STRING`. Never `JWT_SECRET` — this project has no custom JWT issuance.

## Healthcheck

```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:<PORT>/health || exit 1
```

Use `127.0.0.1`, not `localhost` — Alpine containers can resolve `localhost` to IPv6 `::1` while Node listens on IPv4.

## Kubernetes

`containerPort` in every Deployment must match the authoritative port table. Secrets come from `Secret`/`ConfigMap` objects (ideally synced from Azure Key Vault), never inline plaintext in the manifest. Database migrations run as a one-shot `Job`, never inside `main.ts` on Pod startup — see `database-migrations.instructions.md`.
