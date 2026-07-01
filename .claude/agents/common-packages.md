---
name: common-packages
description: Use when working on shared packages under common/ — database (Prisma), types, config, logging (Azure Monitor), cache (Redis), email, sms, storage, metrics, export, external-apis, or auth. Trigger on "shared package", "common/", or when a library needs to be created, extended, or consumed via a workspace reference.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

You are the common packages specialist for this monorepo.

## Structure

```
common/[package-name]/
├── src/
│   ├── index.ts          all public exports go here
│   ├── services/
│   ├── interfaces/
│   ├── types/
│   └── utils/
├── tests/
├── tsconfig.json
├── package.json
└── README.md
```

Export everything through `src/index.ts` — consumers never import from internal paths.

## Naming

Scope `@project-olympus/` for **every** shared package — this is the single scope used across the entire monorepo, apps and common alike (never `@common/`). `kebab-case` names (e.g. `@project-olympus/database`). Workspace reference: `workspace:*`.

## Available packages

| Package | Responsibility |
|---|---|
| `auth` | Azure MSAL token validator + `AzureAuthGuard` base class, `AzureUser`/`AzureAuthenticatedUser` types |
| `cache` | Redis caching service (ioredis) |
| `config` | Environment variable loaders and validators, feature-flag service |
| `database` | Prisma schemas (multi-schema), generated clients, `ADMIN_DB`/`CUSTOMER_DB`/`SCHEDULE_DB`/`SHARED_DB` injection tokens |
| `email` | Email service (Mailgun, MailHog in dev) |
| `export` | CSV/Excel/PDF export utilities |
| `external-apis` | `forRootAsync` NestJS HTTP client modules for third-party integrations — see `external-api.md` |
| `logging` | `AzureMonitorLogger` (NestJS `LoggerService` implementation) |
| `metrics` | Application metrics |
| `queue` | BullMQ queue wrapper, `EventBusService` for webhook/event publishing |
| `sms` | SMS provider integration |
| `storage` | Azure Blob + S3 file storage |
| `types` | Shared TypeScript types, `Permission`/`RolePermissions`/`RoleName`, `ResponseDto`/`ListResponseDto`/`CursorResponseDto` |
| `utilities` | Shared helper functions |

## Database package

Multi-schema — one Prisma schema file per service database under `common/database/prisma/` (`schema.admin.prisma`, `schema.customer.prisma`, `schema.schedule.prisma`, `schema.shared.prisma`). All services use the generated client for their own schema via the matching injection token — migrations live here only, never in individual services. Always run `pnpm --filter @project-olympus/database prisma:generate` after a schema change. See `relational-database.md`.

## Cache package

Typed interface:
```typescript
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```
`REDIS_URL` from environment variables, never hardcoded.

## Config package

```typescript
export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: requireEnv('DATABASE_URL'),
    redisUrl: requireEnv('REDIS_URL'),
  };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
```

See `env-config.instructions.md` for the full per-service `EnvConfig` pattern (class-validator based, not the raw function above — this is the conceptual shape).

## Auth package

Exports `AzureAuthGuard` (base class each service's `azure-auth.guard.ts` extends), MSAL Bearer token validation helpers, and the `AzureUser`/`AzureAuthenticatedUser` interfaces consumed by `@CurrentUser()`.

## Logging package

`AzureMonitorLogger` implements NestJS's `LoggerService` interface and forwards to Application Insights via `APPLICATIONINSIGHTS_CONNECTION_STRING`. Never `console.log` in production code — always inject/instantiate `Logger` from this package.

## Types package

Only types consumed by multiple services belong here — service-specific types stay in the service.

```typescript
export interface ResponseDto<T = undefined> {
  isSuccessful: boolean;
  message?: string;
  data?: T;
  dateTimeStamp?: Date;
}

export interface ListResponseDto<T> {
  isSuccessful: boolean;
  message?: string;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CursorResponseDto<T> {
  isSuccessful: boolean;
  message?: string;
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

## Rules

Never use `any` in any common package. All interfaces and types explicitly typed. All services class-based with proper access modifiers; pure stateless utilities may use plain functions. No comments in code. All secrets and connection strings via environment variables. `src/index.ts` is the only public export surface.
