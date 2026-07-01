---
paths:
  - "common/database/prisma/**"
  - "common/database/src/**"
---

# Prisma Schema Rules

You are working on the shared database package. This project is **MySQL**, multi-schema (one Prisma schema file per service database). Every change here can affect one or more services depending on which `schema.*.prisma` file it's in.

## Every model must have all six base fields

```prisma
id         String   @id @db.VarChar(36) @map("id")
isActive   Boolean  @default(true) @map("is_active")
createdAt  DateTime @default(now()) @db.DateTime(0) @map("created_at")
updatedAt  DateTime @updatedAt @db.DateTime(0) @map("updated_at")
createdBy  String   @default("SYSTEM") @db.VarChar(36) @map("created_by")
modifiedBy String   @default("SYSTEM") @db.VarChar(36) @map("modified_by")
```

No exceptions.

## Naming

- Model names: `PascalCase` singular
- Table mapping `@@map`: `snake_case` plural
- Column mapping `@map`: `snake_case`
- Foreign keys: `{relatedTable}Id` field mapped to `{related_table}_id`

## MySQL constraints — do not violate

- IDs are `String @db.VarChar(36)`, generated in application code with `crypto.randomUUID()` — never `@default(uuid())`
- No Prisma scalar list fields (`String[]`, `Int[]`) — use a join table or a `Json` column
- `@db.LongText` for unbounded text, not `@db.Text`
- No `@db.Uuid`
- Every `DateTime` gets `@db.DateTime(0)`

## Every model needs a cursor pagination index

```prisma
@@index([createdAt(sort: Desc), id])
```

## After every schema change — required commands

```bash
pnpm --filter @project-olympus/database prisma:validate
pnpm --filter @project-olympus/database prisma:generate
```

## Never

- Never run `prisma migrate dev` or `prisma db push` — the developer runs migrations
- Never hardcode connection strings
- Never skip the `@@map` on a model
- Never add a field without `@map`
- Never write `String[]`/`Int[]` — not supported on MySQL
