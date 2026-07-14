variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "southafricanorth"

  validation {
    condition     = contains(["southafricanorth", "southafricawest", "westeurope", "eastus", "uksouth"], var.location)
    error_message = "location must be a valid Azure region."
  }
}

variable "environment" {
  description = "Deployment environment — dev, staging, or prod"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Base project name used in all resource names"
  type        = string
  default     = "project-olympus"
}

variable "customer_api_image" {
  description = "Full ACR image URI for customer-api (e.g. projectolympusdev.azurecr.io/customer-api:latest)"
  type        = string
}

variable "admin_api_image" {
  description = "Full ACR image URI for admin-api"
  type        = string
}

variable "api_gateway_image" {
  description = "Full ACR image URI for api-gateway"
  type        = string
}

variable "schedule_api_image" {
  description = "Full ACR image URI for schedule-api"
  type        = string
}

variable "partner_api_image" {
  description = "Full ACR image URI for partner-api"
  type        = string
}

variable "database_url_admin" {
  description = "MySQL connection string for the app_admin database"
  type        = string
  sensitive   = true
}

variable "database_url_customer" {
  description = "MySQL connection string for the app_customer database"
  type        = string
  sensitive   = true
}

variable "database_url_schedule" {
  description = "MySQL connection string for the app_schedule database"
  type        = string
  sensitive   = true
}

variable "database_url_shared" {
  description = "MySQL connection string for the app_shared database"
  type        = string
  sensitive   = true
}

variable "azure_tenant_id" {
  description = "Azure AD tenant ID for MSAL"
  type        = string
  sensitive   = true
}

variable "azure_client_id" {
  description = "Azure AD application (client) ID for MSAL"
  type        = string
  sensitive   = true
}

variable "azure_client_secret" {
  description = "Azure AD client secret for MSAL"
  type        = string
  sensitive   = true
}

variable "azure_api_audience" {
  description = "Azure AD API audience (application ID URI) for token validation"
  type        = string
  sensitive   = true
}

variable "azure_authority" {
  description = "Azure AD authority URL — https://login.microsoftonline.com/<tenant-id>"
  type        = string
  sensitive   = true
}

variable "mailgun_api_key" {
  description = "Mailgun transactional email API key — see common/email's MAILGUN_API_KEY contract"
  type        = string
  sensitive   = true
}

variable "mailgun_domain" {
  description = "Mailgun sending domain — common/email's MAILGUN_DOMAIN"
  type        = string
}

variable "mailgun_host" {
  description = "Mailgun API host — common/email's MAILGUN_HOST"
  type        = string
  default     = "api.mailgun.net"
}

variable "mailgun_from" {
  description = "Sender email address for transactional emails — common/email's MAILGUN_FROM"
  type        = string
}

variable "two_factor_encryption_key" {
  description = "64-character hex key for 2FA TOTP encryption"
  type        = string
  sensitive   = true
}

variable "winsms_api_key" {
  description = "WinSMS API key for South Africa SMS"
  type        = string
  sensitive   = true
}

variable "customer_api_min_replicas" {
  description = "Minimum replicas for customer-api (0 = scale-to-zero)"
  type        = number
  default     = 0
}

variable "customer_api_max_replicas" {
  description = "Maximum replicas for customer-api"
  type        = number
  default     = 10
}

variable "admin_api_min_replicas" {
  description = "Minimum replicas for admin-api"
  type        = number
  default     = 0
}

variable "admin_api_max_replicas" {
  description = "Maximum replicas for admin-api"
  type        = number
  default     = 5
}

variable "api_gateway_min_replicas" {
  description = "Minimum replicas for api-gateway (0 = scale-to-zero)"
  type        = number
  default     = 0
}

variable "api_gateway_max_replicas" {
  description = "Maximum replicas for api-gateway"
  type        = number
  default     = 10
}

variable "schedule_api_min_replicas" {
  description = "Minimum replicas for schedule-api (0 = scale-to-zero)"
  type        = number
  default     = 0
}

variable "schedule_api_max_replicas" {
  description = "Maximum replicas for schedule-api"
  type        = number
  default     = 5
}

variable "partner_api_min_replicas" {
  description = "Minimum replicas for partner-api (0 = scale-to-zero)"
  type        = number
  default     = 0
}

variable "partner_api_max_replicas" {
  description = "Maximum replicas for partner-api"
  type        = number
  default     = 5
}

variable "redis_capacity" {
  description = "Azure Cache for Redis capacity (number of cache units)"
  type        = number
  default     = 1
}

variable "redis_family" {
  description = "Azure Cache for Redis family — C (Basic/Standard) or P (Premium)"
  type        = string
  default     = "C"

  validation {
    condition     = contains(["C", "P"], var.redis_family)
    error_message = "redis_family must be C or P."
  }
}

variable "redis_sku" {
  description = "Azure Cache for Redis SKU — Basic, Standard, or Premium"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.redis_sku)
    error_message = "redis_sku must be Basic, Standard, or Premium."
  }
}

variable "customer_web_url" {
  description = "Public URL of the customer-web app (used in CORS headers)"
  type        = string
  default     = ""
}

variable "admin_web_url" {
  description = "Public URL of the admin-web SPA (used in CORS headers)"
  type        = string
  default     = ""
}

variable "admin_web_domain" {
  description = "Custom domain for admin-web CDN endpoint (leave empty to skip)"
  type        = string
  default     = ""
}

variable "customer_web_domain" {
  description = "Custom domain for customer-web CDN endpoint (leave empty to skip)"
  type        = string
  default     = ""
}
