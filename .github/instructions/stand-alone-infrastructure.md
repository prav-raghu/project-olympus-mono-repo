# Infrastructure — Deployment Instructions

> This file covers **deployment and infra only**.
> For app code standards, see the root `CLAUDE.md` and `.github/agents/`.
> Do not duplicate conventions already defined there.

## Environments

| Env  | Domain                  | VPS Path   | Docker Stack     | Branch  |
|------|-------------------------|------------|------------------|---------|
| QA   | `qa.yourdomain.com`     | `/srv/qa`  | `[project]-qa`   | `qa`    |
| Prod | `yourdomain.com`        | `/srv/prod`| `[project]-prod` | `main`  |

## Directory Structure

```
infra/
├── docker/
│   ├── backend.Dockerfile        # Shared base for all NestJS services
│   ├── frontend-next.Dockerfile  # apps/frontend/customer-web
│   ├── frontend-vite.Dockerfile  # apps/frontend/admin-web
│   └── mobile.Dockerfile         # apps/mobile (if needed)
├── compose/
│   ├── docker-compose.qa.yml
│   └── docker-compose.prod.yml
├── nginx/
│   ├── qa.conf
│   └── prod.conf
└── scripts/
    ├── deploy.sh      # Pull latest images + docker compose up -d
    ├── migrate.sh     # Run prisma migrate deploy in one-shot container
    └── rollback.sh    # Re-deploy previous SHA-tagged image
```

## Docker Image Tags

- `ghcr.io/{org}/{project}-{service}:latest` → prod
- `ghcr.io/{org}/{project}-{service}:qa` → QA
- `ghcr.io/{org}/{project}-{service}:{git-sha}` → always push this too (immutable)

## Port Mapping

| Service           | Prod Host Port | QA Host Port |
|-------------------|---------------|--------------|
| customer-web      | 3000          | 4000         |
| admin-web         | 3001          | 4001         |
| backend APIs      | 3002+         | 4002+        |
| postgres          | not exposed   | not exposed  |
| redis             | not exposed   | not exposed  |

Nginx is the only public entry point — containers are never directly internet-accessible.

## Dockerfile Rules

- Multi-stage builds: `deps` → `builder` → `runner`
- Final stage: `node:20-alpine`, non-root user (`USER node`)
- `NODE_ENV=production` set in runner stage
- Never `COPY .env` into an image — inject at runtime via compose `env_file`
- Monorepo context: build from repo root, not the app subdirectory

## docker-compose Rules

- Named volumes for Postgres and Redis — never bind mounts for data
- `restart: unless-stopped` on all services
- Health checks on all services
- All services on an isolated bridge network per stack
- `env_file: .env` per stack — `.env` is written by the deploy GitHub Action from secrets

## Nginx Rules

- SSL termination at Nginx — all container traffic is plain HTTP
- HTTP → HTTPS redirect (301) on all domains
- `proxy_set_header X-Real-IP $remote_addr` so apps see real client IP
- Separate `server {}` block per service — no wildcard routing in prod
- Rate limiting at Nginx level only — do not duplicate in app code

## GitHub Actions CI/CD

**Prod** — triggers on push to `main`:
1. Build all Docker images
2. Push `:latest` and `:{sha}` tags to GHCR
3. SSH into VPS → `cd /srv/prod`
4. Write `.env` from `secrets.PROD_ENV`
5. `docker compose pull`
6. Run `migrate.sh` (prisma migrate deploy in one-shot container)
7. `docker compose up -d --remove-orphans`
8. `docker image prune -f`

**QA** — triggers on push to `qa` branch, same steps using `:qa` tag and `/srv/qa`.

## GitHub Secrets Required

| Secret        | Value                              |
|---------------|------------------------------------|
| `VPS_HOST`    | Hetzner VPS IP                     |
| `VPS_SSH_KEY` | Private key for `deploy` user      |
| `PROD_ENV`    | Full contents of prod `.env` file  |
| `QA_ENV`      | Full contents of QA `.env` file    |

## VPS Security Baseline

- UFW: only ports 22, 80, 443 open externally
- SSH: key-based auth only — `PasswordAuthentication no`
- `deploy` user is in `docker` group — no sudo needed
- Certbot manages SSL — do not manually touch certs
- Postgres and Redis bind to `127.0.0.1` or internal Docker network only

## Adding a New Service

1. Add `Dockerfile` under `infra/docker/`
2. Add service block to both `compose/docker-compose.qa.yml` and `docker-compose.prod.yml`
3. Add `server {}` block to both `nginx/qa.conf` and `nginx/prod.conf`
4. Add build + push step to both GitHub Actions workflows
5. Update port mapping table above

---

## Kubernetes Readiness Rules

> We are NOT on Kubernetes yet. We are on Docker Compose on a Hetzner VPS.
> However, every infra decision must keep K8s migration in mind so it is a
> translation exercise when the time comes — not a rewrite.
>
> Claude must enforce these rules on every infra task without being asked.

### Dockerfiles — always K8s-compatible
- Multi-stage builds only — no single-stage dev-style images in prod
- Final image runs as non-root (`USER node`) — K8s defaults deny root containers
- No hardcoded ports — use `ENV PORT=3000` and `EXPOSE $PORT`
- No state written inside the container — all state goes to volumes or external services
- Health check `HEALTHCHECK` instruction in every Dockerfile — maps to K8s `livenessProbe`

### Environment & Config — always K8s-compatible
- All config via environment variables — no config files baked into images
- Secrets injected at runtime only — maps to K8s `Secret` objects
- Non-secret config injected at runtime only — maps to K8s `ConfigMap` objects
- Never read `.env` files inside app code — use the `config` package which reads `process.env`

### Networking — always K8s-compatible
- Services communicate by **service name** (e.g. `http://api-core:3000`) — never by `localhost`
- This works in Docker Compose (bridge network) and maps directly to K8s `Service` DNS
- Never hardcode IP addresses for inter-service communication

### Data & Volumes — always K8s-compatible
- Postgres and Redis data on named volumes — maps to K8s `PersistentVolumeClaim`
- No app-level file storage on the container filesystem — use `common/storage` (Azure/S3)
- If a service needs to write temp files, use `/tmp` only — never a mounted path

### Health Checks — always K8s-compatible
Every service must expose:
- `GET /health` → liveness (is the process alive?)
- `GET /ready` → readiness (is the service ready to accept traffic? DB connected? Redis connected?)

These are used by Docker Compose health checks today and will map to K8s probes tomorrow.

### Graceful Shutdown — always K8s-compatible

- All NestJS services must handle `SIGTERM` via `OnApplicationShutdown` and drain in-flight requests before exiting
- BullMQ workers must finish the current job before shutting down — no mid-job kills
- Shutdown timeout: 10 seconds max — K8s default `terminationGracePeriodSeconds` is 30

---

## K8s Migration Mapping (for future reference)

> When the time comes, hand this table to Claude Code as the migration brief.

| Current (Compose)            | Future (Kubernetes)                  |
|------------------------------|--------------------------------------|
| `docker-compose.qa.yml`      | K8s namespace `qa` + Helm chart      |
| `docker-compose.prod.yml`    | K8s namespace `prod` + Helm chart    |
| `env_file: .env`             | `Secret` + `ConfigMap`               |
| Named volume (postgres data) | `PersistentVolumeClaim`              |
| `restart: unless-stopped`   | `Deployment` with replica count      |
| Nginx reverse proxy          | `Ingress` + `nginx-ingress` controller|
| Certbot SSL                  | `cert-manager` + Let's Encrypt       |
| `healthcheck:` in compose    | `livenessProbe` + `readinessProbe`   |
| Docker bridge network        | K8s `Service` + DNS                  |
| GitHub Actions SSH deploy    | GitHub Actions + `kubectl apply`     |
| GHCR image registry          | No change — GHCR works with K8s      |
