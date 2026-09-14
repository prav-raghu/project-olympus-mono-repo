---
description: "Set up Coolify deployment for this project — per-app Dockerfiles, the root docker-compose stack, and the Coolify configuration checklist"
agent: "deployment-coolify"
argument-hint: "Project name and domain, e.g. 'burger-shop, burgershop.co.za'"
---

Use the `deployment-coolify` subagent to set up the additional self-hosted Coolify deployment path for: **{{ input }}**

Azure remains this project's primary deployment target — Coolify is a second, self-hosted path (see `infrastructure.md` and `.claude/agents/deployment-coolify.md`'s "Non-negotiable rules"). Assumes the target VPS has already been bootstrapped and Coolify installed — if not, run `vps-bootstrap` first.

See `.claude/agents/deployment-coolify.md` for the full reference: image build strategy (GitHub Actions builds, Coolify only pulls from GHCR), Dockerfile locations, the root `docker-compose.yaml` single-stack layout, managed MySQL/Redis, the post-deploy migration step, and DNS setup. If this command and that agent ever disagree, the agent file and the committed `docker-compose.yaml` win.
