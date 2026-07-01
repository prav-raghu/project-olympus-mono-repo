---
applyTo: "**/*.ts,**/*.tsx"
description: "TypeScript build validation — must pass before any task is considered complete"
---

# TypeScript build validation

Every TypeScript project in this monorepo must pass a strict build before any task is considered complete. This is non-negotiable.

## Required checks before marking any task as done

```bash
pnpm --filter <app-name> typecheck
```

Or for a full monorepo check:

```bash
pnpm typecheck
```

If either command produces errors, the task is NOT complete. Fix all errors before finishing.

## Rules

- Never assume `ng serve`, `nest start --watch`, or `ts-node` passing means the code is type-safe. They do not run full type checking.
- Never use `any` unless explicitly instructed by the user.
- Never cast with `as` to silence a type error — fix the underlying type.
- Never add `// @ts-ignore` or `// @ts-expect-error` unless explicitly instructed by the user.
- All shared types must be defined correctly at the source. Do not patch call sites to work around a broken type definition.
- When introducing a new shared type or utility function, verify all existing usages still compile after the change.
- When adding a new component input, verify all existing usages of that component still compile.
- `typecheck` must pass with zero errors before any task is marked complete.
- Zero new SonarQube issues on the affected package.

## Query function generics

Utility functions that accept query objects must use a generic constraint, not `Record<string, unknown>`:

```typescript
function buildQuery<T extends object>(query?: T): string
```

Never type query parameters as `Record<string, unknown>` — this breaks all typed query interfaces.

## Component input/prop variants

Only use variant values that are explicitly declared in the component's prop/input types. Never pass a value that isn't in the union — fix the component or the call site, do not cast.
