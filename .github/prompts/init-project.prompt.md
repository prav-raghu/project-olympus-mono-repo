---
description: "Initialize the monorepo for a new project - rename scope, install deps, set up env, run prisma generate"
agent: "New Service Scaffold Agent"
argument-hint: "Project name and scope, e.g. 'burger-shop with scope @burger-shop'"
---

Set up this monorepo template for a new project:

**Project:** {{ input }}

## Steps

1. Rename `@project-olympus` to the new project scope in ALL of the following:
   - Every `package.json` `name` and `dependencies` field in `apps/` and `common/`
   - Root `package.json` and `pnpm-workspace.yaml` if referenced
   - `tsconfig.base.json` path alias mappings
   - `commitlint.config.mjs` scope references
   - All `.github/agents/*.agent.md` files (code examples use the scope in imports)
   - All `.github/instructions/*.instructions.md` files (code examples use the scope)
   - `CLAUDE.md` package scope reference
2. Create `.env` files for each backend service with proper defaults
3. Create `.env.example` files with placeholder values
4. Run `pnpm install` from the root
5. Run `pnpm --filter @{new-scope}/database prisma:generate`
6. Verify the build works: `pnpm build`
7. List the dev commands to start working
