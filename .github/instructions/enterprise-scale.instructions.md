---
applyTo: "apps/**,common/**"
description: "Enterprise scaling patterns for 1M+ concurrent users across all NestJS services and Angular frontends"
---

All code in this monorepo must be designed for enterprise scale (1M+ concurrent users). Apply these cross-cutting concerns:

## Backend Services (NestJS)

**Stateless design**: No in-memory sessions, no local file state. All state lives in MySQL or Redis.

**Horizontal scaling**: Every service must run behind a load balancer with N replicas. No singleton assumptions.

**Graceful shutdown**: NestJS handles SIGTERM automatically via `OnApplicationShutdown` lifecycle hook.

**Health endpoints**: Every service MUST expose via `HealthModule`:

- `GET /health` (liveness) — returns 200 if process is alive
- `GET /health/ready` (readiness) — returns 200 only if DB + Redis connections are healthy

**Correlation IDs**: Propagate `x-correlation-id` header through all service-to-service calls for distributed tracing.

**Rate limiting tiers** (via `@nestjs/throttler`):

- Global: 200 req/min
- Auth endpoints: 10 req/min
- Sensitive endpoints: 5 req/min
- Admin operations: 100 req/min

## Database (Prisma + MySQL)

**Multi-database**: Each service uses its own database. Inject via `ADMIN_DB`, `CUSTOMER_DB`, `SCHEDULE_DB`, `SHARED_DB` tokens.

**Query efficiency**: Use Prisma `select` on all list/search queries. Never fetch `*` on paginated endpoints.

**Cursor pagination**: Customer-facing lists with potential > 10K rows must use cursor + take, never skip + take.

**Optimistic locking**: Entities with concurrent write risk (orders, inventory, carts) use a `version` integer field.

**Batch writes**: Use `createMany`, `updateMany`, `deleteMany` for bulk operations instead of loops.

**UUIDs at application layer**: `crypto.randomUUID()` — never DB-generated.

## Caching (Redis)

**Cache-aside pattern**: Every read-heavy service method checks Redis first, falls back to MySQL, then populates cache.

**TTL by entity type**:

- Catalog/reference data: 15 min
- User profiles: 5 min
- Config/settings: 30 min
- Transactional data: 1 min or skip cache

**Cache key namespacing**: `{service}:{entity}:{id}` (e.g., `admin:user:uuid-here`)

**Invalidation**: On create/update/delete, delete specific keys AND wildcard-match list cache keys.

## Queue (BullMQ / Redis)

Offload to queues:

- Email sending
- PDF/report generation
- Image processing / resizing
- Webhook delivery to external systems
- Audit log batching
- Scheduled jobs (reminders, cleanups, analytics aggregation)

Queue jobs must be idempotent — safe to retry on failure.

## Frontend (Angular)

**Lazy loading**: All feature components loaded via `loadComponent` — never eagerly imported.

**Signals**: Use `signal()`, `computed()`, `effect()` for component state — not RxJS BehaviorSubjects.

**Debounced search**: All search inputs debounce 300ms before triggering API calls.

**Optimistic UI**: Mutations update UI immediately, roll back on error.

**Bundle size**: Keep initial JS under 200KB gzipped. Angular's application builder handles code splitting automatically.

## Environment Variables (Scale-Related)

Every service `.env.example` must include:

```env
DATABASE_CONNECTION_LIMIT=10
REDIS_URL=redis://localhost:6379
RATE_LIMIT_PUBLIC=30
RATE_LIMIT_AUTHENTICATED=120
CACHE_DEFAULT_TTL=900
QUEUE_CONCURRENCY=5
```
