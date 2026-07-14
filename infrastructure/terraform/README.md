# Terraform Infrastructure — project-olympus

Modular Terraform configurations for deploying project-olympus's NestJS backend services and Angular frontends. **Azure is this project's primary, canonical deployment target** — see `azure/` and the root `CLAUDE.md` "Deployment" section. `aws/` and `gcp/` mirror the same module structure for multi-cloud parity (structurally aligned with the pattern used by the `zynkosi-tech` sibling template) but are **not provisioned or used today** — they exist so the requirement can be picked up later without a redesign. Flesh out state-backend bootstrapping and real secret values before running `terraform init`/`plan`/`apply` against either.

A fourth deployment path — Coolify on a self-hosted VPS — also exists outside Terraform entirely; see the root `docker-compose.yaml` and the `deployment-coolify`/`vps-bootstrap` agents.

## Provider Comparison

| Component | Azure (canonical) | AWS (stub) | GCP (stub) |
|---|---|---|---|
| **Backend services** | Container Apps / AKS | ECS Fargate | Cloud Run v2 |
| **MySQL** | Azure Database for MySQL Flexible Server | RDS for MySQL | Cloud SQL for MySQL |
| **Redis cache** | Azure Cache for Redis | ElastiCache | Memorystore |
| **Container registry** | ACR (shared) | ECR (per service) | Artifact Registry |
| **Frontend SPA hosting** | Blob Storage + Azure CDN | S3 + CloudFront | Cloud Storage + Cloud CDN |
| **Secrets** | Key Vault | Secrets Manager | Secret Manager |
| **Networking** | VNet + private endpoints | VPC + NAT Gateway | VPC + Serverless VPC Connector |
| **State backend** | Azure Blob Storage | S3 + DynamoDB | GCS bucket |
| **Default region** | `southafricanorth` (Johannesburg) | `af-south-1` (Cape Town) | `africa-south1` (Johannesburg) |

---

## Directory Structure

```
infrastructure/terraform/
├── azure/                              # Canonical — see azure/ and infrastructure.md
├── aws/
│   ├── providers.tf                    # AWS provider + S3/DynamoDB state backend
│   ├── variables.tf                    # All input variables
│   ├── main.tf                         # Root module wiring (for_each over backend services + frontends)
│   ├── outputs.tf
│   ├── terraform.tfvars.example        # Copy → terraform.tfvars and fill in secrets
│   ├── environments/
│   │   ├── dev.tfvars
│   │   ├── staging.tfvars
│   │   └── prod.tfvars
│   └── modules/
│       ├── networking/                 # VPC, subnets, IGW, NAT, security groups
│       ├── ecs/                        # Reusable ECS Fargate service + optional public ALB + Cloud Map
│       ├── elasticache/                # Redis ElastiCache (private VPC)
│       ├── rds-mysql/                  # Single RDS MySQL instance, 4 logical databases (app_admin/customer/schedule/shared)
│       ├── ecr/                        # Container registry per service
│       ├── static-site/                # S3 + CloudFront OAC for admin-web / customer-web
│       └── secrets/                    # Secrets Manager
└── gcp/
    ├── providers.tf                    # GCP provider + GCS state backend
    ├── variables.tf
    ├── main.tf                         # Root module wiring (for_each over backend services + frontends)
    ├── outputs.tf
    ├── terraform.tfvars.example
    ├── environments/
    │   ├── dev.tfvars
    │   ├── staging.tfvars
    │   └── prod.tfvars
    └── modules/
        ├── networking/                 # VPC, subnet, Serverless VPC Connector, Cloud NAT
        ├── cloud-run/                  # Reusable Cloud Run v2 service, internal ingress for non-gateway services
        ├── memorystore/                # Redis Memorystore
        ├── cloud-sql-mysql/            # Single Cloud SQL MySQL instance, 4 logical databases
        ├── artifact-registry/          # Docker repo + cleanup policies
        ├── static-site/                # GCS bucket + Cloud CDN + HTTPS LB
        └── secret-manager/             # Secret Manager
```

This mirrors the five NestJS services (`api-gateway`, `admin-api`, `customer-api`, `schedule-api`, `partner-api`) and two Angular SPAs (`admin-web`, `customer-web`) — see `infrastructure.md` for the authoritative port map. `api-gateway` is the only publicly routed backend service in all three clouds; the rest are reachable only over internal networking (Cloud Map DNS on AWS, `INGRESS_TRAFFIC_INTERNAL_ONLY` on GCP, private endpoints on Azure), matching the gateway-in-front architecture already documented for the Azure path.

## Known gap — orphaned root `main.tf`

`infrastructure/terraform/main.tf` (the file directly in this directory, not inside `azure/`, `aws/`, or `gcp/`) is leftover generic AWS example code from a prior template fork and does not match this directory structure or project. It is not referenced by anything and should not be run. Left in place pending an explicit decision from the developer on whether to delete it.

---

## AWS Deployment (stub — not provisioned)

### Prerequisites

- Terraform >= 1.7.0
- AWS CLI authenticated (`aws configure` or IAM role)
- An AWS account with sufficient permissions

### One-Time Setup

```bash
aws s3api create-bucket \
  --bucket project-olympus-tfstate \
  --region af-south-1 \
  --create-bucket-configuration LocationConstraint=af-south-1

aws s3api put-bucket-versioning \
  --bucket project-olympus-tfstate \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket project-olympus-tfstate \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws dynamodb create-table \
  --table-name project-olympus-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region af-south-1
```

### Deploy

```bash
cd infrastructure/terraform/aws
cp terraform.tfvars.example terraform.tfvars
# fill in image URIs, Azure MSAL values, mysql_master_password, etc.

terraform init
terraform plan -var-file=environments/dev.tfvars -var-file=terraform.tfvars
terraform apply -var-file=environments/dev.tfvars -var-file=terraform.tfvars
```

---

## GCP Deployment (stub — not provisioned)

### Prerequisites

- Terraform >= 1.7.0
- `gcloud` CLI authenticated (`gcloud auth application-default login`)
- A GCP project with billing enabled

### One-Time Setup

```bash
gcloud storage buckets create gs://project-olympus-tfstate \
  --project=YOUR_PROJECT_ID \
  --location=africa-south1 \
  --uniform-bucket-level-access
```

### Deploy

```bash
cd infrastructure/terraform/gcp
cp terraform.tfvars.example terraform.tfvars
# fill in gcp_project_id, image URIs, Azure MSAL values, mysql_master_password, etc.

terraform init
terraform plan -var-file=environments/dev.tfvars -var-file=terraform.tfvars
terraform apply -var-file=environments/dev.tfvars -var-file=terraform.tfvars
```

---

## Security Notes

- All secrets are stored in the provider's managed secrets service — never in `.tfvars` files committed to git
- `terraform.tfvars` is gitignored; only `terraform.tfvars.example` is committed
- MySQL and Redis are private-network-only in both AWS and GCP stubs, matching the Azure path's "never publicly exposed" rule
- Auth (`AZURE_*` MSAL variables) is identical across all three cloud paths — MSAL does not change with hosting target
- Frontend buckets block public access; content is served exclusively via CDN (CloudFront / Cloud CDN / Azure CDN)

## Copying to a New Project

To reuse this infrastructure in a different project: replace `project-olympus` in `project_name` defaults and state-backend names across all three providers, update domain names in `environments/*.tfvars`, run one-time state-backend setup for each provider you intend to activate, and fill in secrets in `terraform.tfvars` (never commit this file).
