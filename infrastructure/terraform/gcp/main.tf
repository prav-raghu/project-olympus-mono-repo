locals {
  common_env_vars = {
    NODE_ENV           = var.environment
    AZURE_TENANT_ID    = var.azure_tenant_id
    AZURE_CLIENT_ID    = var.azure_client_id
    AZURE_API_AUDIENCE = var.azure_api_audience
    AZURE_AUTHORITY    = var.azure_authority
  }

  backend_services = {
    api-gateway = {
      port   = 4000
      image  = var.api_gateway_image
      public = true
      env_vars = {
        DATABASE_URL_ADMIN    = module.cloud_sql_mysql.database_urls["app_admin"]
        DATABASE_URL_CUSTOMER = module.cloud_sql_mysql.database_urls["app_customer"]
        DATABASE_URL_SCHEDULE = module.cloud_sql_mysql.database_urls["app_schedule"]
        DATABASE_URL_SHARED   = module.cloud_sql_mysql.database_urls["app_shared"]
      }
    }
    admin-api = {
      port   = 4001
      image  = var.admin_api_image
      public = false
      env_vars = {
        DATABASE_URL_ADMIN  = module.cloud_sql_mysql.database_urls["app_admin"]
        DATABASE_URL_SHARED = module.cloud_sql_mysql.database_urls["app_shared"]
      }
    }
    customer-api = {
      port   = 4002
      image  = var.customer_api_image
      public = false
      env_vars = {
        DATABASE_URL_CUSTOMER = module.cloud_sql_mysql.database_urls["app_customer"]
        DATABASE_URL_SHARED   = module.cloud_sql_mysql.database_urls["app_shared"]
      }
    }
    schedule-api = {
      port   = 4003
      image  = var.schedule_api_image
      public = false
      env_vars = {
        DATABASE_URL_SCHEDULE = module.cloud_sql_mysql.database_urls["app_schedule"]
        DATABASE_URL_SHARED   = module.cloud_sql_mysql.database_urls["app_shared"]
      }
    }
    partner-api = {
      port   = 4004
      image  = var.partner_api_image
      public = false
      env_vars = {
        DATABASE_URL_SHARED = module.cloud_sql_mysql.database_urls["app_shared"]
      }
    }
  }

  frontend_apps = toset(["admin-web", "customer-web"])
}

resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "vpcaccess.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

module "networking" {
  source = "./modules/networking"

  gcp_project_id = var.gcp_project_id
  region         = var.region
  environment    = var.environment
  project_name   = var.project_name

  depends_on = [google_project_service.required]
}

module "artifact_registry" {
  source = "./modules/artifact-registry"

  gcp_project_id = var.gcp_project_id
  region          = var.region
  environment      = var.environment
  project_name     = var.project_name

  depends_on = [google_project_service.required]
}

module "memorystore" {
  source = "./modules/memorystore"

  gcp_project_id = var.gcp_project_id
  region         = var.region
  environment     = var.environment
  project_name    = var.project_name
  network_id      = module.networking.network_id
  memory_size_gb  = var.redis_memory_size_gb
  tier            = var.redis_tier

  depends_on = [module.networking]
}

module "cloud_sql_mysql" {
  source = "./modules/cloud-sql-mysql"

  gcp_project_id  = var.gcp_project_id
  region          = var.region
  environment     = var.environment
  project_name    = var.project_name
  network_id      = module.networking.network_id
  tier            = var.mysql_tier
  root_password   = var.mysql_master_password
  database_names  = ["app_admin", "app_customer", "app_schedule", "app_shared"]

  depends_on = [module.networking]
}

module "secret_manager" {
  source = "./modules/secret-manager"

  gcp_project_id = var.gcp_project_id
  project_name    = var.project_name
  environment      = var.environment

  secrets = {
    AZURE_CLIENT_SECRET                   = var.azure_client_secret
    APPLICATIONINSIGHTS_CONNECTION_STRING = var.applicationinsights_connection_string
    REDIS_URL                             = module.memorystore.redis_url
  }

  depends_on = [module.memorystore]
}

module "backend" {
  for_each = local.backend_services
  source   = "./modules/cloud-run"

  gcp_project_id  = var.gcp_project_id
  region          = var.region
  environment     = var.environment
  project_name    = var.project_name
  service_name    = each.key
  image           = each.value.image
  port            = each.value.port
  public          = each.value.public
  vpc_connector_id = module.networking.vpc_connector_id

  env_vars = merge(local.common_env_vars, each.value.env_vars, { PORT = tostring(each.value.port) })

  secret_env_vars = {
    AZURE_CLIENT_SECRET                   = module.secret_manager.secret_ids["AZURE_CLIENT_SECRET"]
    APPLICATIONINSIGHTS_CONNECTION_STRING = module.secret_manager.secret_ids["APPLICATIONINSIGHTS_CONNECTION_STRING"]
    REDIS_URL                             = module.secret_manager.secret_ids["REDIS_URL"]
  }

  depends_on = [module.networking, module.secret_manager, module.cloud_sql_mysql]
}

module "frontend" {
  for_each = local.frontend_apps
  source   = "./modules/static-site"

  gcp_project_id = var.gcp_project_id
  region          = var.region
  environment      = var.environment
  project_name     = var.project_name
  app_name         = each.key
  domain           = each.key == "admin-web" ? var.admin_web_domain : var.customer_web_domain

  depends_on = [module.networking]
}
