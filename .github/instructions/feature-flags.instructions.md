---
applyTo: "apps/**,common/config/src/**"
description: "Feature flag conventions - DB-backed flags, FeatureFlag constants, evaluation context, and flag cleanup"
---

When adding or checking feature flags:

## The Contract

- Flag key → `FeatureFlag` constant in `common/types/src/feature-flags.ts`
- Flag evaluation → `FeatureFlagService.isEnabled(flag, { userId, role })`
- Flag state → stored in `feature_flags` table, cached 60s in Redis
- Flag UI → admin-api CRUD + `/api/feature-flags` endpoint for frontend

## Always Pass Context

```typescript
const enabled = await this.featureFlags.isEnabled(FeatureFlag.ENHANCED_SEARCH, {
  userId: req.user.id,
  role: req.user.role,
});
```

Without `userId`, percentage rollouts have no user to hash — the flag defaults to fully on or off based on `rollout_percent`.

## Flag Evaluation Priority

1. `allowed_user_ids` match → enabled (overrides rollout)
2. `allowed_roles` match → enabled (overrides rollout)
3. `rollout_percent` hash → deterministic bucket check
4. `is_enabled: false` → always disabled regardless of context

## Call Once Per Request

Evaluate a flag once at the entry point (service method or controller) and pass the result down. Never call `isEnabled` inside a loop.

## Flags Are Not Security

A disabled flag returns `false` — it does not return 403. For access control, use RBAC permissions. Flags are for gradual rollout and A/B testing, not authorization.

## Cleanup Signal

A flag is ready to remove when:
- `rollout_percent` has been 100 for at least one full release cycle
- No regression has been reported
- The legacy code path behind the flag has been fully deleted

At that point: remove the constant, delete the conditional, drop the DB row, remove from seed.
