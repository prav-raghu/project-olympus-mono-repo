---
applyTo: "common/database/prisma/**"
description: "Prisma schema conventions — MySQL multi-schema setup, naming, standard fields, indexes, and relations"
---

When editing Prisma schema files:

- Table names: `snake_case` plural via `@@map("table_name")`
- Column names: `snake_case` via `@map("column_name")`
- Model names: PascalCase singular
- Provider is always `"mysql"` — never PostgreSQL
- One schema file per database: `schema.admin.prisma`, `schema.customer.prisma`, `schema.schedule.prisma`, `schema.shared.prisma`

Every model MUST include these standard fields:

```prisma
id         String   @id @db.VarChar(36) @map("id")
isActive   Boolean  @default(true) @map("is_active")
createdAt  DateTime @default(now()) @db.DateTime(0) @map("created_at")
updatedAt  DateTime @updatedAt @db.DateTime(0) @map("updated_at")
createdBy  String   @default("SYSTEM") @db.VarChar(36) @map("created_by")
modifiedBy String   @default("SYSTEM") @db.VarChar(36) @map("modified_by")
```

MySQL-specific rules:
- UUIDs: `String @db.VarChar(36)` — always generated at app layer (`crypto.randomUUID()`)
- DateTime: always add `@db.DateTime(0)` for precision control
- Text: `@db.LongText` not `@db.Text` (MySQL difference)
- Never use `@db.Uuid` (PostgreSQL only)
- Explicit `@db.VarChar(N)` on all string columns in high-volume tables
- Monetary values: `Decimal @db.Decimal(10, 2)`

Indexes:
- `@@index` on all foreign key columns
- `@@index([createdAt(sort: Desc), id])` on all paginated tables
- Composite indexes for common WHERE + ORDER BY patterns

Concurrent write entities:
- Add `version Int @default(1) @map("version")`
- Add `idempotencyKey String? @unique @db.VarChar(255) @map("idempotency_key")`

After schema changes, run:
`pnpm --filter @project-olympus/database prisma:generate`

Never run migrations — leave `prisma migrate dev/deploy` for the user.
