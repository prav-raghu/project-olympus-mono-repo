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

variable "app_name" {
  type = string
}

variable "domain" {
  type    = string
  default = ""
}

resource "google_storage_bucket" "main" {
  name                        = "${var.project_name}-${var.environment}-${var.app_name}"
  location                    = var.region
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
}

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.main.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_compute_backend_bucket" "main" {
  name        = "${var.project_name}-${var.environment}-${var.app_name}"
  bucket_name = google_storage_bucket.main.name
  enable_cdn  = true
}

resource "google_compute_url_map" "main" {
  name            = "${var.project_name}-${var.environment}-${var.app_name}"
  default_service = google_compute_backend_bucket.main.id
}

resource "google_compute_managed_ssl_certificate" "main" {
  count = var.domain != "" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-${var.app_name}"

  managed {
    domains = [var.domain]
  }
}

resource "google_compute_target_https_proxy" "main" {
  count            = var.domain != "" ? 1 : 0
  name             = "${var.project_name}-${var.environment}-${var.app_name}"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main[0].id]
}

resource "google_compute_global_address" "main" {
  name = "${var.project_name}-${var.environment}-${var.app_name}"
}

resource "google_compute_global_forwarding_rule" "main" {
  count      = var.domain != "" ? 1 : 0
  name       = "${var.project_name}-${var.environment}-${var.app_name}"
  target      = google_compute_target_https_proxy.main[0].id
  port_range  = "443"
  ip_address  = google_compute_global_address.main.address
}

output "bucket_name" {
  value = google_storage_bucket.main.name
}

output "load_balancer_ip" {
  value = google_compute_global_address.main.address
}
