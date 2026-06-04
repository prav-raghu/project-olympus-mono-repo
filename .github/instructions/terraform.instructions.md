---
applyTo: "infrastructure/terraform/**"
description: "Terraform conventions for this monorepo - modular structure, naming, variables, security, and tagging"
---

When editing Terraform files:

- NEVER hardcode credentials, connection strings, or secrets — use variables with `sensitive = true`
- NEVER put everything in a single `main.tf` — use modules under `modules/`
- Resource naming: `{project_name}-{environment}-{resource_type}` (e.g., `burger-shop-prod-rds`)
- Variables: `snake_case` with `description`, `type`, and `default` where sensible
- Use `validation` blocks on constrained variables (environment, region, instance sizes)
- Outputs: `snake_case`, mark credential outputs as `sensitive = true`
- ALL resources must include tags: `Project`, `Environment`, `ManagedBy = "terraform"`
- Database and Redis must be in private subnets — never public
- State must be remote with encryption and locking (S3+DynamoDB or azurerm backend)
- Create per-environment variable files: `environments/dev.tfvars`, `staging.tfvars`, `prod.tfvars`
- Commit `terraform.tfvars.example` only — actual `.tfvars` with secrets is gitignored
- Run `terraform fmt -recursive` before committing
