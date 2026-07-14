variable "gcp_project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "network_id" {
  type = string
}

variable "tier" {
  type = string
}

variable "root_password" {
  type      = string
  sensitive = true
}

variable "database_names" {
  description = "Logical databases to create on the shared MySQL instance (mirrors dev-ops/mysql-init/01-create-databases.sql)"
  type        = list(string)
}

resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-${var.environment}"
  region           = var.region
  database_version = "MYSQL_8_0"

  settings {
    tier = var.tier
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }
    backup_configuration {
      enabled = var.environment == "prod"
    }
  }

  deletion_protection = var.environment == "prod"
}

resource "google_sql_user" "root" {
  name     = "root"
  instance = google_sql_database_instance.main.name
  password = var.root_password
}

resource "google_sql_database" "main" {
  for_each = toset(var.database_names)
  name     = each.value
  instance = google_sql_database_instance.main.name
  charset  = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

output "connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "database_urls" {
  description = "mysql:// connection string per logical database"
  value = {
    for db in var.database_names :
    db => "mysql://root:${var.root_password}@${google_sql_database_instance.main.private_ip_address}/${db}"
  }
  sensitive = true
}
