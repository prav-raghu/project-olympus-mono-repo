# 🚀 Project Scope: [PROJECT NAME]

> **Claude Code Entry Point**
> Hand this document to the **Full Stack Orchestrator** agent:
> `.github/agents/full-stack-orchestrator.agent.md`
>
> Before writing a single line of code, read:
> 1. `CLAUDE.md`
> 2. `.github/agents/full-stack-orchestrator.agent.md`
> 3. `.github/copilot-instructions.md`
>
> This document is the single source of truth for Phase 1 scope.
> Do **not** build beyond what is described here.

---

## 1. Project Overview

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| **Project Name**   | `[project-name]` _(lowercase, hyphenated)_     |
| **Package Scope**  | `@[project-name]/`                             |
| **Phase**          | Phase 1 — MVP                                  |
| **Target Env**     | Development → QA → Production                  |
| **Repo Base**      | `project-olympus`                      |

### 1.1 Business Summary

> _2–4 sentences. What does this system do? Who uses it? What problem does it solve?_
>
> Example: "A fleet tracking platform for logistics companies. Drivers submit telemetry via mobile.
> Dispatchers monitor vehicles on a real-time dashboard. Admins manage routes, drivers, and reports."

---

## 2. Design Screens

> Attach or link design files below. Claude Code will use these as the UI contract
> for all frontend pages listed in Section 7.

| Screen Name              | File / Link                        | Notes                        |
| ------------------------ | ---------------------------------- | ---------------------------- |
| Login / Auth             | `designs/auth.png` or [Figma link] |                              |
| Dashboard                | `designs/dashboard.png`            |                              |
| [Entity] List View       | `designs/[entity]-list.png`        |                              |
| [Entity] Detail / Form   | `designs/[entity]-detail.png`      |                              |
| _(add more as needed)_   |                                    |                              |

> ⚠️ If a design screen exists for a page, Claude Code **must** implement it
> pixel-faithfully using the existing component library. No creative divergence.

---

## 3. Monorepo Name Substitution

> Run this before writing any code. Replace everywhere in the repo:

| Find                        | Replace With                  |
| --------------------------- | ----------------------------- |
| `project-olympus`   | `[project-name]`              |
| `@project-olympus/` | `@[project-name]/`            |

---

## 4. Domain Entities

> Define every entity the system manages. Claude Code will use this to drive
> the **Domain Modeler** agent and Prisma schema design.

### 4.1 Entity: `[EntityName]`

| Property       | Type              | Required | Notes                            |
| -------------- | ----------------- | -------- | -------------------------------- |
| `id`           | `String` (cuid)   | ✅        | PK, auto-generated               |
| `name`         | `String`          | ✅        |                                  |
| `status`       | `Enum`            | ✅        | Values: `ACTIVE`, `INACTIVE`     |
| `tenantId`     | `String`          | ✅        | FK → `Tenant`                    |
| `createdAt`    | `DateTime`        | ✅        | Auto                             |
| `updatedAt`    | `DateTime`        | ✅        | Auto                             |
| _(add fields)_ |                   |          |                                  |

**Relationships:**
- `[EntityName]` belongs to `[OtherEntity]` (many-to-one)
- `[EntityName]` has many `[ChildEntity]` (one-to-many)

**Indexes:** `[tenantId, status]`, `[createdAt DESC]`

**Caching:** TTL `[X]` minutes | Cache key: `[entity]:[id]` | Invalidate on: write

### 4.2 Entity: `[EntityName2]`

> _(repeat block per entity)_

---

## 5. Enums

```
[EnumName]:
  - VALUE_ONE    → description
  - VALUE_TWO    → description
  - VALUE_THREE  → description
```

---

## 6. RBAC — Roles & Permissions

> Claude Code will use `.github/agents/rbac.agent.md` for implementation.

| Role          | Description                       |
| ------------- | --------------------------------- |
| `SUPER_ADMIN` | Full system access                |
| `ADMIN`       | Tenant-scoped full access         |
| `MANAGER`     | _(describe scope)_                |
| `USER`        | _(describe scope)_                |
| _(add roles)_ |                                   |

### Permission Matrix

| Resource         | SUPER_ADMIN | ADMIN | MANAGER | USER |
| ---------------- | :---------: | :---: | :-----: | :--: |
| `[entity]:read`  | ✅          | ✅    | ✅      | ✅   |
| `[entity]:write` | ✅          | ✅    | ✅      | ❌   |
| `[entity]:delete`| ✅          | ✅    | ❌      | ❌   |
| _(add more)_     |             |       |         |      |

---

## 7. Backend Services & API Endpoints

> Services live in `apps/backend/`. Claude Code will use the
> **API Builder** agent: `.github/agents/api-builder.agent.md`
>
> All endpoints follow the standard API response envelope from
> `.github/instructions/api-response.instructions.md`

### 7.1 Service: `[service-name]-api`

> _e.g., `customer-api`, `admin-api`, or a new `[domain]-api` service_
> _New services → delegate to `.github/agents/new-service-scaffold.agent.md`_

**Base path:** `/api/v1/[resource]`

| Method   | Path                    | Auth      | Role Required  | Description                  |
| -------- | ----------------------- | --------- | -------------- | ---------------------------- |
| `POST`   | `/[resource]`           | JWT       | `ADMIN`        | Create [entity]              |
| `GET`    | `/[resource]`           | JWT       | `USER`         | List [entities] (paginated)  |
| `GET`    | `/[resource]/:id`       | JWT       | `USER`         | Get single [entity]          |
| `PATCH`  | `/[resource]/:id`       | JWT       | `ADMIN`        | Update [entity]              |
| `DELETE` | `/[resource]/:id`       | JWT       | `ADMIN`        | Soft-delete [entity]         |
| _(add)_  |                         |           |                |                              |

**Pagination:** Cursor-based (default) unless dataset is known-small
**Filtering:** `?status=ACTIVE&tenantId=xxx`
**Sorting:** `?sortBy=createdAt&order=DESC`

#### Request DTOs

```typescript
// POST /[resource]
interface Create[Entity]Dto {
  name: string;
  status: [EnumName];
  // ...
}

// PATCH /[resource]/:id
interface Update[Entity]Dto {
  name?: string;
  status?: [EnumName];
  // ...
}
```

#### Caching Notes

- `GET /[resource]` → Cache list with key `[resource]:list:[tenantId]`, TTL `5m`
- `GET /[resource]/:id` → Cache item with key `[resource]:[id]`, TTL `10m`
- Invalidate list cache on any write to this resource

### 7.2 Service: `[service-name-2]-api`

> _(repeat block per service)_

---

## 8. Queue Jobs (BullMQ)

> Claude Code will use `common/queue` package.
> Reference: `.github/agents/backend-service.agent.md`

| Queue Name         | Trigger                   | Job Description                     | Priority |
| ------------------ | ------------------------- | ----------------------------------- | -------- |
| `[queue-name]`     | POST `/[resource]`        | Send confirmation email             | Normal   |
| `[queue-name-2]`   | CRON `0 8 * * *`          | Generate daily report               | Low      |
| _(add jobs)_       |                           |                                     |          |

---

## 9. Frontend Applications

### 9.1 Which Apps Are In Scope?

| App           | Path                         | In Scope? |
| ------------- | ---------------------------- | :-------: |
| `admin-web`   | `apps/frontend/admin-web`    | ✅ / ❌   |
| `customer-web`| `apps/frontend/customer-web` | ✅ / ❌   |
| `mobile`      | `apps/mobile`                | ✅ / ❌   |

### 9.2 Pages — `admin-web` (Angular)

> Claude Code uses `.github/agents/frontend-angular.agent.md`
> `.github/instructions/frontend-pages.instructions.md`

| Route                      | Component Name           | Design Screen Ref         | Description                      |
| -------------------------- | ------------------------ | ------------------------- | -------------------------------- |
| `/[resource]`              | `[Entity]ListPage`       | `designs/[entity]-list`   | Paginated table with filters     |
| `/[resource]/new`          | `[Entity]FormPage`       | `designs/[entity]-form`   | Create form                      |
| `/[resource]/:id`          | `[Entity]DetailPage`     | `designs/[entity]-detail` | View + inline edit                |
| `/[resource]/:id/edit`     | `[Entity]EditPage`       | `designs/[entity]-form`   | Edit form                        |
| _(add pages)_              |                          |                           |                                  |

**Shared UI Components needed:**
- `[EntityName]Table` — sortable, filterable, paginated
- `[EntityName]Form` — controlled form with validation
- `[EntityName]StatusBadge` — coloured status pill
- _(add components)_

**State management:** Angular Signals for component state | `ApiClientService` for all HTTP calls

### 9.3 Pages — `customer-web` (Angular)

> Claude Code uses `.github/agents/frontend-angular.agent.md`

| Route                  | Page Component           | Design Screen Ref        | Description           |
| ---------------------- | ------------------------ | ------------------------ | --------------------- |
| `/[resource]`          | `[Entity]Page`           | `designs/[entity]`       | _(describe)_          |
| _(add pages)_          |                          |                          |                       |

### 9.4 Mobile Screens (Ionic + Capacitor)

> Claude Code uses `.github/agents/mobile.agent.md`
> `.github/instructions/mobile.instructions.md`

| Screen             | Component Name           | Design Screen Ref         | Description          |
| ------------------ | ------------------------ | ------------------------- | -------------------- |
| `[ScreenName]`     | `[ScreenName]Page`       | `designs/[screen]`        | _(describe)_         |
| _(add screens)_    |                          |                           |                      |

---

## 10. Event / Webhook System

> If events are needed, reference `.github/agents/webhook-events.agent.md`

| Event Name                 | Trigger                    | Payload Fields             |
| -------------------------- | -------------------------- | -------------------------- |
| `[entity].created`         | POST `/[resource]`         | `id`, `tenantId`, ...      |
| `[entity].status_changed`  | PATCH `/[resource]/:id`    | `id`, `oldStatus`, `newStatus` |
| _(add events)_             |                            |                            |

---

## 11. Feature Flags

> If feature flags are needed, reference `.github/agents/feature-flags.agent.md`

| Flag Name                  | Default | Description                          |
| -------------------------- | ------- | ------------------------------------ |
| `enable_[feature_name]`    | `false` | Enables [feature] for selected tenants |
| _(add flags)_              |         |                                      |

---

## 12. Audit Logging

> Reference `.github/instructions/audit-log.instructions.md`

| Action                    | Actor  | Resource      | Logged Fields              |
| ------------------------- | ------ | ------------- | -------------------------- |
| `CREATE`                  | User   | `[Entity]`    | `id`, `tenantId`, `userId` |
| `UPDATE`                  | User   | `[Entity]`    | `id`, `before`, `after`    |
| `DELETE`                  | Admin  | `[Entity]`    | `id`, `tenantId`           |
| _(add entries)_           |        |               |                            |

---

## 13. Infrastructure & Environment

> Reference `.github/agents/infrastructure.agent.md`
> `.github/instructions/terraform.instructions.md`

| Setting              | Value                                         |
| -------------------- | --------------------------------------------- |
| **Cloud Provider**   | Azure / AWS / GCP _(choose one)_              |
| **Database**         | PostgreSQL (Prisma + PgBouncer)               |
| **Cache**            | Redis                                         |
| **Queue**            | BullMQ on Redis                               |
| **Storage**          | Azure Blob / S3 _(choose one)_                |
| **Container**        | Docker → Kubernetes                           |
| **IaC**              | Terraform                                     |

### Environment Variables (new service only)

```env
# .env.example additions for [service-name]-api
[SERVICE_NAME]_PORT=3000
[SERVICE_NAME]_DB_URL=postgresql://...
[SERVICE_NAME]_REDIS_URL=redis://...
[CUSTOM_VAR]=value
```

---

## 14. Testing Requirements

> Claude Code uses `.github/agents/testing.agent.md`
> `.github/instructions/testing.instructions.md`

| Layer          | Type            | Coverage Target | Notes                              |
| -------------- | --------------- | --------------- | ---------------------------------- |
| Backend API    | Integration     | Happy path + error cases | Use `supertest` + test DB   |
| Services       | Unit            | Core logic only | Mock Prisma + Redis                |
| Frontend       | Component       | Critical paths  | React Testing Library              |
| E2E            | Out of scope    | —               | Phase 2                            |

---

## 15. Phase 1 — Build Checklist

> Claude Code must complete all items in order.
> Do **not** move to the next phase until each checkbox is verified.

### Database Layer
- [ ] Prisma schema updated with all entities in Section 4
- [ ] Migration created and applied
- [ ] Seed data created for dev/test

### Backend
- [ ] All services scaffolded (if new) per Section 7
- [ ] All endpoints implemented with correct DTOs
- [ ] AJV validation schemas in place
- [ ] RBAC guards applied per Section 6 permission matrix
- [ ] Redis caching implemented per Section 7 notes
- [ ] BullMQ jobs created per Section 8
- [ ] Audit logs wired per Section 12
- [ ] OpenAPI/Swagger docs generated
- [ ] Unit + integration tests passing

### Frontend
- [ ] All pages listed in Section 9 implemented
- [ ] Design screens matched faithfully
- [ ] Angular feature services with `ApiClientService` for all API calls
- [ ] Loading, empty, and error states handled
- [ ] Role-based UI visibility applied

### Infrastructure
- [ ] `.env.example` updated with all new vars
- [ ] Docker Compose updated if new service added
- [ ] Terraform updated if new infra added

---

## 16. Out of Scope (Phase 1)

> Claude Code must **not** implement any of the following.
> These are explicitly deferred to future phases.

- _(e.g., Email notifications)_
- _(e.g., Reporting dashboard)_
- _(e.g., Mobile app)_
- _(e.g., Third-party integrations)_
- _(e.g., Advanced analytics)_

---

## 17. Known Constraints & Decisions

> Any pre-made technical or business decisions Claude Code must respect.

| Decision                               | Reason                              |
| -------------------------------------- | ----------------------------------- |
| NestJS (latest) — no Fastify, no Express | Template standard
| class-validator + class-transformer — no AJV, no Zod       | Template standard                   |
| TypeScript strict — no `any`           | Template standard                   |
| DTOs are classes with decorators — no plain interfaces  | Template standard                   |
| `common/` for all shared packages      | Template standard                   |
| _(add project-specific decisions)_     |                                     |

---

## 18. Glossary

> Define any domain-specific terms or abbreviations used in this document.

| Term       | Definition                              |
| ---------- | --------------------------------------- |
| _(term)_   | _(definition)_                          |

---

_Document version: 1.0 | Last updated: [DATE] | Author: [NAME]_
