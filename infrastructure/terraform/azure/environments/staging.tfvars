location     = "southafricanorth"
environment  = "staging"
project_name = "project-olympus"

customer_api_image = "projectolympusstaging.azurecr.io/customer-api:latest"
admin_api_image    = "projectolympusstaging.azurecr.io/admin-api:latest"
api_gateway_image  = "projectolympusstaging.azurecr.io/api-gateway:latest"
schedule_api_image = "projectolympusstaging.azurecr.io/schedule-api:latest"
partner_api_image  = "projectolympusstaging.azurecr.io/partner-api:latest"

customer_api_min_replicas = 0
customer_api_max_replicas = 5

admin_api_min_replicas = 0
admin_api_max_replicas = 3

api_gateway_min_replicas = 0
api_gateway_max_replicas = 5

schedule_api_min_replicas = 0
schedule_api_max_replicas = 3

partner_api_min_replicas = 0
partner_api_max_replicas = 3

redis_capacity = 1
redis_family   = "C"
redis_sku      = "Standard"

customer_web_url    = "https://staging.project-olympus.example.com"
admin_web_url       = "https://admin.staging.project-olympus.example.com"
admin_web_domain    = "admin.staging.project-olympus.example.com"
customer_web_domain = "staging.project-olympus.example.com"
