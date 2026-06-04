---
description: "Sync the latest agent and instruction files from the project-olympus into this project"
agent: "New Service Scaffold Agent"
argument-hint: "Absolute path to the template repo, e.g. 'C:/Development/project-olympus'"
---

Sync agent and instruction files from the base template into this project.

**Template path:** {{ input }}

## Step 1 — Detect this project's scope

Read `package.json` at the root of THIS project and extract the scope from the `name` field.
For example, if `name` is `@mr-john-bakery/root`, the scope is `@mr-john-bakery`.
Store this as `{PROJECT_SCOPE}` for use in step 3.

## Step 2 — Copy new and updated files

Copy every file listed below from `{template-path}` into the equivalent path in this project.
If a file already exists, overwrite it. If a directory does not exist, create it first.

### New agent files to copy

```
.github/agents/testing.agent.md
.github/agents/rbac.agent.md
.github/agents/mobile.agent.md
.github/agents/webhook-events.agent.md
.github/agents/feature-flags.agent.md
```

### New instruction files to copy

```
.github/instructions/testing.instructions.md
.github/instructions/api-response.instructions.md
.github/instructions/rbac.instructions.md
.github/instructions/mobile.instructions.md
.github/instructions/webhook-events.instructions.md
.github/instructions/feature-flags.instructions.md
.github/instructions/database-migrations.instructions.md
.github/instructions/openapi.instructions.md
.github/instructions/audit-log.instructions.md
```

### Updated files to overwrite

```
.github/agents/new-service-scaffold.agent.md
.github/instructions/backend-schemas.instructions.md
.github/prompts/init-project.prompt.md
.github/prompts/sync-from-template.prompt.md
```

## Step 3 — Replace scope placeholder in all copied files

In every file copied in step 2, replace every occurrence of:

```
@project-olympus
```

with:

```
{PROJECT_SCOPE}
```

This ensures import examples and package references match this project's actual scope.

## Step 4 — Merge CLAUDE.md entries

Open `CLAUDE.md` in this project. Find the "Read these files first" section.

If any of the following lines are NOT already present, add them:

```
7. `.github/instructions/api-response.instructions.md`
8. `.github/instructions/rbac.instructions.md`
```

If a "For domain-specific work, also read the relevant agent:" section does NOT exist, add it after the numbered list:

```markdown
For domain-specific work, also read the relevant agent:

- **Testing**: `.github/agents/testing.agent.md` + `.github/instructions/testing.instructions.md`
- **RBAC / Permissions**: `.github/agents/rbac.agent.md`
- **Mobile**: `.github/agents/mobile.agent.md` + `.github/instructions/mobile.instructions.md`
- **Webhooks / Events**: `.github/agents/webhook-events.agent.md` + `.github/instructions/webhook-events.instructions.md`
- **Feature Flags**: `.github/agents/feature-flags.agent.md` + `.github/instructions/feature-flags.instructions.md`
- **Audit Logging**: `.github/instructions/audit-log.instructions.md`
- **Database Migrations**: `.github/instructions/database-migrations.instructions.md`
- **OpenAPI / Swagger**: `.github/instructions/openapi.instructions.md`
```

If the section already exists, add only the entries that are missing.

## Step 5 — Report

List:
- Files copied (new)
- Files overwritten (updated)
- CLAUDE.md lines added
- Scope replacement: `@project-olympus` → `{PROJECT_SCOPE}`
- Any files that were skipped because they already matched

## What this sync does NOT do

This prompt copies documentation only. It does NOT:
- Modify application source code
- Create Prisma migrations
- Install packages

To implement the patterns described in the new files, run the relevant agent prompt
against this project after the sync:
- RBAC guard implementation → run `/rbac-agent` with your route requirements
- Audit log table → run the Domain Modeler Agent to add `audit_log` to Prisma schema
- Feature flags table → run the Domain Modeler Agent to add `feature_flag` to Prisma schema
- OpenAPI setup → run the Backend Service Agent with "add Swagger to {service-name}"
- Webhook delivery worker → run the Webhook Events Agent
