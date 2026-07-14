---
paths:
  - "apps/backend/*/Dockerfile"
  - "apps/frontend/*/Dockerfile"
  - "dev-ops/docker-compose*.yml"
  - "dev-ops/k8s/**"
  - "docker-compose.yaml"
---

# Docker & Kubernetes Rules

You are working on containerization config for this monorepo. Each Dockerfile lives at the root of its own app — `apps/backend/<service>/Dockerfile`, `apps/frontend/<app>/Dockerfile` — not centralized under `dev-ops/`. Kubernetes manifests live under `dev-ops/k8s/`, and Docker Compose stacks at `dev-ops/docker-compose*.yml`. The root `docker-compose.yaml` (repo root, not under `dev-ops/`) is a separate, single Coolify deployment stack — see `deployment-coolify.md`. It is `image:`-only (GHCR-pulled, built by `.github/workflows/docker-build.yml`), never `build:` — do not add a `build:` block to it, and do not confuse it with `dev-ops/docker-compose.yml`, which stays `build:`-based for the Azure/self-managed-Docker path.

## Build context is always the monorepo root

Every Dockerfile lives in its own app's root directory but uses the repo root as its build context so it can reach `common/`, `turbo.json`/`pnpm-workspace.yaml`. In each Compose service block, `dockerfile:` points at `apps/backend/<service>/Dockerfile` (or `apps/frontend/<app>/Dockerfile`); `context:` is the repo root (`.` or `../..`/`../../..` depending on the compose file's own location).

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
| partner-api | 4004 |

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
