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

`createdBy`/`modifiedBy` hold the acting user's id (or `"SYSTEM"` for non-interactive writes) — always set explicitly by the service layer on create/update, never left to the DB default in a user-initiated request. `createdAt`/`updatedAt` are the DB-managed timestamps; `createdBy`/`modifiedBy` are the DB-agnostic "who" companion to them — a model with one pair and not the other is a bug, not a style choice.

### Two sanctioned exceptions — narrow, and only for these shapes

1. **Truly append-only, never updated** (a pure event/audit-trail row): drop `updatedAt`, `createdBy`, `modifiedBy` — there is no "who modified this" because nothing ever does. Still gets `id`, `createdAt`. Join tables and lookup tables fall in this category too.

2. **System-owned, never human-actioned, but internally mutated** (e.g. a background worker updates retry/status fields, no user-facing endpoint ever writes to it): keep `updatedAt` since the row *does* change, but `createdBy`/`modifiedBy` may be dropped — they would only ever read `"SYSTEM"`, which carries no information. See `WebhookDelivery` in `schema.admin.prisma`/`schema.shared.prisma`: a delivery worker updates `status`/`attemptCount`/`nextRetryAt` on retries, so it keeps `updatedAt`, but no human or per-request actor ever writes to it, so it has no `createdBy`/`modifiedBy`.

Anything reachable from a user-facing request — even indirectly, even a nullable/optional `createdBy` on a system-registered resource — keeps the full six. Do not drop `modifiedBy` on a model just because it originated as a system integration; drop it only when category 1 or 2 above genuinely applies.

## Naming

- Model names: `PascalCase` singular
- Table mapping `@@map`: `snake_case` plural
- Column mapping `@map`: `snake_case`
- Foreign keys: `{relatedTable}Id` field mapped to `{related_table}_id`

## Relations

Always define both sides. Use `onDelete: Cascade` for child records, `onDelete: SetNull` for optional references. Always add `@@index` on every foreign key column.

```prisma
model OrderItem {
  id      String @id @db.VarChar(36) @map("id")
  orderId String @db.VarChar(36) @map("order_id")
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("order_items")
}
```

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

## Composite indexes for common query patterns

```prisma
@@index([categoryId, isActive, createdAt(sort: Desc)])
@@index([userId, status, createdAt(sort: Desc)])
```

## Optimistic locking

For entities with concurrent write risk (orders, inventory, cart, payments):

```prisma
version Int @default(1) @map("version")
```

## Idempotency

For write-heavy transactional entities:

```prisma
idempotencyKey String? @unique @db.VarChar(255) @map("idempotency_key")
```

## Seed data

```typescript
export async function populateCategories(prisma: PrismaClient): Promise<void> {
  await prisma.productCategory.createMany({
    data: [
      { id: crypto.randomUUID(), name: 'Category A', slug: 'category-a' },
      { id: crypto.randomUUID(), name: 'Category B', slug: 'category-b' },
    ],
    skipDuplicates: true,
  });
}
```

Call seed functions from `main()` in `common/database/prisma/seed.ts`.

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
