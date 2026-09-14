# Alignment Audit: project-olympus ↔ node-mono-repo-template

**Date:** 2026-09-14
**Baseline:** `zynkosi-tech/zynkosi-tech-node-mono-repo-template` (read-only reference — not modified by this audit)
**Subject:** `prav-raghu/project-olympus-mono-repo`

## Scope

`project-olympus` and `node-mono-repo-template` are sibling monorepos built from the same
philosophy (pnpm + Turborepo, `common/*` shared packages, Claude Code driving the build) on
deliberately different stacks — Fastify/React/Next.js/Postgres/JWT vs. NestJS/Angular/MySQL/Azure
MSAL. Since project-olympus branched off, a number of fixes and process improvements have landed
in the template that never made it back to project-olympus. This document inventories those gaps
and proposes an alignment plan.

**Non-goal:** no part of this plan changes project-olympus's stack. It stays NestJS + Angular +
MySQL + MSAL throughout. Every recommendation below is the *stack-adapted equivalent* of a
template fix, not a copy-paste.

**Explicitly out of scope (correct, deliberate divergence — nothing to fix):** Fastify/AJV/React/
Next.js content in rules and agents (project-olympus is correctly NestJS/Angular already); the
`jwt-security` agent and its TOTP/MFA flow (Azure AD/MSAL owns MFA — there is no password login to
secure); the single `REDIS_URL`/`DATABASE_URL` convention (project-olympus's multi-schema
`DATABASE_URL_ADMIN/CUSTOMER/SCHEDULE/SHARED` is intentional and already documented in
project-olympus's own `CLAUDE.md`); `strapi-setup` (project-olympus uses Directus); semantic-release
scripts (project-olympus already standardises on Changesets, unlike the template's unused,
commented-out `version-control.yml`).

## How this was produced

Direct file-by-file comparison of both repos' `CLAUDE.md`, `.claude/agents/`, `.claude/rules/`,
`.claude/instructions/`, `.claude/commands/`, `.claude/skills/`, `.claude/hooks/`,
`.claude/settings.json`, `.husky/`, `lint-staged.config.mjs`, `.github/workflows/`, root
`package.json`, and the committed Prisma schema — plus targeted keyword searches for specific
fixes the template's own `CLAUDE.md` documents (quality gates, admin bootstrap, session
invalidation, disposable-email rejection, "no god structures"). Every finding below was verified
against the actual committed file content in both repos, not inferred from documentation alone.

---

## P0 — Security & release-safety gaps

### 1. CI is completely disabled; the Docker image pipeline ships ungated

- **Evidence:** `.github/workflows/ci.yml` (230 lines) and `pr-checks.yml` (125 lines) are
  entirely commented out in project-olympus. The template's equivalents —
  `continuous-integration.yml` (369 lines) and `pull-request-checks.yml` — are live: `install` →
  `lint`/`typecheck`/`build`/`test` → `quality-gate` (needs all four) → `docker-build` (needs
  `quality-gate`) → `deploy`. project-olympus's `docker-build.yml`, by contrast, is a *separate*,
  fully-enabled workflow that builds and pushes every service image to GHCR on every push to
  `main` with **no dependency on lint, typecheck, build, or test passing first**.
- **Why it matters:** broken code can reach `main` and be pushed to GHCR as a taggable, deployable
  image with zero automated checks. This is the exact gap the template's own `CLAUDE.md` flags
  under "Quality gates" (previously true there too, now fixed).
- **Fix:**
  - Uncomment `ci.yml` and `pr-checks.yml`. Both are already written for NestJS/Angular/MySQL/Azure
    (they already contain `DATABASE_URL_ADMIN/CUSTOMER/SCHEDULE/SHARED`, `AZURE_TENANT_ID`,
    `AZURE_CLIENT_ID`, `REDIS_URL` stub values) — this is a real re-enable, not a rewrite. Verify
    the job graph matches the template's dependency chain (`quality-gate` needs
    `[lint, typecheck, build, test]`).
  - Gate `docker-build.yml` on that `quality-gate` result — either fold the matrix build into
    `ci.yml` as a job that `needs: quality-gate` (matching the template's structure exactly), or
    keep it a separate workflow triggered by `workflow_run` on `ci.yml`'s successful completion
    rather than raw `push`.
  - Leave `security.yml`, `sonarcloud.yml` as-is — the template's equivalents (`security-scan.yml`)
    are *also* still commented out in the baseline, so there is no template fix to port there.

### 2. No RBAC admin-bootstrap pattern — first SUPER_ADMIN has no locked, one-time path

- **Evidence:** the template added a dedicated `POST /auth/bootstrap-admin` flow, gated by a
  `SystemBootstrap` singleton row (the lock, not a "does an admin exist" check) plus an
  `ADMIN_BOOTSTRAP_ENABLED` env kill-switch, that permanently 403s after first success. `grep` for
  `SUPER_ADMIN`/`bootstrap` across project-olympus's `rbac.md` agent and `common/auth/src` returns
  nothing — there is currently no documented, safe way to seed the first privileged user.
- **Why it matters:** without this, teams tend to improvise — a manual DB `UPDATE`, a
  temporarily-unauthenticated `/users` endpoint, a seed script left runnable in production. Any of
  those is a standing privilege-escalation path.
- **Fix (MSAL-adapted, not a copy):** project-olympus doesn't issue passwords or JWTs — Azure AD
  already authenticates the person. What's missing is the *authorization* side: the first row in
  project-olympus's own `Role`/`UserRole` tables. Port the same shape of guarantee:
  - A `SystemBootstrap` singleton row (`adminBootstrapped: Boolean`, `bootstrappedAt`,
    `bootstrappedByAzureObjectId`) as the actual lock.
  - A one-time, env-gated (`ADMIN_BOOTSTRAP_ENABLED`) endpoint on `admin-api`, reachable only to an
    **already-MSAL-authenticated** caller (no anonymous route — MSAL already proved who they are;
    this endpoint just grants the first `SUPER_ADMIN` role assignment), which flips the lock
    permanently on first success.
  - Document this in `.claude/agents/rbac.md` under a new "Admin bootstrap" section, parallel to
    the template's.

### 3. No documented "log out everywhere" / session-invalidation pattern

- **Evidence:** the template's `jwt-security.md` mandates a per-user `minIat` marker so logout
  invalidates every active session/device, not just the token that called logout. project-olympus
  has no equivalent concept anywhere — `grep` for `minIat`-equivalent language returns nothing.
- **Why it matters:** MSAL-issued access tokens are opaque to project-olympus's own backend once
  minted — Azure doesn't know about an app-level "log out all devices" action, and short token
  TTLs alone don't cover "I think my laptop was compromised, invalidate it now."
  This is a real gap, not one MSAL closes for free.
- **Fix (MSAL-adapted):** add a per-user `sessionEpoch`/`tokenVersion` integer, bumped on a
  "sign out everywhere" action, checked in `AzureAuthGuard` alongside MSAL token validation
  (reject if the token's issued-at predates the user's current epoch — same mechanism as the
  template's `minIat`, just layered on top of MSAL validation instead of replacing custom JWT
  validation). Document in `common/auth`'s agent coverage (`backend-service.md` or a new section
  in `rbac.md`).

### 4. Local safety guardrails are behind the template's

- **Evidence (`.claude/settings.json`):** project-olympus is missing:
  - The `PreToolUse` hook wired to `.claude/hooks/guard-main-branch.sh` (blocks `git commit`/
    `git push` while on `main`/`master` — the script itself doesn't even exist in project-olympus).
  - `git pull*` in the allow-list.
  - Deny entries for `git reset*`, `git clean*`, `git checkout -- *`, `git restore *`,
    `docker system prune*`, `docker volume rm*`, `docker compose down -v*`,
    `docker-compose down -v*`, `terraform destroy*`, `kubectl delete*`.
- **Fix:** copy `guard-main-branch.sh` into project-olympus's `.claude/hooks/` verbatim (it's
  stack-agnostic — pure git branch guarding) and wire the same `PreToolUse` hook + expand the
  allow/deny lists to match.

### 5. Pre-commit hook and lint-staged don't actually gate what CLAUDE.md claims

- **Evidence:** `.husky/pre-commit` runs only `pnpm lint-staged`; the template also runs
  `pnpm typecheck`. `lint-staged.config.mjs` runs only `prettier --write` on staged `.ts`/`.js`
  files; the template also runs `pnpm exec eslint --fix`.
- **Fix:** add `pnpm typecheck` to `.husky/pre-commit`, and `pnpm exec eslint --fix` to the
  `*.{ts,tsx}` / `*.{js,jsx,cjs,mjs}` lint-staged globs, matching the template exactly (this part
  is 100% stack-agnostic tooling).

---

## P1 — Content restored from rules/instructions (real regressions, not stack differences)

### 6. `rules/prisma.md` contradicts project-olympus's own committed schema

- **Evidence:** project-olympus's rule flatly states "No exceptions" to the six-base-field
  requirement. But `WebhookDelivery` in both `schema.admin.prisma` and `schema.shared.prisma` is
  already committed *without* `createdBy`/`modifiedBy` — it's a system-mutated, never
  human-actioned row, exactly the template's sanctioned "exception #2" shape. The rule as written
  is simply wrong today.
- **Fix:** restore the template's "Two sanctioned exceptions" section (append-only rows; and
  system-owned/internally-mutated-but-never-human-actioned rows keep `updatedAt` but may drop
  `createdBy`/`modifiedBy`), reworded for MySQL/camelCase, using `WebhookDelivery` as the
  in-repo example (the template uses its own `webhook_delivery` the same way).
- Also restore, adapted to MySQL/camelCase/PascalCase-model naming:
  - **Relations** guidance (`onDelete: Cascade` for children, `onDelete: SetNull` for optional refs,
    `@@index` on every FK — currently absent from project-olympus's rule entirely).
  - **Composite index** examples for common query patterns.
  - **Optimistic locking** (`version Int @default(1)`) for concurrent-write-risk entities.
  - **Idempotency key** column pattern for write-heavy transactional entities.
  - **Seed data** pattern/example, calling out `common/database/prisma/seed.ts`'s `main()`.

### 7. `rules/testing.md` dropped coverage enforcement and env-var guidance

- **Evidence:** the template enforces `branches: 75% / functions: 80% / lines: 80% / statements:
  80%` via `jest.config.ts`, documents `list`-method and optimistic-lock coverage rows, and lists
  required `.env.example` test vars. None of this survived in project-olympus's `rules/testing.md`.
- **Fix:** restore the coverage-threshold table and the `list`-method coverage row (cache/cursor
  behaviour still applies to NestJS services); restore a Test Environment Variables section
  scoped to project-olympus's actual needs (`TEST_DATABASE_URL` as a MySQL connection string,
  Azure test-tenant values if applicable — **not** `JWT_SECRET`, which doesn't apply here). Verify
  the coverage thresholds are actually wired into each service's `jest.config.ts` — this audit
  found the rule text missing but did not verify every service's Jest config; that check should
  happen alongside the rule restoration.

### 8. Date-handling guidance is gone, not just moved

- **Evidence:** the template's `rules/frontend.md` has a "Dates — display as dd/MM/yyyy" section
  pointing at a dedicated `date-handling.instructions.md`. project-olympus's `rules/frontend.md`
  dropped the section entirely (correctly dropped the MFA-enrollment section next to it, since
  Azure AD owns MFA — but the date section has nothing to do with auth and its removal looks like
  collateral damage, not a deliberate call). There is no `date-handling.instructions.md` in
  project-olympus at all.
- **Fix:** add `.claude/instructions/date-handling.instructions.md` (DB stores `DateTime`/UTC —
  true regardless of MySQL vs. Postgres; wire format is ISO 8601 both directions; on-screen display
  is `dd/MM/yyyy` (+ optional `HH:mm:ss`) via `date-fns` in Angular — same library, same rule, just
  Angular components instead of React). Restore the corresponding section in `rules/frontend.md`.

### 9. Disposable-email-domain rejection isn't documented

- **Evidence:** the template's `validation-chain.instructions.md` requires service-layer rejection
  of disposable email domains, not just syntax checks. `grep -r disposable` across project-olympus
  returns nothing.
- **Fix:** add the equivalent section to project-olympus's `validation-chain.instructions.md` — the
  requirement is backend-framework-agnostic (service-layer check, not an AJV/class-validator
  concern either way).

### 10. No "no god structures" naming rule

- **Evidence:** the template's `CLAUDE.md` non-negotiable rules include a rule against naming a
  controller/service/DTO after the project/app itself as a catch-all (e.g. a hypothetical
  `olympus.controller.ts`/`olympus.service.ts`), requiring per-entity files instead, with
  composition happening only at the controller/route layer. project-olympus's `CLAUDE.md` has no
  such rule, and `grep` for "god structure" across all of project-olympus's `.claude/` returns
  nothing.
- **Fix:** add the same rule (framework-agnostic — applies identically to NestJS
  modules/controllers/services) to project-olympus's `CLAUDE.md` non-negotiable rules, and
  cross-reference it from `backend-service.md`/`api-builder.md` the same way the template does.

---

## P2 — Governance & tooling parity

### 11. No "Instruction precedence" section

The template's `CLAUDE.md` opens with an explicit precedence order (user request → security
constraints → committed code/config → path rules → selected subagent → this file → instructions →
legacy commands) and a rule to ask rather than silently pick when sources genuinely conflict.
project-olympus's `CLAUDE.md` has no such section. **Fix:** add the same section, unchanged — it's
pure process, not stack-specific.

### 12. No "Model selection when delegating to a subagent" guidance

- **Evidence:** the template documents concrete criteria for when a subagent call may be
  downgraded to Haiku (unambiguous existing pattern, nothing security/auth/RBAC/payment/PII-
  adjacent, mechanically-checkable, single-file blast radius) and an explicit never-downgrade list
  (`rbac`, `database-migrations`, `domain-modeler`, `code-review`, `typescript-standards`,
  `deployment-coolify`, `infrastructure`, `vps-bootstrap`, `enterprise-scale`,
  `full-stack-orchestrator`, `audit-log`, `webhook-events`, `common-packages`,
  `relational-database`, plus `jwt-security` in the template — not applicable here). It applies
  this by setting `model: claude-haiku-4-5-20251001` on `new-service-scaffold.md` and `testing.md`.
  project-olympus has no such section, and both of those agents are still `model: inherit`.
- **Fix:** add the equivalent section to project-olympus's `CLAUDE.md` (drop `jwt-security` from
  the never-override list, since it doesn't exist here; the rest of the list maps 1:1 by agent
  name), and set `model: claude-haiku-4-5-20251001` on project-olympus's `new-service-scaffold.md`
  and `testing.md` frontmatter.

### 13. Design-taste skill stack and SEO skill are missing

- **Evidence:** the template added `impeccable`, `emil-design-eng`, and `design-taste-frontend`
  (`taste-skill`) as an additive anti-slop/polish layer on top of `ui-ux-pro-max`/`build-page`, plus
  a `/seo-optimization` skill for its Next.js customer-web. None of the four exist in
  project-olympus's `.claude/skills/`.
- **Fix:**
  - Vendor `impeccable` and `emil-design-eng` as-is (Apache-2.0/MIT, framework-agnostic UI critique
    — they operate on rendered output and general design taste, not React/Next-specific code) —
    same process the template used (see each skill's `SOURCE.md` for how to pull the vendored
    commit).
  - Vendor `taste-skill`, keeping its own documented scope limit (marketing/landing/portfolio
    pages only, explicitly not admin dashboards) — applies to `customer-web`'s public-facing pages
    only, same as the template's guidance for its own `customer-web`.
  - **Do not copy `seo-optimization.md` verbatim** — it's written for Next.js App Router
    (`generateMetadata`, `sitemap.ts`, Next-specific structured data). project-olympus's
    `customer-web` is Angular. A genuinely adapted version needs Angular's `Title`/`Meta` services,
    an Angular-appropriate sitemap approach, and a check on whether `customer-web` runs Angular
    Universal/SSR at all (SEO guidance changes materially if it's CSR-only) before it can be
    written — flagged here as a real task, not a copy-paste.
  - Add the "Design taste stack" explanatory section to project-olympus's `CLAUDE.md`, reworded for
    Angular (no Next.js/React mentions), and list the new skills in the skills table.

### 14. No Claude Mem memory section (lowest priority — developer experience, not correctness)

The template documents per-developer Claude Mem setup (cross-session memory, replacing Serena).
This is optional tooling guidance with no correctness impact — recommended as a P3/nice-to-have
documentation addition only if the team wants it, not a functional gap.

---

## P3 — Minor parity items

### 15. `/deploy-coolify` command wrapper missing

project-olympus has a full `deployment-coolify` agent and documents Coolify as a supported
secondary deploy path, but (unlike the template) has no `.claude/commands/deploy-coolify.md` thin
wrapper. Low priority — the agent auto-invokes by description match regardless — but worth adding
for interface parity with the template and with project-olympus's own documented command list.

### 16. `/request-logging` command wrapper missing

project-olympus has `request-logging.instructions.md` but no command wrapper, unlike the template
(which has both). Same reasoning as #15 — cosmetic parity only.

---

## Explicitly not carried over

| Template item | Why it doesn't apply |
|---|---|
| `jwt-security` agent, TOTP/MFA flow, refresh-token rotation, cookie config | Azure MSAL owns authentication and MFA entirely; there is no password login or custom JWT issuance to secure |
| Fastify plugin registration order, AJV schemas, React/Next.js patterns everywhere | project-olympus is correctly NestJS/Angular already |
| Single `REDIS_URL`/`DATABASE_URL` convention | project-olympus's multi-schema `DATABASE_URL_ADMIN/CUSTOMER/SCHEDULE/SHARED` is a deliberate, already-documented divergence |
| `strapi-setup` command | project-olympus uses Directus for CMS |
| `semantic-release`/`version-control.yml` | project-olympus already standardises on Changesets; the template's own semantic-release workflow is itself unused/commented |
| Phone-regex/SMSPortal/Hetzner region defaults | Both projects are already South Africa-based; no fork-time swap needed here (unlike the template's own "check on fork" note, which exists for future forks of *it*) |

---

## Proposed sequencing

1. **Phase 1 (P0 — do first, security/release-safety):** items 1–5. These are the ones with real
   exposure — ungated deploys, no admin-bootstrap lock, no session revocation, weak local
   guardrails.
2. **Phase 2 (P1 — content restoration):** items 6–10. Mostly documentation/rule-file edits, one of
   which (item 6) is fixing a rule that already contradicts committed code.
3. **Phase 3 (P2 — governance & design tooling):** items 11–13. Process documentation plus vendoring
   three skills and adapting one.
4. **Phase 4 (P3 — polish):** items 15–16.

Each phase is independently shippable and none require a stack change — every fix is scoped to
`.claude/`, `.github/workflows/`, `.husky/`, `lint-staged.config.mjs`, root `package.json`, and (for
items 3 and 6) the RBAC/auth service layer and Prisma schema documentation.
