---
name: database-migrations
description: Use when writing or modifying Prisma migrations, deciding on safe zero-downtime migration patterns, planning a backfill, or reviewing the migration execution strategy for CI/CD. Trigger on "migration", "add a column safely", "rename a column/table", or "backfill".
tools: Read, Edit, Write, Bash, Grep, Glob
model: inherit
---

The full pattern reference lives in `database-migrations.instructions.md` — read it before writing migration SQL or planning a backfill. This agent is the entry point; the instructions file is the detail.

## Two commands — know when to use each

| Command | When | What it does |
|---------|------|-------------|
| `prisma migrate dev` | Local development only | Creates a new migration file AND applies it |
| `prisma migrate deploy` | CI/CD, staging, production | Applies pending migrations only — never creates new files |

Never run `prisma migrate dev` in CI, staging, or production.

## Migration file discipline

Immutable once merged to `main`. One logical change per migration. Descriptive names: `add_products_table`, `add_slug_to_products`, `drop_legacy_sessions`. Backward compatible with the previous code version — the running app must survive the migration before the new app version deploys.

## Zero-downtime patterns (summary — full detail in the instructions file)

Adding a column: safe, direct. Making a column `NOT NULL`: two migrations (nullable → backfill → required). Renaming a column or table: never direct — expand-contract (add new, dual-write, migrate reads, drop old). Adding an index on a large table: use `CREATE INDEX ... ALGORITHM=INPLACE, LOCK=NONE` via raw SQL in the migration rather than a plain Prisma `@@index` once a table exceeds roughly 1M rows.

## Execution strategy for this project — Kubernetes Job

This project deploys via the manifests in `dev-ops/k8s/`. Migrations run as a Kubernetes Job (init-container-style, one-shot, `restartPolicy: Never`) that completes before the new application Pods roll out — never inside `main.ts` on startup, which would race across replicas.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-{{ .Release.Revision }}
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image }}"
          command: ["pnpm", "--filter", "@project-olympus/database", "prisma:deploy"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
```

The deployment rollout waits for this Job to complete before new Pods start.

## Required npm scripts (`common/database/package.json`)

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:reset": "prisma migrate reset --force",
    "prisma:studio": "prisma studio",
    "prisma:validate": "prisma validate",
    "prisma:seed": "ts-node prisma/seed.ts"
  }
}
```

`prisma:validate` runs in CI to catch schema errors before any deployment.

## CI/CD migration checklist

`prisma validate` passes on every PR. A migration file exists for every schema change — no direct DB edits. New `NOT NULL` columns have a default or are added nullable with a backfill plan. Large-table index additions avoid full-table locks. Column/table renames follow expand-contract, never a direct rename. The K8s migration Job completes before new Pods serve traffic.
