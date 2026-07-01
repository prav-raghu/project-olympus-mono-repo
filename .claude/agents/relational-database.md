---
name: relational-database
description: Use when working with Prisma schemas at the operations level — writing or modifying migrations, seeding data, reviewing naming conventions for tables/columns, running Prisma commands, or debugging database issues including query performance and connection problems on MySQL.
tools: Read, Write, Bash, Grep, Glob
model: inherit
---

## Stack

MySQL 8.0 (multi-database, single server), Prisma ORM. Multi-schema setup — one schema file per service database, each with its own generated client.

## Schema files

| Schema | Database | Service |
|---|---|---|
| `schema.admin.prisma` | `app_admin` | admin-api |
| `schema.customer.prisma` | `app_customer` | customer-api |
| `schema.schedule.prisma` | `app_schedule` | schedule-api |
| `schema.shared.prisma` | `app_shared` | shared/audit tables |

All live under `common/database/prisma/`.

## MySQL-specific conventions

- `provider = "mysql"` in every datasource block — never PostgreSQL
- UUIDs: `String @db.VarChar(36)` — generated with `crypto.randomUUID()` at the application layer, never DB-generated (`@default(uuid())` is a Postgres-style pattern and must not appear in this schema)
- DateTime fields: always `@db.DateTime(0)` for MySQL precision control
- Long text fields: `@db.LongText`, not PostgreSQL's `@db.Text`
- String lengths: always explicit `@db.VarChar(N)` on high-volume tables
- No `@db.Uuid` — not supported on MySQL
- No Prisma scalar list fields (`String[]`, `Int[]`) — MySQL doesn't support them. Use a join table or a `Json` column instead
- No `serial` auto-increment — use `@default(autoincrement())` only if a numeric surrogate key is genuinely required; default to UUID `String` PKs

## Standard fields (every model)

```prisma
id         String   @id @db.VarChar(36) @map("id")
isActive   Boolean  @default(true) @map("is_active")
createdAt  DateTime @default(now()) @db.DateTime(0) @map("created_at")
updatedAt  DateTime @updatedAt @db.DateTime(0) @map("updated_at")
createdBy  String   @default("SYSTEM") @db.VarChar(36) @map("created_by")
modifiedBy String   @default("SYSTEM") @db.VarChar(36) @map("modified_by")
```

## Naming conventions

| Element | Convention | Example |
|---|---|---|
| Database name | `snake_case` | `app_admin` |
| Model name | `PascalCase` singular | `AppointmentSlot` |
| Table mapping (`@@map`) | `snake_case` plural | `appointment_slots` |
| Column mapping (`@map`) | `snake_case` | `user_id`, `created_at` |
| Enums | `PascalCase` | `OrderStatus` |

```prisma
model UserProfile {
  id        String   @id @db.VarChar(36) @map("id")
  userId    String   @unique @db.VarChar(36) @map("user_id")
  firstName String   @db.VarChar(100) @map("first_name")
  lastName  String   @db.VarChar(100) @map("last_name")
  createdAt DateTime @default(now()) @db.DateTime(0) @map("created_at")
  updatedAt DateTime @updatedAt @db.DateTime(0) @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@map("user_profiles")
}
```

## Indexing

`@@index` on all foreign key columns. `@@index([createdAt(sort: Desc), id])` on every model serving a paginated/cursor list. Composite indexes for common WHERE + ORDER BY patterns.

## Prisma commands

```bash
# Generate all clients (run after every schema change, before touching service code)
pnpm --filter @project-olympus/database prisma:generate

# Validate schema syntax (run in CI before any deploy)
pnpm --filter @project-olympus/database prisma:validate

# Migrate per database — the developer runs these, never Claude
pnpm --filter @project-olympus/database prisma:migrate:admin
pnpm --filter @project-olympus/database prisma:migrate:customer
pnpm --filter @project-olympus/database prisma:migrate:schedule
pnpm --filter @project-olympus/database prisma:migrate:shared

# Prisma Studio per database
pnpm --filter @project-olympus/database prisma:studio:admin
```

## Service domain boundaries

| Service | Schema | Domain tables |
|---|---|---|
| `customer-api` | `schema.customer.prisma` | customer-facing entities |
| `admin-api` | `schema.admin.prisma` | admin/management entities |
| `schedule-api` | `schema.schedule.prisma` | scheduling, appointments, jobs |
| `api-gateway` | `schema.shared.prisma` | shared/cross-cutting (audit, feature flags) |

Do not cross domain boundaries in a single query — use service-to-service HTTP calls (`external-api.md` pattern) instead of reaching across schemas.

## Injection tokens

```typescript
import { ADMIN_DB, CUSTOMER_DB, SCHEDULE_DB, SHARED_DB } from '@project-olympus/database';

@Injectable()
export class UsersService {
  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}
}
```

## Migration rules

Never modify an existing migration — always create a new one. Names must be descriptive: `add_user_profile_table`, `add_index_to_orders_user_id`. Every schema change requires a migration. Test on dev before staging or production. See `database-migrations.md` for zero-downtime patterns and the K8s execution strategy.

## Important rules

Do not run migrations — always leave `prisma migrate dev`/`deploy` for the user. UUIDs are always set at the application layer — `crypto.randomUUID()`. Monetary values: `Decimal @db.Decimal(10, 2)`. Add `version Int @default(1)` on entities with concurrent write risk. Add `idempotencyKey String? @unique @db.VarChar(255)` on write-heavy entities.

## Seeding

Seed files live in `common/database/prisma/seed.ts`, typed Prisma client, never `any`:

```typescript
import { PrismaClient } from '@prisma/client/admin';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { id: crypto.randomUUID(), email: 'admin@example.com', name: 'Admin User' },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```
