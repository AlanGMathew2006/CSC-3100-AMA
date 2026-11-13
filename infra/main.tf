locals {
  resource_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Sprint 5 planned resources:
# - S3 bucket and CloudFront distribution for the React frontend
# - ECR repository for the Express API container image
# - ECS Fargate cluster, task definition, and service
# - IAM roles with least-privilege permissions
# - CloudWatch log groups, dashboards, and alarms