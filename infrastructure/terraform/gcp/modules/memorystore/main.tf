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

variable "memory_size_gb" {
  type = number
}

variable "tier" {
  type = string
}

resource "google_redis_instance" "main" {
  name               = "${var.project_name}-${var.environment}"
  region             = var.region
  memory_size_gb     = var.memory_size_gb
  tier               = var.tier
  redis_version      = "REDIS_7_0"
  authorized_network = var.network_id
  auth_enabled       = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }
}

output "redis_url" {
  value     = "rediss://:${google_redis_instance.main.auth_string}@${google_redis_instance.main.host}:${google_redis_instance.main.port}"
  sensitive = true
}
