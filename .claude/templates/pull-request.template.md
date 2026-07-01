# Pull Request Template

## Summary

<!-- One or two sentences: what does this PR do and why -->

## Type of change

- [ ] New feature
- [ ] Bug fix
- [ ] Refactor (no functional change)
- [ ] Database schema change
- [ ] Infrastructure change
- [ ] Documentation

## Scope

- [ ] Backend — which service(s): `api-gateway` / `admin-api` / `customer-api` / `schedule-api`
- [ ] Frontend — which app(s): `admin-web` / `customer-web`
- [ ] Mobile — `customer-mobile`
- [ ] Database schema — which `schema.*.prisma` file(s)
- [ ] `common/*` package — which one(s)
- [ ] Infrastructure — Terraform / Docker / Kubernetes / NGINX

## Checklist

- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm test` passes
- [ ] No `any` types introduced
- [ ] No hardcoded secrets
- [ ] New DTOs use `class-validator` decorators (never plain interfaces)
- [ ] New Prisma models include all six standard fields and follow `relational-database.md`/`rules/prisma.md`
- [ ] New endpoints protected by `AzureAuthGuard` + `@RequirePermissions` where appropriate
- [ ] New forms implement the full validation chain (`validation-chain.instructions.md`) — client `Validators` → inline error, server error → `serverError`/toast
- [ ] New frontend pages have loading, error, and empty states
- [ ] Swagger annotations added for new/changed endpoints
- [ ] Migration file included if the Prisma schema changed (not run — left for reviewer/CI)
- [ ] `.env.example` updated if new environment variables were introduced

## Database changes

<!-- If this PR includes a Prisma schema change, list the migration name and summarize the change. Note whether it's backward compatible with the currently-deployed app version. -->

## Screenshots (frontend changes)

<!-- Before/after screenshots for UI changes -->

## Related issues

<!-- Link any related tickets -->
