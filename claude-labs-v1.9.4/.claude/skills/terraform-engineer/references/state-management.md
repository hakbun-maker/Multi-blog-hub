# Terraform 상태 관리

> **로드 시점**: Remote backend 설정, State 조작(import, mv, rm), 민감 데이터 처리가 필요할 때

---

## 개념

Terraform State는 실제 인프라와 Terraform 구성 간의 매핑을 저장하는 JSON 파일입니다. State 파일이 없으면 Terraform은 어떤 리소스를 관리하는지 알 수 없습니다.

---

## Remote State Backend

### 왜 Remote State가 필요한가?

| Local State | Remote State |
|-------------|--------------|
| 단일 사용자만 작업 가능 | 팀 협업 가능 |
| State 파일 유실 위험 | 자동 백업 및 버전 관리 |
| Locking 미지원 | State Locking으로 동시 실행 방지 |
| 민감 데이터 로컬 저장 | 암호화된 저장소 사용 |

### AWS S3 + DynamoDB Backend

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "myapp-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"

    # 선택적: KMS 암호화
    kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abcd1234-a1b2-c3d4-e5f6-123456789abc"
  }
}
```

### S3 버킷 및 DynamoDB 테이블 설정

```hcl
# backend-resources.tf (별도 프로젝트로 먼저 생성)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "myapp-terraform-state"

  tags = {
    Name        = "Terraform State Bucket"
    Environment = "global"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "terraform-state-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Terraform State Lock Table"
    Environment = "global"
    ManagedBy   = "Terraform"
  }
}
```

### GCP Cloud Storage Backend

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket  = "myapp-terraform-state"
    prefix  = "prod"
    encryption_key = "your-base64-encoded-key"
  }
}
```

### Azure Blob Storage Backend

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "myapptfstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

---

## State Locking

### DynamoDB를 사용한 State Locking (AWS)

```hcl
terraform {
  backend "s3" {
    # ... 기타 설정
    dynamodb_table = "terraform-state-lock"
  }
}
```

```bash
# Locking 동작 확인
# 터미널 1
terraform apply

# 터미널 2 (동시 실행 시도)
terraform apply
# Error: Error locking state: ConditionalCheckFailedException
```

### Lock 강제 해제 (주의!)

```bash
# Lock ID 확인
terraform force-unlock <lock-id>

# ⚠️ 경고: 다른 사용자가 작업 중일 수 있으므로 신중히 사용
```

---

## State 조작 명령어

### terraform state list

```bash
# 모든 리소스 목록
terraform state list

# 특정 리소스만 필터링
terraform state list | grep aws_instance
```

출력 예시:
```
aws_vpc.main
aws_subnet.public[0]
aws_subnet.public[1]
aws_instance.app[0]
aws_instance.app[1]
```

### terraform state show

```bash
# 특정 리소스의 상세 정보
terraform state show aws_instance.app[0]
```

출력 예시:
```hcl
# aws_instance.app[0]:
resource "aws_instance" "app" {
    ami                          = "ami-12345678"
    instance_type                = "t3.micro"
    id                           = "i-0abcd1234efgh5678"
    private_ip                   = "10.0.1.10"
    tags                         = {
        "Environment" = "prod"
        "Name"        = "app-server-1"
    }
}
```

### terraform state mv (리소스 이름 변경)

```bash
# 리소스 이름 변경
terraform state mv aws_instance.old_name aws_instance.new_name

# 리소스를 모듈로 이동
terraform state mv aws_instance.app module.ec2.aws_instance.app

# 인덱스가 있는 리소스 이동
terraform state mv 'aws_instance.app[0]' 'aws_instance.app[1]'
```

### terraform state rm (State에서 제거)

```bash
# State에서 리소스 제거 (실제 리소스는 삭제되지 않음)
terraform state rm aws_instance.app

# 여러 리소스 제거
terraform state rm aws_instance.app aws_security_group.app

# 인덱스가 있는 리소스 제거
terraform state rm 'aws_instance.app[0]'
```

### terraform state pull/push

```bash
# Remote state를 로컬로 다운로드
terraform state pull > terraform.tfstate.backup

# 로컬 state를 remote로 업로드 (⚠️ 위험)
terraform state push terraform.tfstate.backup
```

---

## terraform import (기존 리소스 가져오기)

### 개념

이미 생성된 인프라 리소스를 Terraform State에 추가하여 Terraform으로 관리할 수 있게 합니다.

### Import 절차

#### 1단계: 리소스 정의 작성

```hcl
# main.tf
resource "aws_instance" "imported" {
  # 최소한의 필수 속성만 작성
  ami           = "ami-12345678"
  instance_type = "t3.micro"

  tags = {
    Name = "existing-instance"
  }
}
```

#### 2단계: Import 실행

```bash
# AWS EC2 인스턴스 import
terraform import aws_instance.imported i-0abcd1234efgh5678

# AWS VPC import
terraform import aws_vpc.main vpc-12345678

# AWS S3 버킷 import
terraform import aws_s3_bucket.data my-existing-bucket
```

#### 3단계: State 확인 및 정의 수정

```bash
# Import된 리소스 확인
terraform state show aws_instance.imported

# 출력된 실제 속성을 보고 main.tf 수정
```

```hcl
# main.tf (수정 후)
resource "aws_instance" "imported" {
  ami                    = "ami-12345678"
  instance_type          = "t3.micro"
  subnet_id              = "subnet-abcd1234"
  vpc_security_group_ids = ["sg-12345678"]

  tags = {
    Name        = "existing-instance"
    Environment = "prod"
  }
}
```

#### 4단계: Plan으로 검증

```bash
# 변경사항이 없어야 성공
terraform plan
# No changes. Your infrastructure matches the configuration.
```

### 여러 리소스 한 번에 Import

```bash
# import.sh
terraform import aws_vpc.main vpc-12345678
terraform import aws_subnet.public[0] subnet-aaaa1111
terraform import aws_subnet.public[1] subnet-bbbb2222
terraform import aws_internet_gateway.main igw-abcd1234
```

---

## Workspace 관리

### Workspace 개념

동일한 Terraform 구성으로 여러 환경을 관리할 수 있는 기능입니다.

### Workspace 명령어

```bash
# 현재 workspace 확인
terraform workspace show

# 모든 workspace 목록
terraform workspace list

# 새 workspace 생성
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Workspace 전환
terraform workspace select dev

# Workspace 삭제
terraform workspace delete dev
```

### Workspace 활용 패턴

```hcl
# main.tf
locals {
  env_config = {
    dev = {
      instance_count = 1
      instance_type  = "t3.micro"
    }
    staging = {
      instance_count = 2
      instance_type  = "t3.small"
    }
    prod = {
      instance_count = 3
      instance_type  = "t3.medium"
    }
  }

  current = local.env_config[terraform.workspace]
}

resource "aws_instance" "app" {
  count         = local.current.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.current.instance_type

  tags = {
    Name        = "app-${terraform.workspace}-${count.index + 1}"
    Environment = terraform.workspace
    ManagedBy   = "Terraform"
  }
}
```

### Workspace별 Backend

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "myapp-terraform-state"
    key            = "env/${terraform.workspace}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

---

## 민감 데이터 처리

### sensitive 변수

```hcl
variable "db_password" {
  description = "데이터베이스 비밀번호"
  type        = string
  sensitive   = true
}

output "db_endpoint" {
  description = "데이터베이스 엔드포인트"
  value       = aws_db_instance.main.endpoint
}

output "db_password" {
  description = "데이터베이스 비밀번호"
  value       = aws_db_instance.main.password
  sensitive   = true  # Plan 출력에서 숨김
}
```

### HashiCorp Vault 통합

```hcl
# Vault Provider 설정
provider "vault" {
  address = "https://vault.example.com:8200"
  token   = var.vault_token
}

# Vault에서 비밀 읽기
data "vault_generic_secret" "db_creds" {
  path = "secret/database/prod"
}

resource "aws_db_instance" "main" {
  allocated_storage = 20
  engine            = "mysql"
  instance_class    = "db.t3.micro"

  # Vault에서 가져온 값 사용
  username = data.vault_generic_secret.db_creds.data["username"]
  password = data.vault_generic_secret.db_creds.data["password"]
}
```

### AWS Secrets Manager 통합

```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "main" {
  allocated_storage = 20
  engine            = "mysql"
  instance_class    = "db.t3.micro"

  username = "admin"
  password = jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string)["password"]
}
```

### 환경 변수 사용

```bash
# .env (Git에서 제외)
export TF_VAR_db_password="super-secret-password"
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

```hcl
variable "db_password" {
  type      = string
  sensitive = true
  # TF_VAR_db_password 환경 변수에서 자동 로드
}
```

---

## State 백업 및 복구

### 자동 백업

```bash
# Terraform은 변경 전 자동으로 백업 생성
ls -la
# terraform.tfstate
# terraform.tfstate.backup
```

### 수동 백업

```bash
# Remote state 백업
terraform state pull > terraform-$(date +%Y%m%d-%H%M%S).tfstate

# 주기적 백업 스크립트
#!/bin/bash
BACKUP_DIR="./state-backups"
mkdir -p "$BACKUP_DIR"
terraform state pull > "$BACKUP_DIR/terraform-$(date +%Y%m%d-%H%M%S).tfstate"
```

### State 복구

```bash
# 백업에서 복구
cp terraform.tfstate.backup terraform.tfstate

# Remote state에 강제 업로드 (⚠️ 위험)
terraform state push terraform.tfstate.backup
```

---

## 주의사항

### 1. State 파일 Git 커밋 금지

```bash
# .gitignore
*.tfstate
*.tfstate.*
.terraform/
```

### 2. State 파일 직접 수정 금지

```bash
# ❌ 절대 하지 말 것
vim terraform.tfstate

# ✅ Terraform 명령어 사용
terraform state mv
terraform state rm
```

### 3. Remote State 마이그레이션 절차

```bash
# 1. 로컬 state 백업
cp terraform.tfstate terraform.tfstate.local-backup

# 2. backend.tf 작성
cat > backend.tf << 'EOF'
terraform {
  backend "s3" {
    bucket = "myapp-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
EOF

# 3. Backend 초기화 (기존 state 복사)
terraform init -migrate-state

# 4. 마이그레이션 확인
terraform state list
```

### 4. State Locking 타임아웃

```bash
# Locking 타임아웃이 발생할 경우
terraform apply -lock-timeout=10m
```

---

## 트러블슈팅

### 문제 1: State Lock 해제 안 됨

```bash
# 증상
Error: Error locking state: ConditionalCheckFailedException

# 원인
이전 실행이 비정상 종료되어 Lock이 남아있음

# 해결
terraform force-unlock <lock-id>
```

### 문제 2: State Drift (실제 인프라와 State 불일치)

```bash
# 증상
terraform plan shows changes that you didn't make

# 원인
누군가 Terraform 외부에서 인프라 수정

# 해결 1: Refresh로 State 동기화
terraform refresh

# 해결 2: Import로 누락 리소스 추가
terraform import aws_instance.app i-12345678
```

### 문제 3: Remote State 접근 권한 에러

```bash
# 증상
Error: error loading the remote state

# 원인
S3 버킷/DynamoDB 접근 권한 없음

# 해결
aws s3 ls s3://myapp-terraform-state  # 접근 확인
# IAM 정책에 s3:GetObject, s3:PutObject, dynamodb:PutItem 권한 추가
```

---

**마지막 업데이트**: 2026-02-15
