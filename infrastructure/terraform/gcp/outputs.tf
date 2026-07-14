output "api_gateway_url" {
  description = "Public URL of api-gateway"
  value       = module.backend["api-gateway"].service_url
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = module.artifact_registry.repository_url
}

output "mysql_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = module.cloud_sql_mysql.connection_name
}

output "redis_url" {
  description = "Memorystore Redis connection URL"
  value       = module.memorystore.redis_url
  sensitive   = true
}

output "frontend_bucket_names" {
  description = "GCS bucket name per frontend app"
  value       = { for k, m in module.frontend : k => m.bucket_name }
}
