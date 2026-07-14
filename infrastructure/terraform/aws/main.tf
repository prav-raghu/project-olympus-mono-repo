locals {
  common_env_vars = {
    NODE_ENV     = var.environment
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
        DATABASE_URL_ADMIN    = module.rds_mysql.database_urls["app_admin"]
        DATABASE_URL_CUSTOMER = module.rds_mysql.database_urls["app_customer"]
        DATABASE_URL_SCHEDULE = module.rds_mysql.database_urls["app_schedule"]
        DATABASE_URL_SHARED   = module.rds_mysql.database_urls["app_shared"]
      }
    }
    admin-api = {
      port   = 4001
      image  = var.admin_api_image
      public = false
      env_vars = {
        DATABASE_URL_ADMIN  = module.rds_mysql.database_urls["app_admin"]
        DATABASE_URL_SHARED = module.rds_mysql.database_urls["app_shared"]
      }
    }
    customer-api = {
      port   = 4002
      image  = var.customer_api_image
      public = false
      env_vars = {
        DATABASE_URL_CUSTOMER = module.rds_mysql.database_urls["app_customer"]
        DATABASE_URL_SHARED   = module.rds_mysql.database_urls["app_shared"]
      }
    }
    schedule-api = {
      port   = 4003
      image  = var.schedule_api_image
      public = false
      env_vars = {
        DATABASE_URL_SCHEDULE = module.rds_mysql.database_urls["app_schedule"]
        DATABASE_URL_SHARED   = module.rds_mysql.database_urls["app_shared"]
      }
    }
    partner-api = {
      port   = 4004
      image  = var.partner_api_image
      public = false
      env_vars = {
        DATABASE_URL_SHARED = module.rds_mysql.database_urls["app_shared"]
      }
    }
  }

  frontend_apps = toset(["admin-web", "customer-web"])
}

data "aws_caller_identity" "current" {}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = "${var.project_name}-${var.environment}.internal"
  vpc  = module.networking.vpc_id
}

module "networking" {
  source = "./modules/networking"

  region       = var.region
  environment  = var.environment
  project_name = var.project_name
  vpc_cidr     = "10.0.0.0/16"
}

module "ecr" {
  for_each = local.backend_services
  source   = "./modules/ecr"

  project_name = var.project_name
  environment  = var.environment
  service_name = each.key
}

module "elasticache" {
  source = "./modules/elasticache"

  project_name            = var.project_name
  environment             = var.environment
  vpc_id                  = module.networking.vpc_id
  private_subnet_ids      = module.networking.private_subnet_ids
  data_security_group_id  = module.networking.data_security_group_id
  node_type               = var.redis_node_type
  num_cache_nodes         = var.redis_num_cache_nodes

  depends_on = [module.networking]
}

module "rds_mysql" {
  source = "./modules/rds-mysql"

  project_name          = var.project_name
  environment            = var.environment
  vpc_id                 = module.networking.vpc_id
  private_subnet_ids     = module.networking.private_subnet_ids
  data_security_group_id = module.networking.data_security_group_id
  instance_class          = var.mysql_instance_class
  allocated_storage       = var.mysql_allocated_storage
  master_username         = var.mysql_master_username
  master_password         = var.mysql_master_password
  database_names          = ["app_admin", "app_customer", "app_schedule", "app_shared"]

  depends_on = [module.networking]
}

module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment

  secrets = {
    AZURE_CLIENT_SECRET                   = var.azure_client_secret
    APPLICATIONINSIGHTS_CONNECTION_STRING = var.applicationinsights_connection_string
    REDIS_URL                             = module.elasticache.redis_url
  }

  depends_on = [module.elasticache]
}

module "backend" {
  for_each = local.backend_services
  source   = "./modules/ecs"

  project_name           = var.project_name
  environment             = var.environment
  region                  = var.region
  service_name            = each.key
  image                   = each.value.image
  port                    = each.value.port
  public                  = each.value.public
  cluster_id              = aws_ecs_cluster.main.id
  cluster_name            = aws_ecs_cluster.main.name
  vpc_id                  = module.networking.vpc_id
  private_subnet_ids      = module.networking.private_subnet_ids
  public_subnet_ids       = module.networking.public_subnet_ids
  alb_security_group_id   = module.networking.alb_security_group_id
  ecs_security_group_id   = module.networking.ecs_security_group_id
  certificate_arn         = var.certificate_arn
  service_discovery_namespace_id = aws_service_discovery_private_dns_namespace.internal.id

  env_vars = merge(local.common_env_vars, each.value.env_vars, { PORT = tostring(each.value.port) })

  secret_env_vars = {
    AZURE_CLIENT_SECRET                   = module.secrets.secret_arns["AZURE_CLIENT_SECRET"]
    APPLICATIONINSIGHTS_CONNECTION_STRING = module.secrets.secret_arns["APPLICATIONINSIGHTS_CONNECTION_STRING"]
    REDIS_URL                             = module.secrets.secret_arns["REDIS_URL"]
  }

  depends_on = [module.networking, module.secrets, module.rds_mysql, aws_ecs_cluster.main]
}

module "frontend" {
  for_each = local.frontend_apps
  source   = "./modules/static-site"

  project_name    = var.project_name
  environment     = var.environment
  region          = var.region
  app_name        = each.key
  domain          = each.key == "admin-web" ? var.admin_web_domain : var.customer_web_domain
  certificate_arn = var.certificate_arn

  depends_on = [module.networking]
}
