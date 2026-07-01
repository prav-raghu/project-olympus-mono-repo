---
name: enterprise-scale
description: Use as a cross-cutting reference when designing for 1M+ concurrent users — caching strategy, queue offloading, database scale patterns, frontend performance, or API client resilience. Trigger on "scale this", "enterprise scale", "high traffic", or when reviewing whether a feature is production-ready for heavy load.
tools: Read, Grep, Glob
model: inherit
---

All code in this monorepo is designed for enterprise scale (1M+ concurrent users) by default. These are the cross-cutting concerns to apply. The detailed version of this reference is `enterprise-scale.instructions.md`, which applies automatically to everything under `apps/**` and `common/**`.

## Backend services (NestJS)

Stateless design — no in-memory sessions, no local file state, all state in MySQL or Redis. Horizontal scaling — every service runs behind a load balancer with N replicas, no singleton assumptions. Graceful shutdown is handled by NestJS's `OnApplicationShutdown` lifecycle hook automatically. Every service exposes `GET /health` (liveness) and `GET /health/ready` (readiness — DB + Redis checked) via `HealthModule`. `x-correlation-id` propagated through all service-to-service calls for distributed tracing.

Rate limiting tiers via `@nestjs/throttler`: global 200 req/min, auth endpoints 10 req/min, sensitive endpoints 5 req/min, admin operations 100 req/min.

## Database (Prisma + MySQL)

Multi-database — each service uses its own database, injected via `ADMIN_DB`/`CUSTOMER_DB`/`SCHEDULE_DB`/`SHARED_DB` tokens (see `relational-database.md`). Connection pooling parameterized via `DATABASE_CONNECTION_LIMIT` (default 10). Query efficiency: always `select` on list/search queries, never fetch entire rows on paginated endpoints. Cursor pagination for any customer-facing list that could exceed 10K rows — never `skip` + `take` at that volume. Optimistic locking via a `version` integer field on concurrent-write entities (orders, inventory, carts). Batch writes via `createMany`/`updateMany`/`deleteMany` instead of loops. UUIDs generated at the application layer (`crypto.randomUUID()`), never DB-generated.

## Caching (Redis)

Cache-aside on every read-heavy method: check Redis first, fall back to MySQL, then populate cache. TTL by entity type: catalog/reference data 15 min, user profiles 5 min, config/settings 30 min, transactional data 1 min or skip cache entirely. Cache key namespacing: `{service}:{entity}:{id}`. Invalidation deletes specific keys AND wildcard-matches list cache keys.

## Queue (BullMQ / Redis)

Offload to queues: email sending, PDF/report generation, image processing/resizing, webhook delivery, audit log batching, scheduled jobs (reminders, cleanups, analytics). Queue jobs must be idempotent — safe to retry on failure.

## Frontend (Angular)

Lazy-loaded routes via `loadComponent` — never eagerly imported feature components. Signals (`signal()`, `computed()`, `effect()`) for all component state — never RxJS `BehaviorSubject` as a store. Debounced search inputs, 300ms minimum, via `debounceTime` + `switchMap`. Optimistic UI on mutations where it makes sense — update the signal immediately, roll back on error. Bundle size: keep initial JS under 200KB gzipped — Angular's application builder handles code splitting automatically. `takeUntilDestroyed()` on every subscription, never manual `.unsubscribe()`.

## Environment variables (scale-related)

Every service `.env.example` includes:

```
DATABASE_CONNECTION_LIMIT=10
REDIS_URL=redis://localhost:6379
RATE_LIMIT_PUBLIC=30
RATE_LIMIT_AUTHENTICATED=120
CACHE_DEFAULT_TTL=900
QUEUE_CONCURRENCY=5
```
