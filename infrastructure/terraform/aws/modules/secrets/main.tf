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

resource "aws_secretsmanager_secret" "main" {
  for_each = var.secrets
  name     = "${var.project_name}/${var.environment}/${each.key}"
}

resource "aws_secretsmanager_secret_version" "main" {
  for_each      = var.secrets
  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = each.value
}

output "secret_arns" {
  value = { for k, s in aws_secretsmanager_secret.main : k => s.arn }
}
