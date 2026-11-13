variable "project_name" {
  description = "Name used to identify PolyProvision cloud resources."
  type        = string
  default     = "polyprovision"
}

variable "environment" {
  description = "Deployment environment, such as dev, staging, or production."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region where PolyProvision resources will be deployed."
  type        = string
  default     = "us-west-2"
}