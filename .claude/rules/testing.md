---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "**/tests/**/*.ts"
---

# Testing Rules

You are writing tests. These rules apply to all test files.

## Unit tests — always mock externals

Mock `PrismaClient`, `CacheService`, `QueueService`, and `Logger`. Never touch a real database, Redis, or queue in a unit test.

```typescript
const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
};
beforeEach(() => jest.clearAllMocks());
```

Use `@nestjs/testing`'s `Test.createTestingModule` for controller unit tests, with the service mocked via `useValue`.

## Integration tests — real DB at TEST_DATABASE_URL

```typescript
afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});
```

Clean up only what your test created. Never truncate entire tables. `TEST_DATABASE_URL` must be a MySQL connection string to a dedicated test database, never the dev database.

## Required coverage per service method

| Method | Must test |
|---|---|
| `findById` | cache hit, cache miss + DB call, not found |
| `create` | creates record, invalidates cache, idempotency key match (where applicable) |
| `update` | updates record, invalidates cache, not found |
| `softDelete` | sets `isActive: false`, not found |

## Required coverage per route (integration)

| Scenario | Expected |
|---|---|
| Missing auth token | 401 |
| Wrong role/permission | 403 |
| Invalid body | 400 |
| Not found | 404 |
| Happy path GET | 200 |
| Happy path POST | 201 |

## Naming pattern

```typescript
describe('UsersService') {
  describe('findById') {
    it('returns cached data when cache hit')
    it('queries DB and sets cache on miss')
    it('returns isSuccessful false when user not found')
  }
}
```

Pattern: `it('{does action} when {condition}')` in plain English.
