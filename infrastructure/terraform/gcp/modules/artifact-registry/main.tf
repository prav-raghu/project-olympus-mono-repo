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

resource "google_artifact_registry_repository" "main" {
  repository_id = "${var.project_name}-${var.environment}"
  location       = var.region
  format          = "DOCKER"

  cleanup_policies {
    id     = "keep-tagged"
    action = "KEEP"
    condition {
      tag_state    = "TAGGED"
      package_name_prefixes = []
    }
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"
    }
  }
}

output "repository_url" {
  value = "${var.region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.main.repository_id}"
}
