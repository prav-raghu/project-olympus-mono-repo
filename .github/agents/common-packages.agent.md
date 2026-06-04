---
name: Common Packages Agent
description: >
  Use when working on shared packages under the common/ directory including database (Prisma),
  types, config, logging, cache (Redis), email service, or utilities. Also use when a shared
  library needs to be created, extended, or consumed by a backend service via workspace references.
tools:
  - read_file
  - write_file
  - run_terminal_command
---

# Common Packages Agent

## Shared Package Structure

```
common/[package-name]/
├── src/
│   ├── index.ts          # All public exports go here
│   ├── services/
│   ├── interfaces/
│   ├── types/
│   └── utils/
├── tests/
├── tsconfig.json
├── package.json
└── README.md
```

Export everything through `src/index.ts` — consumers should never import from internal paths.

## Package Naming

- Scope: `@common/` for all shared packages
- Format: `kebab-case` — e.g., `@common/database`, `@common/cache`
- Workspace reference in consuming service: `"@common/cache": "workspace:*"`

## Available Common Packages

| Package | Responsibility |
|---|---|
| `@common/database` | Prisma schema, migrations, generated client |
| `@common/types` | Shared TypeScript types and interfaces |
| `@common/config` | Environment variable loaders and validators |
| `@common/logging` | OpenTelemetry / logging utilities |
| `@common/cache` | Redis caching service |
| `@common/email` | Email service |
| `@common/utilities` | Shared helper functions |

## Database Package (`@common/database`)

- Contains the single shared Prisma schema at `prisma/schema.prisma`
- All services reference the generated Prisma client from this package
- **Always run `prisma generate` after any schema change**
- Migrations live here — never in individual services

```bash
# From common/database/
pnpm prisma:migrate
pnpm prisma:generate
pnpm prisma:studio
pnpm prisma:seed
```

## Cache Package (`@common/cache`)

Redis-backed caching service. Must expose a typed interface:

```typescript
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

Redis URL must be loaded from environment variables — never hardcoded.

## Config Package (`@common/config`)

Centralised environment variable loading with validation:

```typescript
export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: requireEnv('DATABASE_URL'),
    redisUrl: requireEnv('REDIS_URL'),
    jwtSecret: requireEnv('JWT_SECRET'),
  };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
```

## Logging Package (`@common/logging`)

OpenTelemetry integration across all services. Expose a typed logger interface:

```typescript
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
```

## Types Package (`@common/types`)

Shared types and interfaces consumed by multiple services. Do not put service-specific types here.

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type UserId = string;
export type Timestamp = Date;
```

## Rules

- Never use `any` in any common package
- All interfaces and types must be explicitly typed
- All services must be class-based with proper access modifiers
- Pure utility functions (stateless) may use function syntax
- No comments in code
- All secrets and connection strings via environment variables
- `src/index.ts` is the only public export surface — do not expose internal modules
