variable "gcp_project_id" {
  type = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "secrets" {
  description = "Map of secret name to value"
  type        = map(string)
  sensitive   = true
}

resource "google_secret_manager_secret" "main" {
  for_each  = var.secrets
  secret_id = "${var.project_name}-${var.environment}-${each.key}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "main" {
  for_each    = var.secrets
  secret      = google_secret_manager_secret.main[each.key].id
  secret_data = each.value
}

output "secret_ids" {
  value = { for k, s in google_secret_manager_secret.main : k => s.secret_id }
}
