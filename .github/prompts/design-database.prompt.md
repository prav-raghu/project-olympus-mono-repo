---
description: "Design and add Prisma database models from a business domain description"
agent: "Relational Database Agent"
argument-hint: "Domain description, e.g. 'ecommerce with products, categories, orders, and payments'"
---

Design and add Prisma models for this domain:

**Domain:** {{ input }}

## Process

1. Read the current schema at `common/database/prisma/schema.prisma`
2. Identify all entities, their fields, and relationships
3. Create Prisma models following conventions:
   - `snake_case` for table and column names
   - `@@map("table_name")` for table mapping
   - UUID IDs, audit fields (created_at, updated_at, created_by, modified_by, is_active)
   - Proper indexes on foreign keys and query columns
   - Decimal for money, enums for status fields
4. Add seed data for lookup tables in `common/database/prisma/seed.ts`
5. Run `pnpm --filter @project-olympus/database prisma:generate`

Present the model design for review before writing.
