# PolyProvision Terraform Infrastructure

This folder contains Terraform configuration for PolyProvision
AWS infrastructure.

## Sprint 4 scope

This foundation establishes:

- Terraform and AWS provider version requirements
- Shared project variables and standard tags
- Naming conventions for future resources
- Validation and formatting commands

This configuration intentionally creates no AWS resources yet.

## Planned Sprint 5 resources

- S3 and CloudFront for the React frontend
- ECR for the Express API Docker image
- ECS Fargate for the Express API
- IAM roles and policies
- CloudWatch logs, monitoring, and alarms

## Validate locally

From the repository root:

```powershell
cd infra
terraform init -backend=false
terraform fmt -check
terraform validate
```
