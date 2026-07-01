---
description: "Provision Azure infrastructure using Terraform for a given environment"
agent: "infrastructure"
argument-hint: "Environment and scope, e.g. 'dev environment full stack' or 'prod MySQL and Redis only'"
---

Provision Azure infrastructure for:

**Request:** {{ input }}

## Process

1. Review existing Terraform modules under `infrastructure/terraform/azure/modules/` to avoid duplication
2. Create or update the relevant module(s): networking, ACR, Azure Database for MySQL Flexible Server, Redis, Key Vault, compute (Container Apps/AKS), storage, CDN
3. Define variables with validation blocks, expose necessary outputs (`sensitive = true` for anything credential-shaped)
4. Update the target environment's `.tfvars` file
5. Ensure secret management uses Azure Key Vault — never plaintext `.tf` values — for MSAL client secrets, MySQL admin credentials, and any API keys
6. Run `terraform fmt -recursive` and `terraform validate`
7. Present the `terraform plan` output before applying — never `apply` without explicit confirmation

See `infrastructure.md` for the authoritative port map and the known drift between current `.tf`/Dockerfile/k8s contents and this project's actual MySQL + MSAL architecture — reconcile any stale Postgres/JWT references you encounter along the way rather than propagating them.
