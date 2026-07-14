variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "af-south-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Short project identifier used in resource names"
  type        = string
  default     = "project-olympus"
}

variable "api_gateway_image" {
  description = "Full ECR image URI for api-gateway"
  type        = string
}

variable "admin_api_image" {
  description = "Full ECR image URI for admin-api"
  type        = string
}

variable "customer_api_image" {
  description = "Full ECR image URI for customer-api"
  type        = string
}

variable "schedule_api_image" {
  description = "Full ECR image URI for schedule-api"
  type        = string
}

variable "partner_api_image" {
  description = "Full ECR image URI for partner-api"
  type        = string
}

variable "azure_tenant_id" {
  description = "Azure AD tenant ID for MSAL auth"
  type        = string
}

variable "azure_client_id" {
  description = "Azure AD application (client) ID"
  type        = string
}

variable "azure_client_secret" {
  description = "Azure AD application client secret"
  type        = string
  sensitive   = true
}

variable "azure_api_audience" {
  description = "Expected audience claim for validated Azure AD access tokens"
  type        = string
}

variable "azure_authority" {
  description = "Azure AD authority URL"
  type        = string
}

variable "applicationinsights_connection_string" {
  description = "Application Insights connection string — logging stays on Azure Monitor regardless of compute cloud"
  type        = string
  sensitive   = true
}

variable "mysql_master_username" {
  description = "RDS MySQL master username"
  type        = string
  default     = "olympus_admin"
}

variable "mysql_master_password" {
  description = "RDS MySQL master password"
  type        = string
  sensitive   = true
}

variable "mysql_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "mysql_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "redis_node_type" {
  description = "ElastiCache node type for Redis"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of ElastiCache nodes (1 = no replication)"
  type        = number
  default     = 1
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS listeners"
  type        = string
  default     = ""
}

variable "admin_web_domain" {
  description = "Custom domain for admin-web CloudFront distribution"
  type        = string
  default     = ""
}

variable "customer_web_domain" {
  description = "Custom domain for customer-web CloudFront distribution"
  type        = string
  default     = ""
}
