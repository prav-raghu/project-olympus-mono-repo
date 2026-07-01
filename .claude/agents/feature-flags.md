---
name: feature-flags
description: Use when implementing feature flags — creating a new flag, evaluating flags in a service or frontend, setting up the DB-backed flag store, or integrating an external provider like Unleash or LaunchDarkly. Also use when a flag needs to be removed after a full rollout or cleaned up after a cancelled feature.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

## Strategy — DB-backed by default

A MySQL-backed feature flag store by default: per-environment values via `NODE_ENV`, per-user percentage rollouts, role-based targeting, no vendor costs. For large-scale production (100+ flags, real-time targeting, A/B analytics), migrate to Unleash (self-hosted) or LaunchDarkly by swapping the `FeatureFlagService` implementation — calling code doesn't change.

## Step 1 — Prisma model

Add to `common/database/prisma/schema.shared.prisma`. MySQL doesn't support Prisma scalar list fields (`String[]`), so role/user allow-lists and the environment list are stored as `Json`:

```prisma
model FeatureFlag {
  id              String   @id @db.VarChar(36) @map("id")
  key             String   @unique @db.VarChar(100) @map("key")
  description     String   @db.VarChar(500) @map("description")
  isEnabled       Boolean  @default(false) @map("is_enabled")
  rolloutPercent  Int      @default(100) @map("rollout_percent")
  allowedRoles    Json     @default("[]") @map("allowed_roles")     // string[] of RoleName
  allowedUserIds  Json     @default("[]") @map("allowed_user_ids")  // string[] of user ids
  environments    Json     @default("[\"development\", \"staging\", \"production\"]") @map("environments")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @db.DateTime(0) @map("created_at")
  updatedAt       DateTime @updatedAt @db.DateTime(0) @map("updated_at")
  createdBy       String   @default("SYSTEM") @db.VarChar(36) @map("created_by")
  modifiedBy      String   @default("SYSTEM") @db.VarChar(36) @map("modified_by")

  @@index([key, isEnabled, isActive])
  @@map("feature_flags")
}
```

## Step 2 — Flag constants (`common/types/src/feature-flags.ts`)

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

No magic strings in application code — always reference these constants.

## Step 3 — Feature Flag Service (`common/config/src/services/feature-flag.service.ts`)

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { SHARED_DB } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { CacheService } from '@project-olympus/cache';
import { type FeatureFlag } from '@project-olympus/types';
import type { PrismaClient } from '@prisma/client/shared';
import crypto from 'crypto';

export interface FlagEvaluationContext {
  userId?: string;
  role?: string;
}

interface FlagRecord {
  isEnabled: boolean;
  rolloutPercent: number;
  allowedRoles: string[];
  allowedUserIds: string[];
  environments: string[];
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly env = process.env.NODE_ENV ?? 'development';
  private readonly CACHE_TTL = 60;

  constructor(
    @Inject(SHARED_DB) private readonly prisma: PrismaClient,
    private readonly cacheService: CacheService,
  ) {}

  public async isEnabled(flag: FeatureFlag, context: FlagEvaluationContext = {}): Promise<boolean> {
    const cacheKey = `feature-flag:${flag}`;
    const cached = await this.cacheService.get<FlagRecord>(cacheKey);
    const record = cached ?? (await this.fetchAndCache(flag, cacheKey));
    if (!record) return false;
    if (!record.isEnabled) return false;
    if (!record.environments.includes(this.env)) return false;

    if (context.userId && record.allowedUserIds.includes(context.userId)) return true;
    if (context.role && record.allowedRoles.includes(context.role)) return true;

    if (record.rolloutPercent < 100 && context.userId) {
      return this.isInRollout(context.userId, flag, record.rolloutPercent);
    }
    return record.rolloutPercent === 100 || (!context.userId && !context.role);
  }

  public async getAll(): Promise<Record<string, boolean>> {
    const flags = await this.prisma.featureFlag.findMany({
      where: { isActive: true },
      select: { key: true, isEnabled: true, environments: true },
    });
    return Object.fromEntries(
      flags
        .filter((f) => (f.environments as string[]).includes(this.env))
        .map((f) => [f.key, f.isEnabled]),
    );
  }

  private async fetchAndCache(flag: FeatureFlag, cacheKey: string): Promise<FlagRecord | null> {
    const record = await this.prisma.featureFlag.findUnique({
      where: { key: flag, isActive: true },
      select: { isEnabled: true, rolloutPercent: true, allowedRoles: true, allowedUserIds: true, environments: true },
    });
    if (!record) return null;
    const shaped: FlagRecord = {
      isEnabled: record.isEnabled,
      rolloutPercent: record.rolloutPercent,
      allowedRoles: record.allowedRoles as string[],
      allowedUserIds: record.allowedUserIds as string[],
      environments: record.environments as string[],
    };
    await this.cacheService.set(cacheKey, shaped, this.CACHE_TTL);
    return shaped;
  }

  private isInRollout(userId: string, flag: FeatureFlag, percent: number): boolean {
    const hash = crypto.createHash('md5').update(`${flag}:${userId}`).digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    return bucket < percent;
  }
}
```

The hash-based rollout is deterministic — the same user always lands in the same bucket, giving them a consistent experience across requests and sessions.

## Step 4 — Register in the module providers

Add `FeatureFlagService` to the relevant `@Module({ providers: [...] })` in each backend service that needs flag evaluation.

## Step 5 — Using flags in services

```typescript
public async checkout(dto: CheckoutDto, user: AzureUser): Promise<ResponseDto<IOrder>> {
  const useNewFlow = await this.featureFlags.isEnabled(FeatureFlag.NEW_CHECKOUT_FLOW, { userId: user.id, role: user.role });
  return useNewFlow ? this.newCheckoutFlow(dto, user.id) : this.legacyCheckoutFlow(dto, user.id);
}
```

## Step 6 — Using flags in Angular

Expose a public, aggressively cached `/feature-flags` endpoint in `customer-api`:

```typescript
@Get()
@Version('1')
@ApiOperation({ summary: 'Get all feature flags' })
public async getFlags(): Promise<ResponseDto<Record<string, boolean>>> {
  return { isSuccessful: true, data: await this.featureFlagService.getAll() };
}
```

Signal-based Angular service:

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
}
```

## Step 7 — Managing flags via admin API

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/admin/feature-flags` | `SETTINGS_READ` | List all flags |
| PUT | `/admin/feature-flags/:key` | `SETTINGS_WRITE` | Enable/disable, adjust rollout |

Invalidate the flag's cache key immediately when updated via the admin API.

## Seed data

```typescript
export async function seedFeatureFlags(): Promise<void> {
  await prisma.featureFlag.createMany({
    data: [
      { id: crypto.randomUUID(), key: 'new-checkout-flow', description: 'New checkout flow', isEnabled: false, rolloutPercent: 0 },
      { id: crypto.randomUUID(), key: 'enhanced-search', description: 'Enhanced search with full-text', isEnabled: false, rolloutPercent: 0 },
    ],
    skipDuplicates: true,
  });
}
```

## Removing a flag after full rollout

1. Search the codebase for all `isEnabled(FeatureFlag.SOME_FLAG` usages
2. Remove the conditional, keep the new code path, delete the old one
3. Remove the constant from `FeatureFlag` in `common/types`
4. Add a migration to delete the row from `feature_flags`
5. Delete from seed data

Never leave dead flags in the codebase.

## Critical rules

Never hardcode flag state — always check `FeatureFlagService`. Never evaluate the same flag multiple times per request — call once, store the result locally. Never use flags for security gates — use RBAC permissions for access control. Always define flag keys as `FeatureFlag` constants, never raw strings. Always seed flags with `isEnabled: false` and `rolloutPercent: 0` — opt-in, not opt-out. `allowedRoles`/`allowedUserIds`/`environments` are `Json` columns, not Prisma scalar lists — MySQL doesn't support `String[]`.
