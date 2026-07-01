---
name: testing
description: Use when writing unit tests, integration tests, or test utilities for any backend service. Covers Jest configuration, service/controller unit tests with mocked dependencies, integration tests against a real test database, test factories for Prisma models, coverage thresholds, and the setup/teardown lifecycle. Also use when debugging failing tests or improving test coverage.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

## Test file location

```
apps/backend/[service]/
└── tests/
    ├── setup.ts                ← global Jest setup (DB connect, env)
    ├── factories/
    │   └── user.factory.ts     ← Prisma model factories
    ├── unit/
    │   ├── services/
    │   │   └── user.service.test.ts
    │   └── controllers/
    │       └── user.controller.test.ts
    └── integration/
        └── routes/
            └── user.routes.test.ts
```

## Jest configuration

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.dto.ts', '!src/**/*.module.ts'],
  coverageThreshold: {
    global: { branches: 75, functions: 80, lines: 80, statements: 80 },
  },
  moduleNameMapper: {
    '^@project-olympus/(.*)$': '<rootDir>/../../common/$1/src',
  },
};

export default config;
```

## Global test setup (`tests/setup.ts`)

```typescript
import { PrismaClient } from '@project-olympus/database';

let prisma: PrismaClient;

beforeAll(async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  prisma = new PrismaClient();
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

## Test factories (`tests/factories/`)

Every Prisma model that appears in tests needs a factory producing minimal valid objects with sensible defaults and overrides.

```typescript
import { PrismaClient } from '@project-olympus/database';
import crypto from 'crypto';

export function buildUser(overrides: Partial<{ id: string; email: string; name: string; role: string }> = {}) {
  return {
    id: crypto.randomUUID(),
    email: `user-${crypto.randomUUID()}@test.com`,
    name: 'Test User',
    role: 'CHAT_USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'SYSTEM',
    modifiedBy: 'SYSTEM',
    ...overrides,
  };
}

export async function createUser(prisma: PrismaClient, overrides: Parameters<typeof buildUser>[0] = {}) {
  return prisma.user.create({ data: buildUser(overrides) });
}
```

Naming: `build{Entity}` returns a plain object for unit tests (no DB write); `create{Entity}` writes to DB for integration tests.

## Unit tests — services

Mock ALL external dependencies. Never use a real database, Redis, or queue in a unit test.

```typescript
const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
};
const mockCacheService = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(mockPrisma as never, mockCacheService as never);
  });

  describe('findById', () => {
    it('returns cached user when cache hit', async () => {
      const user = buildUser();
      mockCacheService.get.mockResolvedValueOnce(user);

      const result = await service.findById(user.id);

      expect(result.isSuccessful).toBe(true);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('queries DB and caches on cache miss', async () => {
      const user = buildUser();
      mockCacheService.get.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      const result = await service.findById(user.id);

      expect(result.isSuccessful).toBe(true);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('returns not found when user does not exist', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.findById('non-existent-id');

      expect(result.isSuccessful).toBe(false);
    });
  });
});
```

## Unit tests — controllers

Mock the service layer. Use `@nestjs/testing` to build a minimal `TestingModule`, then verify the returned payload shape and which service method was called.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../src/modules/users/users.controller';
import { UsersService } from '../../../src/modules/users/users.service';

const mockUsersService = { findById: jest.fn(), create: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn() };

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('findById returns result from service', async () => {
    const expected = { isSuccessful: true, data: { id: 'user-123' } };
    mockUsersService.findById.mockResolvedValueOnce(expected);

    const result = await controller.findById('user-123');

    expect(result).toEqual(expected);
    expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
  });
});
```

## Integration tests — routes

Use `@nestjs/testing` with the full `AppModule` and a real test database, `supertest` against `app.getHttpServer()`.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaClient } from '@project-olympus/database';
import { createUser } from '../../factories/user.factory';

let app: INestApplication;
let prisma: PrismaClient;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  await prisma.$connect();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});

describe('GET /v1/users/:id', () => {
  it('returns 200 with user data', async () => {
    const user = await createUser(prisma);

    const response = await request(app.getHttpServer())
      .get(`/v1/users/${user.id}`)
      .set('Authorization', `Bearer ${generateTestToken({ id: user.id, role: 'ADMINISTRATOR' })}`);

    expect(response.status).toBe(200);
    expect(response.body.isSuccessful).toBe(true);
    expect(response.body.data.id).toBe(user.id);
  });

  it('returns 401 without an auth token', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/some-id');
    expect(response.status).toBe(401);
  });
});
```

### Test token helper — add to `tests/setup.ts`

```typescript
import jwt from 'jsonwebtoken';

export function generateTestToken(payload: { id: string; role: string; permissions?: string[] }): string {
  return jwt.sign(
    { sub: payload.id, role: payload.role, permissions: payload.permissions ?? [] },
    process.env.JWT_SECRET ?? 'test-secret',
    { expiresIn: '1h' },
  );
}
```

This helper mints a token shaped like the claims `AzureAuthGuard` expects for tests **only** — production auth is Azure MSAL end to end, never a locally-signed JWT. Keep this helper confined to `tests/`.

## What to test (per layer)

| Layer | Test type | What to cover |
|-------|-----------|---------------|
| Service | Unit | Cache hit, cache miss + DB fallback, not-found, idempotency key match, soft delete, optimistic lock conflict |
| Controller | Unit | Correct service method called, correct params extracted, correct return value passed through |
| Routes | Integration | Auth enforcement (401/403), `ValidationPipe` rejection (400 on bad body), happy path end-to-end |

## `beforeEach`/`afterEach` contract

```typescript
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});
```

Clean up only rows your test created. Never truncate entire tables in shared test runs.

## Coverage thresholds (enforced in `jest.config.ts`)

```
branches: 75%
functions: 80%
lines: 80%
statements: 80%
```

## Naming convention

```
describe('UsersService') {
  describe('findById') {
    it('returns cached data when cache hit')
    it('queries DB and sets cache on miss')
    it('returns isSuccessful false when user not found')
  }
}
```

Pattern: `it('{does action} when {condition}')` — plain English, no technical jargon.

## Test environment variables

Add to each service `.env.example`:

```
TEST_DATABASE_URL=mysql://appuser:apppassword@localhost:3306/app_admin_test
```

The test database must be separate from the dev database and named per-service (matching the `app_admin`/`app_customer`/`app_schedule`/`app_shared` split) — never a shared Postgres-style single `dbname_test`. CI creates it from scratch each run.

## Rules

Never test implementation details — test observable behavior. Never share state between tests — `beforeEach` resets mocks, `afterEach` cleans DB rows. Never use `setTimeout`/`sleep` — use `jest.useFakeTimers()`. Unit tests must not touch the filesystem, network, or database. Integration tests must use a dedicated `TEST_DATABASE_URL`, never the dev database. All test files end with `.test.ts`.
