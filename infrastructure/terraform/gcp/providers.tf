terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "project-olympus-tfstate"
    prefix = "terraform/state/gcp"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.region
}
