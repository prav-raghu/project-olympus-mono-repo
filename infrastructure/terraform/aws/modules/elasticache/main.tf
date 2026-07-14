variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "data_security_group_id" {
  type = string
}

variable "node_type" {
  type = string
}

variable "num_cache_nodes" {
  type = number
}

resource "random_password" "auth_token" {
  length  = 32
  special = false
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description           = "Redis for ${var.project_name} ${var.environment}"
  node_type              = var.node_type
  num_cache_clusters     = var.num_cache_nodes
  engine                 = "redis"
  engine_version         = "7.0"
  port                   = 6379
  subnet_group_name      = aws_elasticache_subnet_group.main.name
  security_group_ids     = [var.data_security_group_id]
  automatic_failover_enabled = var.num_cache_nodes > 1
  transit_encryption_enabled = true
  auth_token                 = random_password.auth_token.result
  apply_immediately           = false
}

output "redis_url" {
  value     = "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  sensitive = true
}

output "auth_token" {
  value     = random_password.auth_token.result
  sensitive = true
}
