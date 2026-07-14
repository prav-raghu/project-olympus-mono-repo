variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "region" {
  type = string
}

variable "service_name" {
  type = string
}

variable "image" {
  type = string
}

variable "port" {
  type = number
}

variable "public" {
  description = "If true, the service is registered behind the public ALB. If false, it is only reachable via Cloud Map internal DNS."
  type        = bool
}

variable "cpu" {
  type    = number
  default = 256
}

variable "memory" {
  type    = number
  default = 512
}

variable "min_capacity" {
  type    = number
  default = 1
}

variable "max_capacity" {
  type    = number
  default = 5
}

variable "cluster_id" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "ecs_security_group_id" {
  type = string
}

variable "certificate_arn" {
  type    = string
  default = ""
}

variable "service_discovery_namespace_id" {
  type = string
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "secret_env_vars" {
  description = "Map of env var name to Secrets Manager ARN"
  type        = map(string)
  default     = {}
}

resource "aws_cloudwatch_log_group" "main" {
  name              = "/ecs/${var.project_name}-${var.environment}-${var.service_name}"
  retention_in_days = 14
}

resource "aws_iam_role" "execution" {
  name = "${var.project_name}-${var.environment}-${var.service_name}-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "secrets" {
  count = length(var.secret_env_vars) > 0 ? 1 : 0
  name  = "${var.project_name}-${var.environment}-${var.service_name}-secrets"
  role  = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = values(var.secret_env_vars)
    }]
  })
}

resource "aws_iam_role" "task" {
  name = "${var.project_name}-${var.environment}-${var.service_name}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_ecs_task_definition" "main" {
  family                   = "${var.project_name}-${var.environment}-${var.service_name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = var.service_name
    image     = var.image
    essential = true
    portMappings = [{
      containerPort = var.port
      protocol      = "tcp"
    }]
    environment = [for k, v in var.env_vars : { name = k, value = v }]
    secrets     = [for k, arn in var.secret_env_vars : { name = k, valueFrom = arn }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.main.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = var.service_name
      }
    }
  }])
}

resource "aws_service_discovery_service" "main" {
  name = var.service_name

  dns_config {
    namespace_id = var.service_discovery_namespace_id
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_lb" "public" {
  count              = var.public ? 1 : 0
  name               = "${var.project_name}-${var.environment}-${var.service_name}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "public" {
  count       = var.public ? 1 : 0
  name        = "${var.project_name}-${var.environment}-${var.service_name}"
  port        = var.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 5
  }
}

resource "aws_lb_listener" "https" {
  count             = var.public && var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.public[0].arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public[0].arn
  }
}

resource "aws_lb_listener" "http" {
  count             = var.public ? 1 : 0
  load_balancer_arn = aws_lb.public[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public[0].arn
  }
}

resource "aws_ecs_service" "main" {
  name            = "${var.project_name}-${var.environment}-${var.service_name}"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.min_capacity
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [var.ecs_security_group_id]
  }

  dynamic "load_balancer" {
    for_each = var.public ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.public[0].arn
      container_name    = var.service_name
      container_port    = var.port
    }
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main.arn
  }

  depends_on = [aws_lb_listener.http]
}

resource "aws_appautoscaling_target" "main" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.project_name}-${var.environment}-${var.service_name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.main.resource_id
  scalable_dimension = aws_appautoscaling_target.main.scalable_dimension
  service_namespace  = aws_appautoscaling_target.main.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70
  }
}

output "service_url" {
  value = var.public ? "http://${aws_lb.public[0].dns_name}" : "http://${var.service_name}.${var.project_name}-${var.environment}.internal:${var.port}"
}
