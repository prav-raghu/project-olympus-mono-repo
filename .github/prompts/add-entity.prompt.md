---
description: "Add a new domain entity with full CRUD across database, backend API, and frontend"
agent: "Full Stack Orchestrator"
argument-hint: "Entity name and fields, e.g. 'product with name, price, category, description, image'"
---

Add a new domain entity to the system with full CRUD support:

**Entity:** {{ input }}

## What to Generate

1. **Prisma model** in `common/database/prisma/schema.*.prisma` with proper types, relations, and indexes
2. **Seed data** for any lookup/reference tables
3. **Backend API** (DTO, interface, service, controller, module) in the appropriate service
4. **Frontend pages** (list, detail, create form, edit form) in admin-web as Angular standalone components
5. **Feature service** with `ApiClientService` wrapping all API calls
6. Wire into existing route registration in `app.routes.ts`

Run `pnpm --filter @project-olympus/database prisma:generate` after schema changes.
