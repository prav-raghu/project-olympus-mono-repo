location     = "southafricanorth"
environment  = "prod"
project_name = "project-olympus"

customer_api_image = "projectolympusprod.azurecr.io/customer-api:latest"
admin_api_image    = "projectolympusprod.azurecr.io/admin-api:latest"
api_gateway_image  = "projectolympusprod.azurecr.io/api-gateway:latest"
schedule_api_image = "projectolympusprod.azurecr.io/schedule-api:latest"
partner_api_image  = "projectolympusprod.azurecr.io/partner-api:latest"

customer_api_min_replicas = 1
customer_api_max_replicas = 20

admin_api_min_replicas = 1
admin_api_max_replicas = 10

api_gateway_min_replicas = 1
api_gateway_max_replicas = 20

schedule_api_min_replicas = 1
schedule_api_max_replicas = 10

partner_api_min_replicas = 1
partner_api_max_replicas = 10

redis_capacity = 2
redis_family   = "P"
redis_sku      = "Premium"

customer_web_url    = "https://app.project-olympus.example.com"
admin_web_url       = "https://admin.project-olympus.example.com"
admin_web_domain    = "admin.project-olympus.example.com"
customer_web_domain = "app.project-olympus.example.com"
