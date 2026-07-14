output "api_gateway_url" {
  description = "Public URL of api-gateway"
  value       = module.backend["api-gateway"].service_url
}

output "ecr_repository_urls" {
  description = "ECR repository URL per backend service"
  value       = { for k, m in module.ecr : k => m.repository_url }
}

output "mysql_endpoint" {
  description = "RDS MySQL instance endpoint"
  value       = module.rds_mysql.endpoint
  sensitive   = true
}

output "redis_url" {
  description = "ElastiCache Redis connection URL"
  value       = module.elasticache.redis_url
  sensitive   = true
}

output "frontend_bucket_names" {
  description = "S3 bucket name per frontend app"
  value       = { for k, m in module.frontend : k => m.bucket_name }
}

output "frontend_cloudfront_distribution_ids" {
  description = "CloudFront distribution ID per frontend app"
  value       = { for k, m in module.frontend : k => m.cloudfront_distribution_id }
}
