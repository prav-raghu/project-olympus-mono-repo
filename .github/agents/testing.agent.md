---
name: Testing Agent
description: >
  Use when writing unit tests, integration tests, or test utilities for any backend service.
  Covers Jest configuration, service/controller unit tests with mocked dependencies, integration
  tests against a real test database, test factories for Prisma models, coverage thresholds,
  and the setup/teardown lifecycle. Also use when debugging failing tests or improving test coverage.
tools:
  - read
  - edit
  - search
  - execute
user-invocable: true
argument-hint: "Describe what to test, e.g. 'unit tests for ProductService' or 'integration tests for order endpoints'"
---

# Testing Agent

## Test File Location

```
apps/backend/[service]/
└── tests/
    ├── setup.ts               ← global Jest setup (DB connect, env)
    ├── factories/
    │   └── user.factory.ts    ← Prisma model factories
    ├── unit/
    │   ├── services/
    │   │   └── user.service.test.ts
    │   └── controllers/
    │       └── user.controller.test.ts
    └── integration/
        └── routes/
            └── user.routes.test.ts
```

## Jest Configuration

Every service has a `jest.config.ts`:

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.dto.ts', '!src/**/*.module.ts'],
  coverageThresholds: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@project-olympus/(.*)$': '<rootDir>/../../common/$1/src',
  },
};

export default config;
```

## Global Test Setup (`tests/setup.ts`)

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

## Test Factories (`tests/factories/`)

Every Prisma model that appears in tests needs a factory. Factories produce minimal valid objects with sensible defaults and allow overrides.

```typescript
import { PrismaClient } from '@project-olympus/database';
import { v4 as uuid } from 'uuid';

export function buildUser(overrides: Partial<{
  id: string;
  email: string;
  name: string;
  role: string;
}> = {}) {
  return {
    id: uuid(),
    email: `user-${uuid()}@test.com`,
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

export async function createUser(
  prisma: PrismaClient,
  overrides: Parameters<typeof buildUser>[0] = {}
) {
  return prisma.user.create({ data: buildUser(overrides) });
}
```

Factory naming:
- `build{Entity}` — returns a plain object (no DB write), for unit tests
- `create{Entity}` — writes to DB, for integration tests

## Unit Tests — Services

Mock ALL external dependencies. Never use a real database, Redis, or queue in unit tests.

```typescript
import { UserService } from '../../../src/modules/users/users.service';
import { buildUser } from '../../factories/user.factory';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(mockPrisma as never, mockCacheService as never);
  });

  describe('findById', () => {
    it('returns cached user when cache hit', async () => {
      const user = buildUser();
      mockCacheService.get.mockResolvedValueOnce(user);

      const result = await service.findById(user.id);

      expect(result.isSuccessful).toBe(true);
      expect(result.data).toEqual(user);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('queries DB and caches on cache miss', async () => {
      const user = buildUser();
      mockCacheService.get.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      const result = await service.findById(user.id);

      expect(result.isSuccessful).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id, isActive: true },
        select: expect.any(Object),
      });
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('returns not found when user does not exist', async () => {
      mockCacheService.get.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.findById('non-existent-id');

      expect(result.isSuccessful).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('create', () => {
    it('creates user and invalidates list cache', async () => {
      const user = buildUser();
      mockPrisma.user.create.mockResolvedValueOnce(user);

      const result = await service.create({ email: user.email, name: user.name }, 'SYSTEM');

      expect(result.isSuccessful).toBe(true);
      expect(result.data).toEqual(user);
      expect(mockCacheService.del).toHaveBeenCalled();
    });

    it('returns existing record when idempotency key matches', async () => {
      const user = buildUser();
      mockPrisma.user.findUnique.mockResolvedValueOnce(user);

      const result = await service.create(
        { email: user.email, name: user.name },
        'SYSTEM',
        'idem-key-123'
      );

      expect(result.isSuccessful).toBe(true);
      expect(result.data).toEqual(user);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });
});
```

## Unit Tests — Controllers

Mock the service layer. Verify HTTP response codes and payload shape using NestJS testing utilities.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../src/modules/users/users.controller';
import { UsersService } from '../../../src/modules/users/users.service';

const mockUsersService = {
  findById: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

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

  it('findById returns not-found result', async () => {
    const expected = { isSuccessful: false, message: 'Not found' };
    mockUsersService.findById.mockResolvedValueOnce(expected);

    const result = await controller.findById('missing');

    expect(result).toEqual(expected);
  });
});
```

## Integration Tests — Routes

Use `@nestjs/testing` with a real test database. Isolate each test with truncation.

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
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

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

  it('returns 404 when user does not exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${generateTestToken({ id: 'sys', role: 'ADMINISTRATOR' })}`);

    expect(response.status).toBe(404);
    expect(response.body.isSuccessful).toBe(false);
  });

  it('returns 401 without auth token', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/some-id');
    expect(response.status).toBe(401);
  });
});
```

### Test Token Helper

Add to `tests/setup.ts`:

```typescript
import jwt from 'jsonwebtoken';

export function generateTestToken(payload: {
  id: string;
  role: string;
  permissions?: string[];
}): string {
  return jwt.sign(
    { sub: payload.id, role: payload.role, permissions: payload.permissions ?? [] },
    process.env.JWT_SECRET ?? 'test-secret',
    { expiresIn: '1h' }
  );
}
```

## What to Test (Per Layer)

| Layer | Test type | What to cover |
|-------|-----------|---------------|
| Service | Unit | Cache hit, cache miss + DB fallback, not-found, idempotency key match, soft delete, optimistic lock conflict |
| Controller | Unit | Correct service method called, correct params extracted, correct return value passed through |
| Routes | Integration | Auth enforcement (401 on missing token, 403 on wrong role), validation pipe (400 on bad body), happy path end-to-end |

## Rules

- NEVER test implementation details — test observable behavior (return values, HTTP codes, calls to mocked deps)
- NEVER share state between tests — `beforeEach` resets mocks and `afterEach` cleans DB rows
- NEVER use `setTimeout` or `sleep` in tests — if async behavior is needed, use `jest.useFakeTimers()`
- Unit tests MUST NOT touch the filesystem, network, or database
- Integration tests MUST use a dedicated `TEST_DATABASE_URL` — never the dev database
- All test files end with `.test.ts`
- Test descriptions follow: `describe('ClassName/route')` → `describe('methodName')` → `it('does X when Y')`
