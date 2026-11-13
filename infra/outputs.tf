output "project_name" {
  description = "Configured project name."
  value       = var.project_name
}

output "environment" {
  description = "Configured deployment environment."
  value       = var.environment
}

output "aws_region" {
  description = "Configured AWS deployment region."
  value       = var.aws_region
}

output "resource_prefix" {
  description = "Prefix future AWS resources will use."
  value       = local.resource_prefix
}