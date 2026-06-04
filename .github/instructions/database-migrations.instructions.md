---
applyTo: "common/database/prisma/**"
description: "Database migration strategy - safe migration patterns, zero-downtime deploys, and K8s execution"
---

## Two Commands — Know When to Use Each

| Command | When | What it does |
|---------|------|-------------|
| `prisma migrate dev` | Local development only | Creates a new migration file AND applies it |
| `prisma migrate deploy` | CI/CD, staging, production | Applies pending migrations only — never creates new files |

NEVER run `prisma migrate dev` in CI, staging, or production. It can prompt interactively and may overwrite migration history.

## Migration File Discipline

- Migration files are **immutable** once merged to `main` — never edit a migration file that has been applied to any environment
- Each migration must be **atomic** — one logical change per migration
- Name migrations descriptively: `add_products_table`, `add_slug_to_products`, `drop_legacy_sessions`
- Keep migrations **backward compatible** with the previous code version — the running app must survive the migration before the new app version deploys

## Zero-Downtime Migration Patterns

### Adding a column (safe)

```sql
ALTER TABLE products ADD COLUMN slug VARCHAR(255);
```

Prisma handles this natively. The existing app version ignores the new column.

### Making a NOT NULL column (safe via two migrations)

Never add `NOT NULL` without a default in a single migration on a table with existing rows.

**Migration 1** — add nullable:

```prisma
slug String? @map("slug") @db.VarChar(255)
```

**Migration 2** (after backfill has run) — make required:

```prisma
slug String @map("slug") @db.VarChar(255)
```

Between migrations, run a backfill job via BullMQ or a one-off script.

### Renaming a column (never directly)

Direct renames break the running app immediately. Use the expand-contract pattern:

**Phase 1** — add the new column, copy data:

```sql
ALTER TABLE products ADD COLUMN new_name VARCHAR(255);
UPDATE products SET new_name = old_name;
```

**Phase 2** — deploy new app version that reads `new_name`

**Phase 3** — drop old column in a follow-up migration after confirming deployment

### Renaming a table

Same as column: add new table, dual-write, migrate reads, remove old table. Never rename in one step.

### Dropping a column or table

Only after confirming no running code references it. Add `@deprecated` tag in a PR comment, deploy a version that removes all references, then drop in the next migration.

### Adding an index on a large table

Standard `CREATE INDEX` takes an `ACCESS EXCLUSIVE` lock. Use `CREATE INDEX CONCURRENTLY` instead:

```sql
-- In migration file, use raw SQL for concurrent index creation
CREATE INDEX CONCURRENTLY idx_products_slug ON products (slug);
```

Add this via a custom migration SQL file rather than a Prisma `@@index` when the table has > 1M rows.

## Backfill Pattern

When a migration adds a column that needs populating from existing data:

1. Add the column as nullable in the migration
2. Create a BullMQ job `backfill-{column}` in `schedule-api`
3. The job processes rows in batches of 500 using cursor-based iteration
4. Mark the job idempotent — safe to re-run if it fails midway
5. Add a follow-up migration to make the column `NOT NULL` after backfill completes

```typescript
public async backfillSlugs(): Promise<void> {
  let cursor: string | undefined;
  do {
    const batch = await this.prisma.product.findMany({
      where: { slug: null },
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, name: true },
    });
    if (batch.length === 0) break;
    await this.prisma.$transaction(
      batch.map((p) =>
        this.prisma.product.update({
          where: { id: p.id },
          data: { slug: generateSlug(p.name) },
        })
      )
    );
    cursor = batch[batch.length - 1].id;
  } while (true);
}
```

## K8s Execution Strategy

Run migrations as a **Kubernetes Job** (init container pattern) that completes before the new app Pods start:

```yaml
# k8s/migrations-job.yaml
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
          image: {{ .Values.image }}
          command: ["pnpm", "--filter", "@project-olympus/database", "prisma:deploy"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
```

The deployment's `initContainers` or Helm hooks wait for this Job to complete before rolling out new Pods.

NEVER run migrations inside the app `main.ts` on startup — multiple replicas will race.

## Required npm Scripts (`common/database/package.json`)

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

## CI/CD Migration Checklist

- [ ] `prisma validate` passes in CI on every PR
- [ ] Migration file is present for every schema change (no direct DB edits)
- [ ] New NOT NULL columns have a default or are added nullable with a backfill plan
- [ ] Large table index additions use `CREATE INDEX CONCURRENTLY`
- [ ] Column/table renames follow expand-contract, not direct rename
- [ ] `prisma migrate deploy` is run by K8s Job before new app Pods start
