---
description: "Design and add Prisma database models from a business domain description"
agent: "domain-modeler"
argument-hint: "Domain description, e.g. 'ecommerce with products, categories, orders, and payments'"
---

Design and add Prisma models for this domain:

**Domain:** {{ input }}

## Process

1. Read the current schema(s) at `common/database/prisma/schema.*.prisma` — pick the right file for the owning service (see `relational-database.md`)
2. Identify all entities, their fields, and relationships
3. Create Prisma models following conventions:
   - `PascalCase` model names, `snake_case` table/column mapping
   - `String @db.VarChar(36)` IDs generated at the app layer (`crypto.randomUUID()`) — never `@default(uuid())`
   - Audit fields (`createdAt`, `updatedAt`, `createdBy`, `modifiedBy`, `isActive`)
   - Proper indexes on foreign keys and query columns
   - `Decimal @db.Decimal(10,2)` for money, Prisma `enum` for status fields
   - No `String[]`/`Int[]` — MySQL doesn't support Prisma scalar lists; use `Json` or a join table
4. Add seed data for lookup tables in `common/database/prisma/seed.ts`
5. Run `pnpm --filter @project-olympus/database prisma:generate`

Present the model design for review before writing.
