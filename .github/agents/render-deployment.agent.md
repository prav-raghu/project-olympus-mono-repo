---
name: Render Deployment Agent
description: >
  Use when deploying this project to Render.com, updating render.yaml, auditing environment
  variables, diagnosing deploy failures, or onboarding a new project variant onto Render.
  Covers render.yaml generation, env var auditing against AJV schemas and .env.example files,
  local dev setup, post-deploy checklists, and common Render + pnpm monorepo pitfalls.
tools:
  - read_file
  - write_file
  - grep_search
  - run_terminal_command
argument-hint: "Describe what you need: 'generate render.yaml', 'audit env vars', 'local setup', 'fix deploy error: <paste log>'"
---

# Render Deployment Agent

## Architecture Reference

This project runs on Render.com as a Render Blueprint (`render.yaml`). The service map is fixed:

| Render Service | Type | Package filter |
|---|---|---|
| `khula-redis` | Redis | — |
| `khula-customer-api` | Web (Node) | `@khula-metrics/customer-api` |
| `khula-admin-api` | Web (Node) | `@khula-metrics/admin-api` |
| `khula-customer-web` | Web (Node) | `customer-web` |
| `khula-admin-web` | Web (Static) | `admin-web` |

Database: **External Supabase Postgres** — never add a Render Postgres service. `DATABASE_URL` is always `sync: false` and set manually after first deploy.

---

## Local Development Setup

Each backend service has a `.env.example` at its root. Copy it to `.env` and fill in real values before running locally.

```bash
cp apps/backend/customer-api/.env.example apps/backend/customer-api/.env
cp apps/backend/admin-api/.env.example     apps/backend/admin-api/.env
```

### customer-api — `.env.example` reference

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db"
JWT_SECRET="<64-byte hex — node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\">"
JWT_REFRESH_SECRET="<64-byte hex>"
REDIS_URL="redis://127.0.0.1:6379"          # local Redis; Render injects its own URL automatically
IP_BAN_DURATION="36h"
REFRESH_TOKEN_EXPIRY="45m"
AUTH_TOKEN_EXPIRY="10m"
CORS_ORIGIN="http://localhost:4004"          # must include scheme; bare hostnames fail AJV uri format
RATE_LIMIT_WINDOW="20m"
RATE_LIMIT_MAX="150"
PORT="3001"
NODE_ENV="development"
LOG_LEVEL="info"
PEPPER="<32-byte hex — node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\">"
CUSTOMER_WEB_URL="http://localhost:4004"
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:4318/v1/traces"
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="http://localhost:4318/v1/logs"
# Email — use Mailhog locally
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@localhost
# Production only (comment out in dev)
# RESEND_API_KEY="re_..."
# RESEND_FROM="noreply@yourdomain.com"
```

### admin-api — `.env.example` reference

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db"
JWT_SECRET="<64-byte hex>"
JWT_REFRESH_SECRET="<64-byte hex>"
REDIS_URL="redis://127.0.0.1:6379"
IP_BAN_DURATION="36h"
REFRESH_TOKEN_EXPIRY="45m"
AUTH_TOKEN_EXPIRY="10m"
CORS_ORIGIN="http://localhost:4005"          # admin-web dev port
RATE_LIMIT_WINDOW="20m"
RATE_LIMIT_MAX="150"
PORT="3002"
NODE_ENV="development"
LOG_LEVEL="info"
PEPPER="<32-byte hex>"
ADMIN_WEB_URL="http://localhost:4005"
PASSWORD_RESET_EXPIRATION_MINUTES="60"
TWO_FACTOR_ENCRYPTION_KEY="<64 hex chars — randomBytes(32).toString('hex')>"
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:4318/v1/traces"
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT="http://localhost:4318/v1/logs"
# Email — use Mailhog locally
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@localhost
# Production only
# RESEND_API_KEY="re_..."
# RESEND_FROM="noreply@yourdomain.com"
```

### Critical local rules

- `REDIS_URL` **must** be `redis://127.0.0.1:6379` locally. Using any other format (e.g. `https://...`) causes ioredis to fail all connection attempts, exhaust the retry strategy, and permanently close — resulting in `Connection is closed` errors on the first Redis call.
- `CORS_ORIGIN` **must** include the scheme (`http://` or `https://`). A bare hostname like `localhost:4004` fails the AJV `format: 'uri'` check and crashes the API on startup.
- `DATABASE_URL` must point to a running local Postgres instance. Default: `postgresql://postgres:postgres@localhost:5432/app_db`.

---

## Canonical render.yaml Template

When generating or updating `render.yaml`, always use this exact structure. Do not add fields not shown here.

```yaml
services:
  # ─── Redis ─────────────────────────────────────────────────────────────────
  - type: redis
    name: khula-redis
    plan: free
    region: oregon
    ipAllowList: []

  # ─── Customer API (NestJS) ──────────────────────────────────────────────────
  - type: web
    name: khula-customer-api
    runtime: node
    plan: free
    region: oregon
    buildCommand: export HUSKY=0 NODE_ENV=development && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@khula-metrics/customer-api...
    startCommand: pnpm run --filter @khula-metrics/database prisma:migrate:deploy && pnpm run --filter @khula-metrics/customer-api start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        fromService:
          type: redis
          name: khula-redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: REFRESH_TOKEN_EXPIRY
        value: 45m
      - key: AUTH_TOKEN_EXPIRY
        value: 10m
      - key: RATE_LIMIT_WINDOW
        value: 20m
      - key: RATE_LIMIT_MAX
        value: "150"
      - key: IP_BAN_DURATION
        value: 36h
      - key: LOG_LEVEL
        value: info
      - key: OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
        value: http://localhost:4318/v1/traces
      - key: OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
        value: http://localhost:4318/v1/logs
      - key: CORS_ORIGIN
        sync: false
      - key: CUSTOMER_WEB_URL
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: RESEND_FROM
        sync: false
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
      - key: PEPPER
        generateValue: true

  # ─── Admin API (NestJS) ──────────────────────────────────────────────────────
  - type: web
    name: khula-admin-api
    runtime: node
    plan: free
    region: oregon
    buildCommand: export HUSKY=0 NODE_ENV=development && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@khula-metrics/admin-api...
    startCommand: pnpm run --filter @khula-metrics/admin-api start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        fromService:
          type: redis
          name: khula-redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: TWO_FACTOR_ENCRYPTION_KEY
        sync: false
      - key: INTERNAL_API_KEY
        generateValue: true
      - key: REFRESH_TOKEN_EXPIRY
        value: 45m
      - key: AUTH_TOKEN_EXPIRY
        value: 10m
      - key: PASSWORD_RESET_EXPIRATION_MINUTES
        value: "60"
      - key: RATE_LIMIT_WINDOW
        value: 20m
      - key: RATE_LIMIT_MAX
        value: "150"
      - key: IP_BAN_DURATION
        value: 36h
      - key: LOG_LEVEL
        value: info
      - key: OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
        value: http://localhost:4318/v1/traces
      - key: OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
        value: http://localhost:4318/v1/logs
      - key: CORS_ORIGIN
        sync: false
      - key: ADMIN_WEB_URL
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: RESEND_FROM
        sync: false
      - key: PEPPER
        generateValue: true

  # ─── Customer Web (Angular) ─────────────────────────────────────────────────
  - type: web
    name: khula-customer-web
    runtime: node
    plan: free
    region: oregon
    buildCommand: export HUSKY=0 NODE_ENV=development && pnpm install --frozen-lockfile && pnpm turbo run build --filter=customer-web...
    staticPublishPath: apps/frontend/customer-web/dist/browser
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: NODE_ENV
        value: production
      - key: APP_NAME
        value: Khula Metrics
      - key: API_BASE_URL
        sync: false
      - key: STRIPE_PUBLISHABLE_KEY
        sync: false

  # ─── Admin Web (Vite SPA — Static Site) ─────────────────────────────────────
  - type: web
    runtime: static
    name: khula-admin-web
    buildCommand: export HUSKY=0 NODE_ENV=development && pnpm install --frozen-lockfile && pnpm turbo run build --filter=admin-web...
    staticPublishPath: apps/frontend/admin-web/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_APP_NAME
        value: Khula Admin
      - key: VITE_API_BASE_URL
        sync: false
```

---

## Env Var Audit Procedure

When asked to audit or update env vars, do the following steps in order.

### Step 0 — Read the .env.example files

The `.env.example` for each service is the living record of every variable the service needs locally. Read them first:

- `apps/backend/customer-api/.env.example`
- `apps/backend/admin-api/.env.example`

Cross-reference these against the AJV env schema (Step 1) and render.yaml (Step 2). If a var appears in `.env.example` but not in render.yaml, it is missing and must be added.

### Step 1 — Read the AJV env schemas

Read `src/config/env.config.ts` in each API service. The `required` array and `properties` object are the source of truth for what Render must have set.

Key constraints to watch for:
- `format: 'uri'` — value **must** include scheme (`https://`). Bare hostnames fail.
- `format: 'email'` — must be a valid email address.
- `minLength` / `maxLength` — e.g. `TWO_FACTOR_ENCRYPTION_KEY` must be exactly 64 hex chars.
- `pattern: '^[0-9a-fA-F]+'` — hex-only strings.
- `enum: ['development', 'production']` — only these two values for `NODE_ENV`.

### Step 2 — Check render.yaml coverage

For every key in `required[]`, confirm render.yaml has either:
- `value:` (static, safe to hardcode)
- `generateValue: true` (Render generates a secret on first deploy)
- `fromService:` (injected from another Render service)
- `sync: false` (user must paste in manually — flag these)

### Step 3 — Cross-service URL deps

These vars are `sync: false` because they depend on URLs that don't exist until after first deploy. Provide the user this checklist:

| Service | Variable | Value to set |
|---|---|---|
| `khula-customer-api` | `CORS_ORIGIN` | `https://<customer-web-url>` |
| `khula-customer-api` | `CUSTOMER_WEB_URL` | `https://<customer-web-url>` |
| `khula-customer-api` | `DATABASE_URL` | Supabase pooler URL |
| `khula-customer-api` | `RESEND_API_KEY` | Resend API key |
| `khula-customer-api` | `RESEND_FROM` | Verified sender email |
| `khula-customer-api` | `STRIPE_SECRET_KEY` | Stripe secret key |
| `khula-customer-api` | `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `khula-admin-api` | `CORS_ORIGIN` | `https://<admin-web-url>` |
| `khula-admin-api` | `ADMIN_WEB_URL` | `https://<admin-web-url>` |
| `khula-admin-api` | `DATABASE_URL` | Same Supabase pooler URL |
| `khula-admin-api` | `TWO_FACTOR_ENCRYPTION_KEY` | 64 hex chars (see below) |
| `khula-admin-api` | `RESEND_API_KEY` | Resend API key |
| `khula-admin-api` | `RESEND_FROM` | Verified sender email |
| `khula-customer-web` | `API_BASE_URL` | `https://<customer-api-url>` |
| `khula-customer-web` | `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `khula-admin-web` | `VITE_API_BASE_URL` | `https://<admin-api-url>` |

Generate `TWO_FACTOR_ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**customer-web proxy note**: `API_BASE_URL` must be `https://` — not localhost.

**admin-web is a static site** — `VITE_API_BASE_URL` is baked into the bundle at build time. After setting it, trigger a manual redeploy of `khula-admin-web`.

---

## Adding a New Service

When a new NestJS service is added to the monorepo (e.g. `schedule-api`):

1. Create a `.env.example` at `apps/backend/<service-name>/.env.example` modelled on the customer-api example above — it must include all vars declared in `required[]` of its `env.config.ts`.
2. Read its `src/config/env.config.ts` to get the full list of required environment variables.
3. Add a new `type: web` block to `render.yaml` following the customer-api pattern.
4. Set `buildCommand` filter to `@khula-metrics/<service-name>...` (the `...` is required — it includes dependencies).
5. Set `startCommand` to include `prisma:migrate:deploy` only if this service owns DB migrations. Only one service should run migrations.
6. Wire `REDIS_URL` via `fromService:` if the service uses Redis.
7. Mark all cross-service URLs and secrets as `sync: false`.
8. Run the env var audit procedure above on the new service.

---

## Build Script Rules

### pnpm monorepo + Turbo

The build command pattern for every API service:
```
export HUSKY=0 NODE_ENV=development && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@khula-metrics/<service>...
```

- `HUSKY=0` — disables git hooks in CI
- `NODE_ENV=development` — required so `devDependencies` are installed (`--frozen-lockfile` respects the current lockfile; `NODE_ENV=production` would skip devDeps)
- `--filter=<package>...` — the `...` (three dots) includes the package AND all its workspace dependencies

### Non-TS assets in dist

`tsc` only compiles `.ts` files. Any static asset read at runtime with `fs.readFileSync` or `path.join(__dirname, ...)` must be explicitly copied in the build script.

**Detection:** Grep for `readFileSync` or `__dirname` in service `src/` directories. If they reference non-`.ts` files (JSON, HTML, etc.), the build script needs a copy step.

**Fix pattern** (no extra package needed — uses Node.js built-in):
```json
"build": "tsc -p tsconfig.build.json && node -e \"require('fs').cpSync('src/data','dist/data',{recursive:true})\""
```

Common cases in this project:
- `customer-api/src/data/prohibited-email-domains.json` → copy `src/data` → `dist/data`
- `email/src/templates/` → already handled via `copyfiles`

### Prisma config must not throw on missing DATABASE_URL

`prisma.config.ts` is evaluated at build time by `prisma generate`. Render does not inject `DATABASE_URL` during the build phase (only at runtime). The config **must** use a fallback:

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "./prisma/schema.prisma",
    migrations: { path: "./prisma/migrations", seed: "tsx prisma/seed.ts" },
    datasource: {
        url: process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build",
    },
});
```

Never use `env("DATABASE_URL")` — the `env()` helper from Prisma eagerly validates and will throw during build.

---

## render.yaml Field Rules

These rules are fixed by the current Render Blueprint spec. Violating them causes spec validation errors before any build runs.

| Field | Rule |
|---|---|
| `type: static` | **Does not exist.** Use `type: web` + `runtime: static` |
| `nodeVersion:` | **Not a valid service field.** Remove it. |
| `envVarGroups:` on a service | **Not valid.** Inline all vars directly under `envVars:` |
| `preDeployCommand:` | **Not supported on free tier.** Move migrations to `startCommand`. |
| `region:` on static sites | **Not allowed.** Static sites cannot have a region. |
| `DATABASE_URL` | Always `sync: false`. Never hardcode. Never `generateValue`. |
| Secrets | Always `sync: false`. Never commit values to render.yaml. |

---

## Post-Deploy Checklist (First Deploy)

After the first deploy, perform these steps in order:

1. **Set DATABASE_URL** on both `khula-customer-api` and `khula-admin-api`
   - Use the Supabase connection pooler URL (Session mode, port 5432)
   - Format: `postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

2. **Set cross-service URLs** — once each service has a public URL, set the URL vars listed in the env var table above. Remember: all URL values must include `https://`.

3. **Set all secrets** — `RESEND_API_KEY`, `RESEND_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`.

4. **Redeploy admin-web** — after setting `VITE_API_BASE_URL`, trigger a manual redeploy so the value is baked into the Vite bundle.

5. **Register Stripe webhook** — in the Stripe dashboard, create a webhook pointing to `https://<customer-api-url>/api/v1/billing/webhook` and copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

6. **Trigger redeploy of both APIs** — environment variable changes on APIs take effect on the next deploy, not immediately.

---

## Common Failure Patterns & Fixes

### `Redis error: Connection is closed` (at runtime on first Redis call)

ioredis exhausts its retry strategy and moves the client to `end` state. The client object is not `null` so guards like `if (this.redis.client)` pass, but any command throws. Causes:

1. **Bad `REDIS_URL` in local `.env`** — the `.env.example` placeholder `https://redis.randomhost.io` is not a valid Redis URL. Fix: set `REDIS_URL="redis://127.0.0.1:6379"` locally.
2. **Render cold start race** — Redis service isn't ready before the API first tries to connect. Mitigated by using `isConnected` (checks `client.status === 'ready'`) instead of null checks, with try/catch on every raw client call.

`RedisService` exposes `isConnected: boolean` getter — all service code must guard with `this.redis.isConnected` not `this.redis.client`.

### `Redis connection error: connect ECONNREFUSED 127.0.0.1:6379` (on Render)

`RedisService` fell back to `REDIS_HOST`/`REDIS_PORT` because `REDIS_URL` was not set or not picked up. Fix: ensure `REDIS_URL` is wired via `fromService:` in render.yaml and that `redis.service.ts` checks `process.env.REDIS_URL` first.

### `CORS_ORIGIN must match format "uri"`

The value is missing the `https://` scheme or is set to a bare hostname. Fix: set it to the full URL including scheme (`https://khula-customer-web.onrender.com`).

### `ENOENT: no such file or directory, open '.../dist/data/something.json'`

A JSON or static file is read via `readFileSync` at runtime but wasn't copied by tsc. Fix: add `cpSync` to the build script (see Build Script Rules above).

### `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`

`prisma.config.ts` uses `env("DATABASE_URL")` which throws at build time. Fix: replace with `process.env.DATABASE_URL ?? "fallback-url"`.

### `Property 'x' is private and only accessible within class 'Y'`

A service is calling a private method of a shared package class (e.g. `EmailService.sendMail`). Fix: add the required public method to the shared class with a specific name matching the use case. Never make `sendMail` public — add named wrappers.

### `field nodeVersion not found in type file.Service`

`nodeVersion` is not a valid Render Blueprint field. Remove it from the service block.

### `unknown type "static"`

`type: static` no longer exists in the Render Blueprint spec. Use `type: web` with `runtime: static`.

### Turbo only builds 1 package instead of the full dependency tree

The build filter is missing the `...` suffix. `--filter=@khula-metrics/customer-api` builds only that package. `--filter=@khula-metrics/customer-api...` builds it plus all its workspace dependencies.

### customer-web proxy returns 500 / falls back to localhost

`next.config.mjs` rewrites use `process.env.API_BASE_URL`. If this env var is not set on the Render service, the rewrite destination falls back to `http://localhost:3001` and all API calls fail. Fix: set `API_BASE_URL=https://<customer-api-url>` on the `khula-customer-web` service.

---

## Adding a New Project with This Architecture

When this architecture is used on a fresh project (different product name, different services):

1. Copy `render.yaml` from this project as a starting template.
2. Rename all `khula-*` service names and package names to match the new project.
3. Copy both `.env.example` files and update for the new project's variable names and ports.
4. Run the env var audit: read each service's `env.config.ts` and ensure every `required[]` key is covered in render.yaml.
5. Check for `readFileSync` of non-TS files in each service's `src/` and add `cpSync` steps as needed.
6. Verify `prisma.config.ts` uses the `?? fallback` pattern.
7. Verify `useSearchParams` is always inside a `<Suspense>` boundary.
8. Verify static site uses `type: web` + `runtime: static` (no `region:`, no `nodeVersion:`).
9. Update `render.yaml` header comments with the new project name and any changed post-deploy instructions.
