---
description: "Add backend API endpoints for an existing Prisma model - generates interface, DTOs, service, controller, and module"
agent: "backend-service"
argument-hint: "Model name and target service, e.g. 'product endpoints in customer-api'"
---

Generate complete backend API endpoints for:

**Request:** {{ input }}

## Process

1. Read the Prisma schema to understand the model's fields and relations
2. Create `class-validator` DTOs for create, update, and list (with pagination/search/filter)
3. Create an interface for the read-model shape
4. Create a service class with full CRUD operations (create, findById, findAll, update, softDelete)
5. Create a controller class with `@ApiTags`/`@ApiOperation`/`@RequirePermissions` and error handling
6. Create a module wiring controller + service, and import it in `app.module.ts`

Follow existing patterns in the target service exactly. See `api-builder.md`.
