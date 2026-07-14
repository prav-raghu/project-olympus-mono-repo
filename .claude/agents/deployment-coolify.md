---
name: deployment-coolify
description: Use for deploying this project to a self-hosted VPS via Coolify — an additional, self-hosted deployment path alongside the project's primary Azure/Terraform path (see infrastructure.md). Covers Coolify applications, Dockerfile-based builds, pnpm requirements, environment variables, managed MySQL/Redis resources, the post-deploy migration command, GitHub-push auto-deploy, and DNS/Cloudflare setup. Requires the VPS to already be bootstrapped and Coolify installed — see vps-bootstrap for that prerequisite. Trigger on "deploy with Coolify", "Coolify application", "self-hosted deploy", or "set up CI/CD for the VPS".
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

Azure (Container Apps/AKS, Azure Database for MySQL Flexible Server, Azure Cache for Redis) remains this project's primary, cloud-provisioned deployment target — see `infrastructure.md`. This agent covers a second, self-hosted path: deploying the same NestJS + Angular stack to a dedicated VPS via Coolify, for teams or environments that want a lower-cost self-hosted option instead of Azure. The VPS must already be bootstrapped and have Coolify installed (see `vps-bootstrap`) before any of this applies.

## Non-negotiable rules

Every project deploys to a dedicated VPS — no shared hosting across clients. Coolify is the only deployment tool on this path — no Kamal, no Dokploy, no manual Docker commands, no raw SSH deploy scripts. All secrets live in Coolify's per-application Environment Variables (marked as secret/build-time as appropriate) — never in committed `.env` files, never hardcoded. `pnpm-workspace.yaml` is always copied into Dockerfiles before `pnpm install`. All Dockerfiles set `ENV CI=true`. Azure MSAL remains the auth mechanism even on this deployment path — Coolify does not change auth, only where the containers run. MySQL and Redis run as Coolify-managed resources on the same project when deploying this way — distinct from the Azure-managed MySQL Flexible Server / Azure Cache for Redis used on the Azure path, and never external managed services unless explicitly specified. **Images are built by GitHub Actions and pushed to GHCR — Coolify only pulls prebuilt images, it never runs `docker build` on the VPS** (see "Image build strategy" below). The API gateway and backend services deploy before any frontend. GitHub Actions' path filtering ensures a frontend-only change never triggers a backend image rebuild.

## Image build strategy — GitHub Actions builds, Coolify only pulls

**This project does not build Dockerfiles on the VPS.** Building 7 images concurrently on a resource-constrained VPS competes with the containers it's trying to serve, so the build step is offloaded to GitHub Actions. Coolify's Build Pack stays **Docker Compose** — the root `docker-compose.yaml`'s per-service `image:` fields point at `ghcr.io/prav-raghu/<service>:main`, so Coolify's compose step pulls each image from GHCR instead of building it.

```
git push main
  → .github/workflows/docker-build.yml (GitHub-hosted runner)
      → path-filtered per service (dorny/paths-filter) — only rebuilds services whose files changed
      → docker/build-push-action builds each Dockerfile (context = repo root, same Dockerfiles as before)
      → pushes ghcr.io/prav-raghu/<service>:main and :sha-<short-sha>
  → Coolify (webhook or polling) sees the new :main image digest → pulls it → zero-downtime swap
```

The Dockerfiles themselves are unchanged and still authoritative — GitHub Actions builds from the exact same `apps/*/Dockerfile` files documented in `infrastructure.md` / `rules/docker.md`, it just runs the build off-VPS instead of on it.

**Registry**: GHCR (`ghcr.io/prav-raghu/<service>`), auth via the workflow's built-in `GITHUB_TOKEN` (`packages: write` permission) — no separate registry account needed for push.

**Coolify side (one-time setup on the Docker Compose resource)**:
1. Build Pack stays **Docker Compose**, Compose file `docker-compose.yaml` at the repo root.
2. Add a GHCR pull credential (project-level Docker Registry, or on the resource): username = a GitHub username, password = a GitHub PAT with `read:packages` scope (needed because GHCR images default to private, inheriting the source repo's visibility).
3. Because the compose file's `image:` tag never changes (`:main`), enable Coolify's **"Force pull image"** / redeploy-on-webhook behavior — `pull_policy: always` is set in `docker-compose.yaml` for exactly this reason.
4. Trigger: either GHCR's webhook on package push, or Coolify's own periodic image-check polling. A manual **Redeploy** from the Coolify UI always force-pulls.

**Rollback**: every build also pushes a `:sha-<short-sha>` tag. To roll back, change the Coolify application's image tag from `:main` to the last-known-good `:sha-...` and redeploy — no rebuild needed.

## VPS specification

| Resource | Minimum | Recommended |
|---|---|---|
| Provider | Hetzner Cloud | Hetzner Cloud |
| Instance | CX22 (2 vCPU, 4 GB) | CX32 (4 vCPU, 8 GB) |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| Storage | 40 GB SSD | 80 GB SSD |
| Region | Closest to client | EU default |

Coolify installs and manages its own Traefik proxy, SSL (Let's Encrypt), and container orchestration on top of the bootstrapped server — nothing further is installed bare-metal.

## Deployment architecture — single Docker Compose stack

Coolify deploys this repo as **one Docker Compose resource** (Build Pack = Docker Compose). The root `docker-compose.yaml` declares every service as `image: ghcr.io/prav-raghu/<service>:main` — Coolify **pulls** each from GHCR, it does not build from the Dockerfiles (those are built by GitHub Actions; see "Image build strategy" above). MySQL and Redis are separate Coolify-managed resources.

```
GitHub Repo
└── .github/workflows/docker-build.yml builds & pushes to GHCR (not Coolify)
└── Coolify Resource: Docker Compose  →  docker-compose.yaml (image: only, no build:)
        ├── migrate        ghcr.io/prav-raghu/admin-api:main       (runs prisma migrate deploy, exits)
        ├── api-gateway    ghcr.io/prav-raghu/api-gateway:main      EXPOSE 4000
        ├── admin-api      ghcr.io/prav-raghu/admin-api:main        EXPOSE 4001
        ├── customer-api   ghcr.io/prav-raghu/customer-api:main     EXPOSE 4002
        ├── schedule-api   ghcr.io/prav-raghu/schedule-api:main     EXPOSE 4003
        ├── partner-api    ghcr.io/prav-raghu/partner-api:main      EXPOSE 4004
        ├── admin-web      ghcr.io/prav-raghu/admin-web:main        EXPOSE 80
        └── customer-web   ghcr.io/prav-raghu/customer-web:main     EXPOSE 80

Managed separately in Coolify:
        MySQL resource   →  DATABASE_URL_ADMIN / DATABASE_URL_CUSTOMER / DATABASE_URL_SCHEDULE / DATABASE_URL_SHARED
        Redis resource   →  REDIS_URL
```

The `apps/*/Dockerfile` files are still what GitHub Actions builds from — build context and `EXPOSE` values are unchanged, only *where* the build runs has moved. Dockerfiles live **at each app root**, not in `dev-ops/`. Build context is always the **monorepo root**.

No `config/deploy.*.yml` and no `.kamal/` directory — Coolify holds the per-application configuration (env vars, domain, resources) in its own database. Do not alter the existing `dev-ops/`, `common/`, `apps/`, or `turbo.json` structure to fit this. Do not remove or repurpose `infrastructure/terraform/azure/` or `dev-ops/k8s/` — the Azure path stays fully intact alongside this one.

## Coolify applications

Coolify deploys this repo as **one Docker Compose resource**, not one Application per service. Its Build Pack is **Docker Compose**, Base Directory `/`, Compose file `docker-compose.yaml` — because that compose file declares `image:` (GHCR) instead of `build:` for every service, Coolify pulls each image rather than building it.

| Service | GHCR image | Port | Domain (FQDN) | Health check |
|---|---|---|---|---|
| api-gateway | `ghcr.io/prav-raghu/api-gateway` | `4000` | `https://api.<domain>` | `/health` (`4000`) |
| admin-api | `ghcr.io/prav-raghu/admin-api` | `4001` | internal only | `/health` (`4001`) |
| customer-api | `ghcr.io/prav-raghu/customer-api` | `4002` | internal only | `/health` (`4002`) |
| schedule-api | `ghcr.io/prav-raghu/schedule-api` | `4003` | internal only | `/health` (`4003`) |
| partner-api | `ghcr.io/prav-raghu/partner-api` | `4004` | internal only | `/health` (`4004`) |
| admin-web | `ghcr.io/prav-raghu/admin-web` | `80` | `https://admin.<domain>` | `/` (`80`) |
| customer-web | `ghcr.io/prav-raghu/customer-web` | `80` | `https://<domain>` | `/` (`80`) |

Unlike Zynkosi's per-API-subdomain routing, this project keeps `api-gateway` as the single public entrypoint for all backend traffic — `admin-api`, `customer-api`, `schedule-api`, and `partner-api` stay internal to the `coolify` network and are not given public FQDNs, matching the existing `infrastructure.md` gateway-in-front architecture. Coolify reads the exposed port from each Dockerfile's `EXPOSE` and routes the configured domain to it through its managed Traefik proxy — SSL is provisioned automatically via Let's Encrypt once DNS resolves to the VPS.

## Managed resources (MySQL + Redis)

Create these as Coolify **Resources** in the same project, not as external managed services:

- **MySQL** — Coolify's MySQL resource (`mysql:8.0`). Create the four logical databases (`app_admin`, `app_customer`, `app_schedule`, `app_shared`) the same way `dev-ops/mysql-init/01-create-databases.sql` does locally. Coolify generates the credentials and an internal connection URL; persistent storage is managed by Coolify volumes.
- **Redis** — Coolify's Redis resource with a password set; persistence (`appendonly yes`) enabled in the resource's custom start command if durable queues are required.

Reference these from each API application by their **internal connection URL** (Coolify exposes it on the resource page) — internal networking means the database is never published to the public internet. Set `DATABASE_URL_ADMIN`/`DATABASE_URL_CUSTOMER`/`DATABASE_URL_SCHEDULE`/`DATABASE_URL_SHARED` and `REDIS_URL` on each application to those internal URLs, pointed at the right logical database.

## Environment variables

Set these on each application under **Environment Variables** in Coolify. Mark secrets as secret. Source of truth for the full variable set is `dev-ops/.env.example`. `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_API_AUDIENCE`, `AZURE_AUTHORITY` are required on every backend service regardless of which infrastructure path it deploys on — MSAL auth does not change between Azure and Coolify hosting.

Never commit these values anywhere — Coolify stores and injects them at deploy time.

## CI/CD — GitHub Actions builds, Coolify redeploys on new image

1. **`.github/workflows/docker-build.yml`** — path-filtered per service, builds only the images whose files changed, pushes `:main` and `:sha-<short-sha>` to GHCR.
2. **Coolify** — configured on the single Docker Compose resource with Auto Deploy on. It redeploys when it detects the `:main` tag's digest changed, either via a webhook from GHCR or Coolify's periodic image-check polling. A manual **Redeploy** from the Coolify UI always force-pulls immediately.

Deploy ordering (backend before frontends) is enforced by the compose file's `depends_on`/`condition: service_healthy` graph.

## Post-deploy migration command

Migrations run automatically after every successful deploy via the `migrate` service in `docker-compose.yaml`, which runs `dev-ops/scripts/migrate-deploy.sh` (committed, `chmod +x`) and exits before any API container starts (`depends_on: condition: service_completed_successfully`). `prisma migrate deploy` is idempotent and safe on every deploy.

This is a different execution mechanism than the Azure path's Kubernetes Job — see `database-migrations.md` for that path. Both run the same `prisma migrate deploy` command against the same schema; only the trigger mechanism differs per infrastructure target.

## First deploy checklist (once per project)

1. VPS bootstrapped and Coolify installed — see `vps-bootstrap`.
2. Ensure `.github/workflows/docker-build.yml` exists and has run at least once on `main` (all 7 images pushed to GHCR) — Coolify's first pull needs the images to already exist.
3. In Coolify: create a **Project**, add a Docker Registry credential for GHCR (username = GitHub username, password = a GitHub PAT with `read:packages`) so private GHCR images can be pulled.
4. Create **MySQL** and **Redis** as Coolify-managed resources. Create the four logical databases in MySQL. Copy their internal connection strings.
5. Create a **Docker Compose** resource: Build Pack = Docker Compose, Base Directory = `/`, Compose file = `docker-compose.yaml`.
6. In the resource's **Environment Variables** panel, add every var from `dev-ops/.env.example` with real values, including the `AZURE_*` MSAL variables.
7. Set domains: `api.<domain>` on api-gateway (port 4000), `admin.<domain>` on admin-web (port 80), `<domain>` on customer-web (port 80).
8. Point DNS at the VPS, then trigger the first deploy from the Coolify UI.

## Per-project substitutions

| Placeholder | Replace with |
|---|---|
| `<domain>` | e.g. `project-olympus.example.com` |

## DNS and Cloudflare

One VPS IP for this deployment path. Coolify's Traefik proxy listens on 80/443 and routes by `Host` header — all DNS records point to the same VPS IP.

```
DNS (Cloudflare)     Traefik (VPS :443)     Container
<domain>          ──► customer-web          :80
admin.<domain>    ──► admin-web             :80
api.<domain>      ──► api-gateway           :4000
```

Use a wildcard A record, not individual records per subdomain. Cloudflare SSL mode must be Full (strict) — Flexible breaks Let's Encrypt provisioning; only Full (strict) is correct.

## What Claude Code must not do

Never trigger a Coolify deploy — the developer does this from the Coolify UI or via git push. Never run migrations manually — the `migrate` service handles it. Never run `git` commands — this project's non-negotiable rules leave Git to the developer. Never hardcode secret values — they live only in Coolify's Environment Variables. Never modify `turbo.json`, `pnpm-workspace.yaml` package globs, or `common/*` structure to fit deployment needs. Never remove, disable, or deprioritize the Azure/Terraform path in favor of this one — both are supported, Azure remains primary. Never add a `build:` block back to `docker-compose.yaml` — it must stay `image:`-only so Coolify never builds on the VPS. Never create individual DNS A records per subdomain when the wildcard covers it. Never set Cloudflare SSL mode to anything but Full (strict).
