output "customer_api_url" {
  description = "Container App URL for customer-api"
  value       = module.customer_api.service_url
}

output "admin_api_url" {
  description = "Container App URL for admin-api"
  value       = module.admin_api.service_url
}

output "api_gateway_url" {
  description = "Container App URL for api-gateway"
  value       = module.api_gateway.service_url
}

output "schedule_api_url" {
  description = "Container App URL for schedule-api"
  value       = module.schedule_api.service_url
}

output "partner_api_url" {
  description = "Container App URL for partner-api"
  value       = module.partner_api.service_url
}

output "admin_web_cdn_hostname" {
  description = "Azure CDN endpoint hostname for admin-web — create DNS CNAME pointing here"
  value       = module.admin_web.cdn_endpoint_hostname
}

output "admin_web_storage_account" {
  description = "Storage account for admin-web — upload dist/ contents to $${web} container"
  value       = module.admin_web.storage_account_name
}

output "admin_web_cdn_endpoint_id" {
  description = "CDN endpoint resource ID — use for cache purge after deploy"
  value       = module.admin_web.cdn_endpoint_id
}

output "customer_web_cdn_hostname" {
  description = "Azure CDN endpoint hostname for customer-web — create DNS CNAME pointing here"
  value       = module.customer_web.cdn_endpoint_hostname
}

output "customer_web_storage_account" {
  description = "Storage account for customer-web — upload dist/ contents to $${web} container"
  value       = module.customer_web.storage_account_name
}

output "customer_web_cdn_endpoint_id" {
  description = "CDN endpoint resource ID — use for cache purge after deploy"
  value       = module.customer_web.cdn_endpoint_id
}

output "acr_login_server" {
  description = "ACR login server (e.g. projectolympusdev.azurecr.io)"
  value       = module.acr.login_server
}

output "resource_group_name" {
  description = "Shared resource group name"
  value       = module.networking.resource_group_name
}

output "container_app_environment_name" {
  description = "Container Apps Environment name"
  value       = module.networking.container_app_environment_name
}
