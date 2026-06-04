---
applyTo: "apps/backend/**/tests/**"
description: "Testing conventions for backend services - factories, mocking patterns, and coverage requirements"
---

When writing tests for backend services:

## Test Types and Where They Live

- `tests/unit/services/` — service class tests, all deps mocked
- `tests/unit/controllers/` — controller class tests, service mocked
- `tests/integration/routes/` — full HTTP tests via `app.inject()` against real test DB
- `tests/factories/` — `build{Entity}` (plain object) and `create{Entity}` (DB write) functions

## Mocking Rules

Unit tests MUST mock:
- `PrismaClient` — use `jest.fn()` per method: `{ user: { findUnique: jest.fn(), ... } }`
- `CacheService` — mock `get`, `set`, `del`
- `QueueService` — mock `add`
- `Logger` — mock `error`, `warn`, `info` or leave as no-op

NEVER mock in integration tests — use a real DB at `TEST_DATABASE_URL`.

## Required Unit Test Cases Per Service Method

| Method | Must test |
|--------|-----------|
| `findById` | cache hit (no DB call), cache miss (DB called + cache set), record not found |
| `list` | returns paginated data, applies filters, uses cursor when cursor provided |
| `create` | creates record, invalidates cache, idempotency key match returns existing |
| `update` | updates record, invalidates cache, returns not found when missing |
| `softDelete` | sets `is_active: false`, returns not found when missing |
| Optimistic lock | returns conflict response when version mismatch |

## Required Integration Test Cases Per Route

| Scenario | Expected |
|----------|----------|
| Missing auth token | 401 |
| Valid token, wrong role/permission | 403 |
| Invalid body (schema violation) | 400 |
| Resource not found | 404 |
| Happy path GET | 200 + `{ isSuccessful: true, data: {...} }` |
| Happy path POST | 201 + `{ isSuccessful: true, data: {...} }` |
| Duplicate idempotency key | 200 (returns existing, no duplicate) |

## `beforeEach` / `afterEach` Contract

```typescript
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  await prisma.{entity}.deleteMany({ where: { email: { contains: '@test.com' } } });
});
```

Clean up only rows your test created. Never truncate entire tables in shared test runs.

## Coverage Thresholds (enforced in jest.config.ts)

```
branches: 75%
functions: 80%
lines: 80%
statements: 80%
```

Untested branches in error paths are acceptable — coverage below 75% for a service class is not.

## Naming Convention

```
describe('UserService') {
  describe('findById') {
    it('returns cached data when cache hit')
    it('queries DB and sets cache on miss')
    it('returns isSuccessful false when user not found')
  }
}
```

Pattern: `it('{does action} when {condition}')` — always in plain English, no technical jargon.

## Test Environment Variables

Add to each service `.env.example`:

```
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/dbname_test
JWT_SECRET=test-secret-not-for-production
```

The test DB must be separate from the dev DB. CI creates it from scratch each run.
