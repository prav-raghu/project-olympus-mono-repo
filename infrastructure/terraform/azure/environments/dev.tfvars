location     = "southafricanorth"
environment  = "dev"
project_name = "project-olympus"

customer_api_image = "projectolympusdev.azurecr.io/customer-api:latest"
admin_api_image    = "projectolympusdev.azurecr.io/admin-api:latest"
api_gateway_image  = "projectolympusdev.azurecr.io/api-gateway:latest"
schedule_api_image = "projectolympusdev.azurecr.io/schedule-api:latest"
partner_api_image  = "projectolympusdev.azurecr.io/partner-api:latest"

customer_api_min_replicas = 0
customer_api_max_replicas = 3

admin_api_min_replicas = 0
admin_api_max_replicas = 2

api_gateway_min_replicas = 0
api_gateway_max_replicas = 3

schedule_api_min_replicas = 0
schedule_api_max_replicas = 2

partner_api_min_replicas = 0
partner_api_max_replicas = 2

redis_capacity = 1
redis_family   = "C"
redis_sku      = "Basic"

customer_web_url    = ""
admin_web_url       = ""
admin_web_domain    = ""
customer_web_domain = ""
