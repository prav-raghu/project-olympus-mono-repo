---
name: Feature Flags Agent
description: >
  Use when implementing feature flags — creating a new flag, evaluating flags in a service or
  frontend, setting up the DB-backed flag store, or integrating an external provider like
  Unleash or LaunchDarkly. Also use when a flag needs to be removed after a full rollout
  or cleaned up after a cancelled feature.
tools:
  - read
  - edit
  - search
  - execute
user-invocable: true
argument-hint: "Describe what to flag, e.g. 'gate new checkout flow behind a feature flag for 10% rollout'"
---

# Feature Flags Agent

## Strategy — DB-Backed by Default

The template uses a **Postgres-backed feature flag store** by default. This avoids external SaaS dependencies during early development while providing:
- Per-environment flag values (dev/staging/prod via `NODE_ENV`)
- Per-user percentage rollouts
- Role-based targeting
- No additional vendor costs

For large-scale production (100+ flags, real-time targeting, A/B analytics), migrate to **Unleash** (self-hosted, open source) or **LaunchDarkly** by swapping the `FeatureFlagService` implementation — the calling code does not change.

## Step 1 — Prisma Model

Add to `common/database/prisma/schema.prisma`:

```prisma
model feature_flag {
  id               String   @id @default(uuid()) @map("id")
  key              String   @unique @map("key") @db.VarChar(100)
  description      String   @map("description") @db.VarChar(500)
  is_enabled       Boolean  @default(false) @map("is_enabled")
  rollout_percent  Int      @default(100) @map("rollout_percent")
  allowed_roles    String[] @map("allowed_roles")
  allowed_user_ids String[] @map("allowed_user_ids")
  environments     String[] @default(["development", "staging", "production"]) @map("environments")
  is_active        Boolean  @default(true) @map("is_active")
  created_at       DateTime @default(now()) @map("created_at")
  updated_at       DateTime @updatedAt @map("updated_at")
  created_by       String   @default("SYSTEM") @map("created_by")
  modified_by      String   @default("SYSTEM") @map("modified_by")

  @@index([key, is_enabled, is_active])
  @@index([environments])
  @@map("feature_flags")
}
```

## Step 2 — Flag Constants (`common/types/src/feature-flags.ts`)

All flag keys are defined as constants — no magic strings in application code:

```typescript
export const FeatureFlag = {
  NEW_CHECKOUT_FLOW: 'new-checkout-flow',
  ENHANCED_SEARCH: 'enhanced-search',
  BULK_EXPORT: 'bulk-export',
  LIVE_NOTIFICATIONS: 'live-notifications',
  NEW_ADMIN_DASHBOARD: 'new-admin-dashboard',
} as const;

export type FeatureFlag = (typeof FeatureFlag)[keyof typeof FeatureFlag];
```

Export from `common/types/src/index.ts`.

## Step 3 — Feature Flag Service (`common/config/src/services/feature-flag.service.ts`)

```typescript
import { PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { CacheService } from '@project-olympus/cache';
import { type FeatureFlag } from '@project-olympus/types';
import crypto from 'crypto';

export interface FlagEvaluationContext {
  userId?: string;
  role?: string;
}

export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly env = process.env.NODE_ENV ?? 'development';
  private readonly CACHE_TTL = 60;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheService: CacheService
  ) {}

  public async isEnabled(flag: FeatureFlag, context: FlagEvaluationContext = {}): Promise<boolean> {
    const cacheKey = `feature-flag:${flag}`;
    const cached = await this.cacheService.get<{
      is_enabled: boolean;
      rollout_percent: number;
      allowed_roles: string[];
      allowed_user_ids: string[];
      environments: string[];
    }>(cacheKey);

    const record = cached ?? await this.fetchAndCache(flag, cacheKey);
    if (!record) return false;

    if (!record.is_enabled) return false;
    if (!record.environments.includes(this.env)) return false;

    if (context.userId && record.allowed_user_ids.includes(context.userId)) return true;
    if (context.role && record.allowed_roles.includes(context.role)) return true;

    if (record.rollout_percent < 100 && context.userId) {
      return this.isInRollout(context.userId, flag, record.rollout_percent);
    }

    return record.rollout_percent === 100 || (!context.userId && !context.role);
  }

  public async getAll(): Promise<Record<FeatureFlag, boolean>> {
    const flags = await this.prisma.feature_flag.findMany({
      where: { is_active: true, environments: { has: this.env } },
      select: { key: true, is_enabled: true },
    });
    return Object.fromEntries(flags.map((f) => [f.key, f.is_enabled])) as Record<FeatureFlag, boolean>;
  }

  private async fetchAndCache(flag: FeatureFlag, cacheKey: string) {
    const record = await this.prisma.feature_flag.findUnique({
      where: { key: flag, is_active: true },
      select: {
        is_enabled: true,
        rollout_percent: true,
        allowed_roles: true,
        allowed_user_ids: true,
        environments: true,
      },
    });
    if (record) await this.cacheService.set(cacheKey, record, this.CACHE_TTL);
    return record;
  }

  private isInRollout(userId: string, flag: FeatureFlag, percent: number): boolean {
    const hash = crypto.createHash('md5').update(`${flag}:${userId}`).digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    return bucket < percent;
  }
}
```

The hash-based rollout is deterministic — the same user always gets the same bucket, so they have a consistent experience across requests and sessions.

## Step 4 — Register in Service Container

In each backend service's `plugins/services.plugin.ts`, add `FeatureFlagService` to `ServiceContainer`:

```typescript
export interface ServiceContainer {
  featureFlags: FeatureFlagService;
}

featureFlags: new FeatureFlagService(prisma, cacheService),
```

## Step 5 — Using Flags in Services

```typescript
public async checkout(dto: CheckoutDto, userId: string): Promise<ResponseDto<OrderData>> {
  const useNewFlow = await this.featureFlags.isEnabled(FeatureFlag.NEW_CHECKOUT_FLOW, {
    userId,
    role: req.user.role,
  });

  if (useNewFlow) {
    return this.newCheckoutFlow(dto, userId);
  }
  return this.legacyCheckoutFlow(dto, userId);
}
```

## Step 6 — Using Flags in Frontend

Expose a `/feature-flags` endpoint in `customer-api` (public, cached aggressively):

```typescript
@Get()
@Version('1')
@ApiOperation({ summary: 'Get all feature flags' })
public async getFlags(): Promise<ResponseDto<Record<string, boolean>>> {
  return this.featureFlagService.getAll();
}
```

In the Angular frontend, expose flags via a Signal-based service:

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly api = inject(ApiClientService);
  public readonly flags = signal<Record<string, boolean>>({});

  public load(): void {
    this.api.get<ResponseDto<Record<string, boolean>>>('/feature-flags').subscribe({
      next: (res) => { if (res.isSuccessful) this.flags.set(res.data ?? {}); },
    });
  }

  public isEnabled(flag: string): boolean {
    return this.flags()[flag] ?? false;
}
```

## Step 7 — Managing Flags via Admin API

Add CRUD endpoints to `admin-api` under `/admin/feature-flags`:

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/admin/feature-flags` | `SETTINGS_READ` | List all flags |
| PUT | `/admin/feature-flags/:key` | `SETTINGS_WRITE` | Enable/disable, adjust rollout |

When a flag is updated via admin API, invalidate its cache key immediately.

## Seed Data

Add default flags to `common/database/prisma/seed.ts`:

```typescript
export async function seedFeatureFlags(): Promise<void> {
  await prisma.feature_flag.createMany({
    data: [
      { key: 'new-checkout-flow', description: 'New checkout flow', is_enabled: false, rollout_percent: 0 },
      { key: 'enhanced-search', description: 'Enhanced search with full-text', is_enabled: false, rollout_percent: 0 },
    ],
    skipDuplicates: true,
  });
}
```

## Removing a Flag (Cleanup Process)

When a flag reaches 100% rollout and is stable:

1. Search codebase for all `isEnabled(FeatureFlag.SOME_FLAG` usages
2. Remove the conditional — keep the new code path, delete the old one
3. Remove the constant from `FeatureFlag` in `common/types`
4. Add a migration to delete the row from `feature_flags` table
5. Delete from seed data

Never leave dead flags in the codebase — they accumulate into unreadable conditional forests.

## Critical Rules

- NEVER hardcode flag state (`if (true)`, `if (false)`) — always check `FeatureFlagService`
- NEVER evaluate the same flag multiple times per request — call once, store result in a local variable
- NEVER use flags for security gates — flags can be bypassed; use RBAC permissions for access control
- ALWAYS define flag keys as `FeatureFlag` constants — never use raw strings
- ALWAYS seed flags with `is_enabled: false` and `rollout_percent: 0` — opt-in, not opt-out
- Cache TTL for flags is 60 seconds — balance freshness vs DB load
