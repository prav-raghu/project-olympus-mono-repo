# Feature Scope Template

Use this template when scoping a new feature before generating code — fill it in, review with the user, then hand off to `full-stack-orchestrator.md`.

## Feature name

<!-- e.g. "Product reviews" -->

## Description

<!-- One paragraph: what the feature does and why -->

## Domain entities

| Entity | New or existing | Owning schema (`schema.*.prisma`) |
|---|---|---|
|  |  |  |

## Relationships

<!-- e.g. "Review belongs to Product and User" -->

## User roles affected

- [ ] `ADMINISTRATOR`
- [ ] `MODERATOR`
- [ ] `SUPPORT`
- [ ] `CHAT_USER`

## New permissions needed

| Permission | Granted to which roles |
|---|---|
|  |  |

## Backend services affected

- [ ] `api-gateway`
- [ ] `admin-api`
- [ ] `customer-api`
- [ ] `schedule-api`

## Endpoints

| Method | Path | Service | Permission | Notes |
|---|---|---|---|---|
|  |  |  |  |  |

## Caching strategy

<!-- Which reads are cache-aside candidates, and TTL -->

## Queue jobs

<!-- Any BullMQ jobs needed (email, PDF, webhook, scheduled cleanup) -->

## Frontend pages

| App | Page | Route |
|---|---|---|
|  |  |  |

## New `common/*` package needs

<!-- e.g. "none" or "extend common/email with a new template" -->

## Out of scope

<!-- Explicitly note what this feature does NOT include, to prevent scope creep during generation -->
