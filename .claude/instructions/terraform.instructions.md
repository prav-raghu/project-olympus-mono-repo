---
applyTo: "infrastructure/terraform/**"
description: "Terraform conventions for this monorepo - modular structure, naming, variables, security, and tagging (Azure only)"
---

When editing Terraform files:

- This project provisions **Azure only** — never introduce AWS or GCP resources/providers
- NEVER hardcode credentials, connection strings, or secrets — use variables with `sensitive = true`, backed by Azure Key Vault
- NEVER put everything in a single `main.tf` — use modules under `modules/`
- Resource naming: `{project_name}-{environment}-{resource_type}` (e.g. `project-olympus-prod-mysql`)
- Variables: `snake_case` with `description`, `type`, and `default` where sensible
- Use `validation` blocks on constrained variables (environment, region, SKU/tier)
- Outputs: `snake_case`, mark credential outputs as `sensitive = true`
- ALL resources must include tags: `Project`, `Environment`, `ManagedBy = "terraform"`
- MySQL and Redis must be in private subnets — never public
- State must be remote with encryption and locking (`azurerm` backend)
- Create per-environment variable files: `environments/dev.tfvars`, `qa.tfvars`, `prod.tfvars`
- Commit `terraform.tfvars.example` only — actual `.tfvars` with secrets is gitignored
- Run `terraform fmt -recursive` before committing

See `infrastructure.md` for the full module layout and the currently-known drift between this file's rules and what's actually checked into `infrastructure/terraform/azure/main.tf` today (stale port locals from an earlier Postgres-based iteration).
