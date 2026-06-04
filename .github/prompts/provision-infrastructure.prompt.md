---
description: "Provision cloud infrastructure for the monorepo - generates Terraform modules for networking, database, cache, compute, and CDN"
agent: "Infrastructure Agent"
argument-hint: "Cloud provider and requirements, e.g. 'AWS with ECS Fargate, RDS Postgres, ElastiCache Redis, CloudFront for frontends'"
---

Provision cloud infrastructure for this monorepo:

**Requirements:** {{ input }}

## What to Generate

1. Restructure `infrastructure/terraform/` into proper modules
2. Create `versions.tf` with provider version constraints
3. Create `variables.tf` with all inputs (project name, environment, region, instance sizes)
4. Create `outputs.tf` exposing connection strings, endpoints, and resource IDs
5. Create modules for each resource group (networking, database, cache, compute, storage, cdn, dns, secrets)
6. Create environment-specific variable files (dev.tfvars, staging.tfvars, prod.tfvars)
7. Create a remote state backend configuration
8. Create `terraform.tfvars.example` with placeholder values

Ensure all services (api-gateway, customer-api, admin-api, schedule-api, customer-web, admin-web) have the resources they need:
- Managed PostgreSQL with private subnet access
- Managed Redis with encryption in transit
- Container orchestration for backend services
- Static/CDN hosting for frontend apps
- Secret management for JWT keys, DB credentials
- Load balancer with SSL termination

Tag all resources with Project, Environment, ManagedBy.
