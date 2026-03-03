# Terraform 모듈 패턴

> **로드 시점**: 재사용 가능한 모듈 설계, 모듈 소스 선택, 환경별 분리가 필요할 때

---

## 개념

Terraform 모듈은 재사용 가능한 인프라 구성 요소를 캡슐화합니다. 각 모듈은 입력(variables), 로직(resources), 출력(outputs)으로 구성됩니다.

---

## 기본 모듈 구조

### 파일 분리 원칙

```
modules/{module-name}/
├── main.tf         # 리소스 정의
├── variables.tf    # 입력 변수
├── outputs.tf      # 출력 값
└── README.md       # 사용 설명서
```

### variables.tf 패턴

```hcl
# modules/vpc/variables.tf

variable "name" {
  description = "VPC 이름"
  type        = string
}

variable "cidr_block" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "유효한 CIDR 블록이어야 합니다."
  }
}

variable "environment" {
  description = "환경 이름 (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment는 dev, staging, prod 중 하나여야 합니다."
  }
}

variable "tags" {
  description = "추가 태그"
  type        = map(string)
  default     = {}
}
```

### main.tf 패턴

```hcl
# modules/vpc/main.tf

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    {
      Name        = var.name
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.tags
  )
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    {
      Name        = "${var.name}-public-${count.index + 1}"
      Environment = var.environment
      Type        = "public"
      ManagedBy   = "Terraform"
    },
    var.tags
  )
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.name}-igw"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

### outputs.tf 패턴

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "VPC CIDR 블록"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "퍼블릭 서브넷 ID 목록"
  value       = aws_subnet.public[*].id
}

output "internet_gateway_id" {
  description = "인터넷 게이트웨이 ID"
  value       = aws_internet_gateway.main.id
}
```

---

## 모듈 소스 패턴

### 1. 로컬 모듈

```hcl
# 루트 모듈에서 로컬 모듈 호출
module "vpc" {
  source = "./modules/vpc"

  name        = "myapp-vpc"
  cidr_block  = "10.0.0.0/16"
  environment = "dev"
}
```

### 2. Git 소스 모듈

```hcl
# Git 저장소의 모듈 사용
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v1.0.0"

  name        = "myapp-vpc"
  cidr_block  = "10.0.0.0/16"
  environment = "dev"
}
```

### 3. Terraform Registry 모듈

```hcl
# 공식 레지스트리 모듈 사용
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "myapp-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false

  tags = {
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}
```

---

## 환경별 분리 패턴

### 패턴 1: Workspace 사용

```hcl
# main.tf
locals {
  env_config = {
    dev = {
      instance_type = "t3.micro"
      instance_count = 1
    }
    staging = {
      instance_type = "t3.small"
      instance_count = 2
    }
    prod = {
      instance_type = "t3.medium"
      instance_count = 3
    }
  }

  current_env = local.env_config[terraform.workspace]
}

resource "aws_instance" "app" {
  count         = local.current_env.instance_count
  instance_type = local.current_env.instance_type

  tags = {
    Environment = terraform.workspace
    ManagedBy   = "Terraform"
  }
}
```

```bash
# Workspace 사용법
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

terraform workspace select dev
terraform apply

terraform workspace select prod
terraform apply
```

### 패턴 2: 디렉토리 분리

```
environments/
├── dev/
│   ├── main.tf
│   ├── variables.tf
│   ├── terraform.tfvars
│   └── backend.tf
├── staging/
│   ├── main.tf
│   ├── variables.tf
│   ├── terraform.tfvars
│   └── backend.tf
└── prod/
    ├── main.tf
    ├── variables.tf
    ├── terraform.tfvars
    └── backend.tf
```

```hcl
# environments/dev/main.tf
module "vpc" {
  source = "../../modules/vpc"

  name        = "myapp-dev-vpc"
  cidr_block  = "10.0.0.0/16"
  environment = "dev"
}

# environments/prod/main.tf
module "vpc" {
  source = "../../modules/vpc"

  name        = "myapp-prod-vpc"
  cidr_block  = "10.1.0.0/16"
  environment = "prod"
}
```

### 패턴 3: Terragrunt 사용

```hcl
# terragrunt.hcl (환경별)
terraform {
  source = "../../modules/vpc"
}

inputs = {
  name        = "myapp-${path_relative_to_include()}-vpc"
  cidr_block  = "10.0.0.0/16"
  environment = path_relative_to_include()
}
```

```
terragrunt/
├── dev/
│   └── terragrunt.hcl
├── staging/
│   └── terragrunt.hcl
└── prod/
    └── terragrunt.hcl
```

```bash
# Terragrunt 사용법
cd terragrunt/dev
terragrunt apply

cd ../prod
terragrunt apply
```

---

## 고급 모듈 패턴

### 조건부 리소스 생성

```hcl
# modules/vpc/variables.tf
variable "enable_nat_gateway" {
  description = "NAT 게이트웨이 활성화 여부"
  type        = bool
  default     = false
}

# modules/vpc/main.tf
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "${var.name}-nat"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

### 동적 블록 패턴

```hcl
variable "ingress_rules" {
  description = "인바운드 규칙 목록"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = []
}

resource "aws_security_group" "main" {
  name   = var.name
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }

  tags = {
    Name        = var.name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

### for_each로 여러 리소스 생성

```hcl
variable "buckets" {
  description = "S3 버킷 맵"
  type = map(object({
    versioning = bool
    encryption = bool
  }))
}

resource "aws_s3_bucket" "buckets" {
  for_each = var.buckets

  bucket = each.key

  tags = {
    Name        = each.key
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "buckets" {
  for_each = { for k, v in var.buckets : k => v if v.versioning }

  bucket = aws_s3_bucket.buckets[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}
```

---

## 모듈 재사용 베스트 프랙티스

### 1. 명확한 변수명 사용

```hcl
# ❌ 나쁜 예
variable "n" { type = string }

# ✅ 좋은 예
variable "vpc_name" {
  description = "VPC 이름"
  type        = string
}
```

### 2. 기본값 제공

```hcl
variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.micro"
}
```

### 3. 타입 검증 추가

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment는 dev, staging, prod 중 하나여야 합니다."
  }
}
```

### 4. 출력에 설명 추가

```hcl
output "vpc_id" {
  description = "생성된 VPC의 ID"
  value       = aws_vpc.main.id
}
```

### 5. README 작성

```markdown
# VPC 모듈

AWS VPC를 생성하는 재사용 가능한 모듈입니다.

## 사용법

```hcl
module "vpc" {
  source = "./modules/vpc"

  name        = "myapp-vpc"
  cidr_block  = "10.0.0.0/16"
  environment = "dev"
}
```

## 입력 변수

| 이름 | 설명 | 타입 | 기본값 |
|------|------|------|--------|
| name | VPC 이름 | string | - |
| cidr_block | CIDR 블록 | string | 10.0.0.0/16 |

## 출력

| 이름 | 설명 |
|------|------|
| vpc_id | VPC ID |
| subnet_ids | 서브넷 ID 목록 |
```

---

## 모듈 버전 관리

### Git 태그 사용

```bash
# 모듈 저장소에서
git tag -a v1.0.0 -m "첫 릴리즈"
git push origin v1.0.0
```

```hcl
# 모듈 사용 시
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v1.0.0"
}
```

### 버전 제약

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"  # 5.0.x 버전만 허용
}
```

---

## 주의사항

### 1. 순환 의존성 방지

```hcl
# ❌ 잘못된 예 (순환 의존성)
# Module A가 Module B의 출력을 참조하고
# Module B가 Module A의 출력을 참조

# ✅ 올바른 예 (단방향 의존성)
module "vpc" {
  source = "./modules/vpc"
}

module "ec2" {
  source = "./modules/ec2"
  vpc_id = module.vpc.vpc_id  # VPC → EC2 단방향
}
```

### 2. 모듈 내부 리소스 직접 참조 금지

```hcl
# ❌ 잘못된 예
resource "aws_route_table_association" "external" {
  subnet_id      = module.vpc.aws_subnet.public[0].id  # 내부 리소스 직접 참조
  route_table_id = aws_route_table.custom.id
}

# ✅ 올바른 예 (모듈 출력 사용)
resource "aws_route_table_association" "external" {
  subnet_id      = module.vpc.public_subnet_ids[0]  # 출력값 사용
  route_table_id = aws_route_table.custom.id
}
```

### 3. 하드코딩 방지

```hcl
# ❌ 잘못된 예
resource "aws_instance" "app" {
  ami           = "ami-12345678"  # 하드코딩
  instance_type = "t3.micro"
}

# ✅ 올바른 예
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
}
```

---

**마지막 업데이트**: 2026-02-15
