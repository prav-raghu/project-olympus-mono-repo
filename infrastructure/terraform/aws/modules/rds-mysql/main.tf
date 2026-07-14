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

variable "instance_class" {
  type = string
}

variable "allocated_storage" {
  type = number
}

variable "master_username" {
  type = string
}

variable "master_password" {
  type      = string
  sensitive = true
}

variable "database_names" {
  description = "Logical databases to create on the shared MySQL server (mirrors dev-ops/mysql-init/01-create-databases.sql)"
  type        = list(string)
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-mysql"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "main" {
  identifier             = "${var.project_name}-${var.environment}-mysql"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  storage_encrypted      = true
  username                = var.master_username
  password                = var.master_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [var.data_security_group_id]
  publicly_accessible     = false
  backup_retention_period = var.environment == "prod" ? 7 : 1
  skip_final_snapshot     = var.environment != "prod"
  deletion_protection     = var.environment == "prod"
}

resource "null_resource" "create_databases" {
  for_each = toset(var.database_names)

  triggers = {
    db_endpoint = aws_db_instance.main.endpoint
  }

  provisioner "local-exec" {
    command = "mysql -h ${aws_db_instance.main.address} -P ${aws_db_instance.main.port} -u ${var.master_username} -p${var.master_password} -e \"CREATE DATABASE IF NOT EXISTS ${each.value} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
  }
}

output "endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "database_urls" {
  description = "mysql:// connection string per logical database"
  value = {
    for db in var.database_names :
    db => "mysql://${var.master_username}:${var.master_password}@${aws_db_instance.main.endpoint}/${db}"
  }
  sensitive = true
}
