---
description: "Build a complete system from a high-level description - generates database, backend APIs, and Angular frontend UI"
agent: "Full Stack Orchestrator"
argument-hint: "Describe the system, e.g. 'ecommerce system for burgers with menu, cart, and checkout'"
---

Build a complete full-stack application based on this description:

**System:** {{ input }}

## Requirements

1. Analyze the description and identify all domain entities, relationships, and features
2. Present a plan with tables, endpoints, and pages before starting
3. Generate all layers in order: Database → Backend → Frontend
4. Wire everything together (routes, NestJS modules, Angular routes, feature services)
5. Include seed data for lookup tables and sample data
6. Ensure all CRUD operations work end-to-end

## Scope

- **Database**: Prisma models with proper relations, indexes, and audit fields
- **Backend (customer-api)**: Public-facing endpoints (catalog, search, ordering)
- **Backend (admin-api)**: Admin management endpoints (full CRUD on all entities)
- **Frontend (admin-web)**: Angular admin dashboard pages with tables, forms, and detail views
- **Frontend (customer-web)**: Angular customer-facing pages with SEO metadata via `Title` and `Meta` services

After completion, list all commands needed to run the system.
