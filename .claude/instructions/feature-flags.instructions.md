---
applyTo: "apps/**,common/config/src/**"
description: "Feature flag conventions - DB-backed flags, FeatureFlag constants, evaluation context, and flag cleanup"
---

When adding or checking feature flags:

## The contract

- Flag key → `FeatureFlag` constant in `common/types/src/feature-flags.ts`
- Flag evaluation → `FeatureFlagService.isEnabled(flag, { userId, role })`
- Flag state → stored in the `feature_flags` table (`schema.shared.prisma`), cached 60s in Redis
- Flag UI → admin-api CRUD + `/api/feature-flags` endpoint for the frontend
- `allowedRoles`/`allowedUserIds`/`environments` are `Json` columns, not Prisma scalar arrays — MySQL doesn't support `String[]`

## Always pass context

```typescript
const enabled = await this.featureFlags.isEnabled(FeatureFlag.ENHANCED_SEARCH, {
  userId: user.id,
  role: user.role,
});
```

Without `userId`, percentage rollouts have no user to hash — the flag defaults to fully on or off based on `rolloutPercent`.

## Flag evaluation priority

1. `allowedUserIds` match → enabled (overrides rollout)
2. `allowedRoles` match → enabled (overrides rollout)
3. `rolloutPercent` hash → deterministic bucket check
4. `isEnabled: false` → always disabled regardless of context

## Call once per request

Evaluate a flag once at the entry point (service method or controller) and pass the result down. Never call `isEnabled` inside a loop.

## Flags are not security

A disabled flag returns `false` — it does not return 403. For access control, use RBAC permissions (`rbac.instructions.md`). Flags are for gradual rollout and A/B testing, not authorization.

## Cleanup signal

A flag is ready to remove when:
- `rolloutPercent` has been 100 for at least one full release cycle
- No regression has been reported
- The legacy code path behind the flag has been fully deleted

At that point: remove the constant, delete the conditional, drop the DB row, remove from seed.
