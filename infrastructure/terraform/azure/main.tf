locals {
  api_gateway_port  = 4000
  admin_api_port    = 4001
  customer_api_port = 4002
  schedule_api_port = 4003
  partner_api_port  = 4004
  admin_web_port    = 4200
  customer_web_port = 5173
}

module "networking" {
  source = "./modules/networking"

  location     = var.location
  environment  = var.environment
  project_name = var.project_name
  vpc_cidr     = "10.0.0.0/16"
}

module "acr" {
  source = "./modules/acr"

  location            = var.location
  environment         = var.environment
  project_name        = var.project_name
  resource_group_name = module.networking.resource_group_name
  sku                 = var.environment == "prod" ? "Standard" : "Basic"

  depends_on = [module.networking]
}

module "redis" {
  source = "./modules/redis"

  location            = var.location
  environment         = var.environment
  project_name        = var.project_name
  resource_group_name = module.networking.resource_group_name
  vnet_id             = module.networking.vnet_id
  redis_subnet_id     = module.networking.redis_subnet_id
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku

  depends_on = [module.networking]
}

module "key_vault" {
  source = "./modules/key-vault"

  location            = var.location
  environment         = var.environment
  project_name        = var.project_name
  resource_group_name = module.networking.resource_group_name

  secrets = {
    DATABASE_URL_ADMIN        = var.database_url_admin
    DATABASE_URL_CUSTOMER     = var.database_url_customer
    DATABASE_URL_SCHEDULE     = var.database_url_schedule
    DATABASE_URL_SHARED       = var.database_url_shared
    AZURE_TENANT_ID           = var.azure_tenant_id
    AZURE_CLIENT_ID           = var.azure_client_id
    AZURE_CLIENT_SECRET       = var.azure_client_secret
    AZURE_API_AUDIENCE        = var.azure_api_audience
    AZURE_AUTHORITY           = var.azure_authority
    MAILGUN_API_KEY           = var.mailgun_api_key
    TWO_FACTOR_ENCRYPTION_KEY = var.two_factor_encryption_key
    WINSMS_API_KEY            = var.winsms_api_key
    REDIS_URL                 = module.redis.redis_url
  }

  depends_on = [module.networking, module.redis]
}

module "customer_api" {
  source = "./modules/container-apps"

  location                     = var.location
  environment                  = var.environment
  project_name                 = var.project_name
  resource_group_name          = module.networking.resource_group_name
  service_name                 = "customer-api"
  image                        = var.customer_api_image
  port                         = local.customer_api_port
  container_app_environment_id = module.networking.container_app_environment_id
  min_replicas                 = var.customer_api_min_replicas
  max_replicas                 = var.customer_api_max_replicas
  cpu                          = 0.5
  memory                       = "1Gi"
  key_vault_id                 = module.key_vault.vault_id

  env_vars = {
    NODE_ENV      = var.environment
    PORT          = tostring(local.customer_api_port)
    CORS_ORIGIN   = var.customer_web_url
    MAILGUN_DOMAIN = var.mailgun_domain
    MAILGUN_HOST   = var.mailgun_host
    MAILGUN_FROM   = var.mailgun_from
  }

  secret_env_vars = {
    DATABASE_URL_CUSTOMER = module.key_vault.secret_versionless_ids["DATABASE_URL_CUSTOMER"]
    DATABASE_URL_SHARED   = module.key_vault.secret_versionless_ids["DATABASE_URL_SHARED"]
    AZURE_TENANT_ID       = module.key_vault.secret_versionless_ids["AZURE_TENANT_ID"]
    AZURE_CLIENT_ID       = module.key_vault.secret_versionless_ids["AZURE_CLIENT_ID"]
    AZURE_CLIENT_SECRET   = module.key_vault.secret_versionless_ids["AZURE_CLIENT_SECRET"]
    AZURE_API_AUDIENCE    = module.key_vault.secret_versionless_ids["AZURE_API_AUDIENCE"]
    AZURE_AUTHORITY       = module.key_vault.secret_versionless_ids["AZURE_AUTHORITY"]
    MAILGUN_API_KEY       = module.key_vault.secret_versionless_ids["MAILGUN_API_KEY"]
    WINSMS_API_KEY        = module.key_vault.secret_versionless_ids["WINSMS_API_KEY"]
    REDIS_URL             = module.key_vault.secret_versionless_ids["REDIS_URL"]
  }

  depends_on = [module.networking, module.key_vault]
}

module "admin_api" {
  source = "./modules/container-apps"

  location                     = var.location
  environment                  = var.environment
  project_name                 = var.project_name
  resource_group_name          = module.networking.resource_group_name
  service_name                 = "admin-api"
  image                        = var.admin_api_image
  port                         = local.admin_api_port
  container_app_environment_id = module.networking.container_app_environment_id
  min_replicas                 = var.admin_api_min_replicas
  max_replicas                 = var.admin_api_max_replicas
  cpu                          = 0.5
  memory                       = "1Gi"
  key_vault_id                 = module.key_vault.vault_id

  env_vars = {
    NODE_ENV       = var.environment
    PORT           = tostring(local.admin_api_port)
    CORS_ORIGIN    = var.admin_web_url
    MAILGUN_DOMAIN = var.mailgun_domain
    MAILGUN_HOST   = var.mailgun_host
    MAILGUN_FROM   = var.mailgun_from
  }

  secret_env_vars = {
    DATABASE_URL_ADMIN        = module.key_vault.secret_versionless_ids["DATABASE_URL_ADMIN"]
    DATABASE_URL_SHARED       = module.key_vault.secret_versionless_ids["DATABASE_URL_SHARED"]
    AZURE_TENANT_ID           = module.key_vault.secret_versionless_ids["AZURE_TENANT_ID"]
    AZURE_CLIENT_ID           = module.key_vault.secret_versionless_ids["AZURE_CLIENT_ID"]
    AZURE_CLIENT_SECRET       = module.key_vault.secret_versionless_ids["AZURE_CLIENT_SECRET"]
    AZURE_API_AUDIENCE        = module.key_vault.secret_versionless_ids["AZURE_API_AUDIENCE"]
    AZURE_AUTHORITY           = module.key_vault.secret_versionless_ids["AZURE_AUTHORITY"]
    MAILGUN_API_KEY           = module.key_vault.secret_versionless_ids["MAILGUN_API_KEY"]
    TWO_FACTOR_ENCRYPTION_KEY = module.key_vault.secret_versionless_ids["TWO_FACTOR_ENCRYPTION_KEY"]
    WINSMS_API_KEY            = module.key_vault.secret_versionless_ids["WINSMS_API_KEY"]
    REDIS_URL                 = module.key_vault.secret_versionless_ids["REDIS_URL"]
  }

  depends_on = [module.networking, module.key_vault]
}

module "api_gateway" {
  source = "./modules/container-apps"

  location                     = var.location
  environment                  = var.environment
  project_name                 = var.project_name
  resource_group_name          = module.networking.resource_group_name
  service_name                 = "api-gateway"
  image                        = var.api_gateway_image
  port                         = local.api_gateway_port
  container_app_environment_id = module.networking.container_app_environment_id
  min_replicas                 = var.api_gateway_min_replicas
  max_replicas                 = var.api_gateway_max_replicas
  cpu                          = 0.5
  memory                       = "1Gi"
  key_vault_id                 = module.key_vault.vault_id

  env_vars = {
    NODE_ENV    = var.environment
    PORT        = tostring(local.api_gateway_port)
    CORS_ORIGIN = var.admin_web_url
  }

  secret_env_vars = {
    DATABASE_URL_ADMIN    = module.key_vault.secret_versionless_ids["DATABASE_URL_ADMIN"]
    DATABASE_URL_CUSTOMER = module.key_vault.secret_versionless_ids["DATABASE_URL_CUSTOMER"]
    DATABASE_URL_SCHEDULE = module.key_vault.secret_versionless_ids["DATABASE_URL_SCHEDULE"]
    DATABASE_URL_SHARED   = module.key_vault.secret_versionless_ids["DATABASE_URL_SHARED"]
    AZURE_TENANT_ID       = module.key_vault.secret_versionless_ids["AZURE_TENANT_ID"]
    AZURE_CLIENT_ID       = module.key_vault.secret_versionless_ids["AZURE_CLIENT_ID"]
    AZURE_CLIENT_SECRET   = module.key_vault.secret_versionless_ids["AZURE_CLIENT_SECRET"]
    AZURE_API_AUDIENCE    = module.key_vault.secret_versionless_ids["AZURE_API_AUDIENCE"]
    AZURE_AUTHORITY       = module.key_vault.secret_versionless_ids["AZURE_AUTHORITY"]
    REDIS_URL             = module.key_vault.secret_versionless_ids["REDIS_URL"]
  }

  depends_on = [module.networking, module.key_vault]
}

module "schedule_api" {
  source = "./modules/container-apps"

  location                     = var.location
  environment                  = var.environment
  project_name                 = var.project_name
  resource_group_name          = module.networking.resource_group_name
  service_name                 = "schedule-api"
  image                        = var.schedule_api_image
  port                         = local.schedule_api_port
  container_app_environment_id = module.networking.container_app_environment_id
  min_replicas                 = var.schedule_api_min_replicas
  max_replicas                 = var.schedule_api_max_replicas
  cpu                          = 0.5
  memory                       = "1Gi"
  key_vault_id                 = module.key_vault.vault_id

  env_vars = {
    NODE_ENV    = var.environment
    PORT        = tostring(local.schedule_api_port)
    CORS_ORIGIN = var.admin_web_url
  }

  secret_env_vars = {
    DATABASE_URL_SCHEDULE = module.key_vault.secret_versionless_ids["DATABASE_URL_SCHEDULE"]
    DATABASE_URL_SHARED   = module.key_vault.secret_versionless_ids["DATABASE_URL_SHARED"]
    AZURE_TENANT_ID       = module.key_vault.secret_versionless_ids["AZURE_TENANT_ID"]
    AZURE_CLIENT_ID       = module.key_vault.secret_versionless_ids["AZURE_CLIENT_ID"]
    AZURE_CLIENT_SECRET   = module.key_vault.secret_versionless_ids["AZURE_CLIENT_SECRET"]
    AZURE_API_AUDIENCE    = module.key_vault.secret_versionless_ids["AZURE_API_AUDIENCE"]
    AZURE_AUTHORITY       = module.key_vault.secret_versionless_ids["AZURE_AUTHORITY"]
    REDIS_URL             = module.key_vault.secret_versionless_ids["REDIS_URL"]
  }

  depends_on = [module.networking, module.key_vault]
}

module "partner_api" {
  source = "./modules/container-apps"

  location                     = var.location
  environment                  = var.environment
  project_name                 = var.project_name
  resource_group_name          = module.networking.resource_group_name
  service_name                 = "partner-api"
  image                        = var.partner_api_image
  port                         = local.partner_api_port
  container_app_environment_id = module.networking.container_app_environment_id
  min_replicas                 = var.partner_api_min_replicas
  max_replicas                 = var.partner_api_max_replicas
  cpu                          = 0.5
  memory                       = "1Gi"
  key_vault_id                 = module.key_vault.vault_id

  env_vars = {
    NODE_ENV    = var.environment
    PORT        = tostring(local.partner_api_port)
    CORS_ORIGIN = var.admin_web_url
  }

  secret_env_vars = {
    DATABASE_URL_SHARED = module.key_vault.secret_versionless_ids["DATABASE_URL_SHARED"]
    AZURE_TENANT_ID     = module.key_vault.secret_versionless_ids["AZURE_TENANT_ID"]
    AZURE_CLIENT_ID     = module.key_vault.secret_versionless_ids["AZURE_CLIENT_ID"]
    AZURE_CLIENT_SECRET = module.key_vault.secret_versionless_ids["AZURE_CLIENT_SECRET"]
    AZURE_API_AUDIENCE  = module.key_vault.secret_versionless_ids["AZURE_API_AUDIENCE"]
    AZURE_AUTHORITY     = module.key_vault.secret_versionless_ids["AZURE_AUTHORITY"]
    REDIS_URL           = module.key_vault.secret_versionless_ids["REDIS_URL"]
  }

  depends_on = [module.networking, module.key_vault]
}

module "admin_web" {
  source = "./modules/static-site"

  location            = var.location
  environment         = var.environment
  project_name        = var.project_name
  resource_group_name = module.networking.resource_group_name
  app_name             = "admin-web"
  domain               = var.admin_web_domain

  depends_on = [module.networking]
}

module "customer_web" {
  source = "./modules/static-site"

  location            = var.location
  environment         = var.environment
  project_name        = var.project_name
  resource_group_name = module.networking.resource_group_name
  app_name             = "customer-web"
  domain               = var.customer_web_domain

  depends_on = [module.networking]
}
