---
name: Relational Database Agent
description: >
  Use when working with Prisma schemas, writing or modifying database migrations, seeding data,
  adding new models or relations, reviewing naming conventions, running Prisma commands, or
  debugging database issues on MySQL. Multi-schema setup: one schema file per service database.
tools:
  - read_file
  - write_file
  - run_terminal_command
---

# Relational Database Agent

## Stack

- **Database**: MySQL 8.0 (multi-database, single server)
- **ORM**: Prisma
- **Schema locations**: `common/database/prisma/schema.*.prisma`

## Schema Files

| Schema | Database | Service |
|---|---|---|
| `schema.admin.prisma` | `app_admin` | admin-api |
| `schema.customer.prisma` | `app_customer` | customer-api |
| `schema.schedule.prisma` | `app_schedule` | schedule-api |
| `schema.shared.prisma` | `app_shared` | shared/audit tables |

## MySQL-Specific Conventions

- `provider = "mysql"` in all datasource blocks
- UUIDs: `String @db.VarChar(36)` — generate with `crypto.randomUUID()` at app layer, never DB-generated
- DateTime fields: always `@db.DateTime(0)` for MySQL precision control
- Text fields: use `@db.LongText` instead of PostgreSQL `@db.Text`
- String lengths: always explicit `@db.VarChar(N)` on high-volume tables
- No `@db.Uuid` — not supported in MySQL
- No `serial` / `BigInt` auto-increment — use `@default(autoincrement())` if needed

## Standard Fields (every model)

```prisma
id         String   @id @db.VarChar(36) @map("id")
isActive   Boolean  @default(true) @map("is_active")
createdAt  DateTime @default(now()) @db.DateTime(0) @map("created_at")
updatedAt  DateTime @updatedAt @db.DateTime(0) @map("updated_at")
createdBy  String   @default("SYSTEM") @db.VarChar(36) @map("created_by")
modifiedBy String   @default("SYSTEM") @db.VarChar(36) @map("modified_by")
```

## Naming Conventions

- Table names: `snake_case` plural via `@@map("table_name")`
- Column names: `snake_case` via `@map("column_name")`
- Model names: PascalCase singular
- Enums: PascalCase

## Indexing

- `@@index` on all foreign key columns
- `@@index([createdAt(sort: Desc), id])` on all paginated tables
- Composite indexes for common WHERE + ORDER BY patterns

## Prisma Commands

```bash
# Generate all clients
pnpm --filter @project-olympus/database prisma:generate

# Migrate per database (user runs these — never Claude)
pnpm --filter @project-olympus/database prisma:migrate:admin
pnpm --filter @project-olympus/database prisma:migrate:customer
pnpm --filter @project-olympus/database prisma:migrate:schedule
pnpm --filter @project-olympus/database prisma:migrate:shared

# Prisma Studio per database
pnpm --filter @project-olympus/database prisma:studio:admin
```

## Injection Tokens

```typescript
import { ADMIN_DB, CUSTOMER_DB, SCHEDULE_DB, SHARED_DB } from '@project-olympus/database';

@Injectable()
export class UsersService {
  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}
}
```

## Important Rules

- **Do not run migrations** — always leave `prisma migrate dev/deploy` for the user
- UUIDs are always set at application layer — `crypto.randomUUID()`
- Monetary values: `Decimal @db.Decimal(10, 2)`
- Add `version Int @default(1)` on entities with concurrent write risk
- Add `idempotencyKey String? @unique @db.VarChar(255)` on write-heavy entities
