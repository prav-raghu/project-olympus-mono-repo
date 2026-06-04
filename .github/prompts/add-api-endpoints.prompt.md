---
description: "Add backend API endpoints for an existing Prisma model - generates schema, DTO, service, controller, and route"
agent: "Backend Service Agent"
argument-hint: "Model name and target service, e.g. 'product endpoints in customer-api'"
---

Generate complete backend API endpoints for:

**Request:** {{ input }}

## Process

1. Read the Prisma schema to understand the model's fields and relations
2. Create AJV schemas for create, update, getById, list (with pagination/search/filter), and delete
3. Create DTO interfaces derived from schemas
4. Create a service class with full CRUD operations (create, findById, list, update, softDelete)
5. Create a controller class with error handling and logging
6. Create a route class and register it in v1.route.ts
7. Add the service to the ServiceContainer in services.plugin.ts

Follow existing patterns in the target service exactly.
