---
description: "Sync the latest agent, instruction, and rule files from project-olympus into a client project forked from it"
agent: "new-service-scaffold"
argument-hint: "Target project path, e.g. '../acme-portal'"
---

Sync the latest `.claude/` configuration from project-olympus into a forked client project:

**Target project:** {{ input }}

## What to sync

- `.claude/agents/*.md`
- `.claude/instructions/*.md`
- `.claude/rules/*.md`
- `.claude/skills/**`
- `.claude/hooks/*.sh`
- `.claude/commands/*.md`
- `.claude/templates/*.md`
- Root `CLAUDE.md` (merge carefully — the target project's own client-specific sections must be preserved)

## Process

1. Diff `.claude/` between this repo and the target project
2. For each changed/added file, present the diff before copying
3. Any file containing the literal string `project-olympus` in a package-scope or example-path context must be re-scoped to the target project's package name — don't copy the scope string verbatim
4. Confirm before overwriting any file the target project has clearly customized beyond the base template (check for content that diverges structurally, not just cosmetically, from this repo's version)
5. After sync, run `pnpm typecheck` in the target project to catch anything the sync broke

## Never

- Never overwrite the target project's `.env`, `.env.example`, or `.claude/settings.local.json`
- Never sync `.claude/settings.json` permissions blindly — review for target-project-specific commands first
- Never assume the target project's architecture is identical — a client project forked from project-olympus might still swap MySQL for a different provider, or add services this repo doesn't have
