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

variable "service_name" {
  type = string
}

variable "image" {
  type = string
}

variable "port" {
  type = number
}

variable "public" {
  description = "If true, the service allows unauthenticated public ingress. If false, ingress is restricted to the VPC (internal service-to-service calls only)."
  type        = bool
}

variable "vpc_connector_id" {
  type = string
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "secret_env_vars" {
  description = "Map of env var name to Secret Manager secret ID"
  type        = map(string)
  default     = {}
}

resource "google_service_account" "main" {
  account_id   = "${var.project_name}-${var.environment}-${var.service_name}"
  display_name = "${var.service_name} (${var.environment})"
}

resource "google_cloud_run_v2_service" "main" {
  name     = "${var.project_name}-${var.environment}-${var.service_name}"
  location = var.region
  ingress  = var.public ? "INGRESS_TRAFFIC_ALL" : "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.main.email

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.image
      ports {
        container_port = var.port
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.public ? 1 : 0
  location = google_cloud_run_v2_service.main.location
  name     = google_cloud_run_v2_service.main.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_url" {
  value = google_cloud_run_v2_service.main.uri
}
