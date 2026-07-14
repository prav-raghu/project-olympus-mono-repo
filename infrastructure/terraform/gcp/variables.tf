variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "africa-south1"
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
  description = "Full Artifact Registry image URI for api-gateway"
  type        = string
}

variable "admin_api_image" {
  description = "Full Artifact Registry image URI for admin-api"
  type        = string
}

variable "customer_api_image" {
  description = "Full Artifact Registry image URI for customer-api"
  type        = string
}

variable "schedule_api_image" {
  description = "Full Artifact Registry image URI for schedule-api"
  type        = string
}

variable "partner_api_image" {
  description = "Full Artifact Registry image URI for partner-api"
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

variable "mysql_master_password" {
  description = "Cloud SQL MySQL root password"
  type        = string
  sensitive   = true
}

variable "mysql_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "redis_memory_size_gb" {
  description = "Memorystore Redis memory size in GB"
  type        = number
  default     = 1
}

variable "redis_tier" {
  description = "Memorystore Redis service tier"
  type        = string
  default     = "BASIC"
}

variable "admin_web_domain" {
  description = "Custom domain for admin-web load balancer"
  type        = string
  default     = ""
}

variable "customer_web_domain" {
  description = "Custom domain for customer-web load balancer"
  type        = string
  default     = ""
}
