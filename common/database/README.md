# @project-olympus/database

Prisma + MySQL multi-schema database package. Provides a NestJS `DatabaseModule` with injectable Prisma clients for each service database.

## Databases

| Token | Database | Schema file |
| --- | --- | --- |
| `ADMIN_DB` | `app_admin` | `prisma/schema.admin.prisma` |
| `CUSTOMER_DB` | `app_customer` | `prisma/schema.customer.prisma` |
| `SCHEDULE_DB` | `app_schedule` | `prisma/schema.schedule.prisma` |
| `SHARED_DB` | `app_shared` | `prisma/schema.shared.prisma` |

## Usage

Import `DatabaseModule` in your `AppModule` (it is global — import once):

```typescript
import { DatabaseModule, ADMIN_DB } from '@project-olympus/database';

@Module({ imports: [DatabaseModule] })
export class AppModule {}
```

Inject the Prisma client in a service:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@prisma/client/admin';

@Injectable()
export class UsersService {
  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}
}
```

## Commands

```bash
# Generate all Prisma clients (run after any schema change)
pnpm --filter @project-olympus/database prisma:generate

# Open Prisma Studio for a database
pnpm --filter @project-olympus/database prisma:studio:admin
pnpm --filter @project-olympus/database prisma:studio:customer
pnpm --filter @project-olympus/database prisma:studio:schedule
pnpm --filter @project-olympus/database prisma:studio:shared

# Run migrations (do not automate — run manually)
pnpm --filter @project-olympus/database prisma:migrate:admin
pnpm --filter @project-olympus/database prisma:migrate:customer
pnpm --filter @project-olympus/database prisma:migrate:schedule
pnpm --filter @project-olympus/database prisma:migrate:shared

# Seed shared database
pnpm --filter @project-olympus/database prisma:seed
```

## Environment

```env
DATABASE_URL_ADMIN=mysql://appuser:apppassword@localhost:3306/app_admin
DATABASE_URL_CUSTOMER=mysql://appuser:apppassword@localhost:3306/app_customer
DATABASE_URL_SCHEDULE=mysql://appuser:apppassword@localhost:3306/app_schedule
DATABASE_URL_SHARED=mysql://appuser:apppassword@localhost:3306/app_shared
```

## Schema conventions

- Provider: `mysql` on all schemas
- UUIDs: `String @db.VarChar(36)` — generated at app layer via `crypto.randomUUID()`
- DateTime: always `@db.DateTime(0)`
- Every model includes: `id`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `modifiedBy`
- Soft delete: set `isActive = false` — never hard delete via API
