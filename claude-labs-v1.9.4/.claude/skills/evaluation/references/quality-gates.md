# 품질 게이트 상세 설정

## 필수 게이트 (Phase 병합 조건)

### 1. 테스트 커버리지

```yaml
test_coverage:
  minimum: 70%
  target: 85%

  backend:
    tool: pytest --cov
    config: pyproject.toml [tool.coverage]
    exclude:
      - "*/migrations/*"
      - "*/tests/*"
      - "*/__init__.py"

  frontend:
    tool: vitest --coverage
    config: vitest.config.ts
    exclude:
      - "**/*.d.ts"
      - "**/test/**"
```

### 2. 린트 검사

```yaml
lint:
  maximum_errors: 0
  maximum_warnings: 10

  backend:
    tools:
      - ruff check .
      - pylint app/
    config: pyproject.toml [tool.ruff]

  frontend:
    tools:
      - eslint src/
      - prettier --check src/
    config: .eslintrc.js
```

### 3. 타입 검사

```yaml
type_check:
  maximum_errors: 0

  backend:
    tool: mypy .
    config: pyproject.toml [tool.mypy]
    strict: false  # 점진적 도입

  frontend:
    tool: tsc --noEmit
    config: tsconfig.json
    strict: true
```

### 4. 보안 검사

```yaml
security:
  critical: 0  # 크리티컬 취약점 0개
  high: 0      # 높음 취약점 0개

  backend:
    tools:
      - bandit -r app/
      - pip-audit

  frontend:
    tools:
      - npm audit --audit-level=high
```

---

## 권장 게이트 (경고만 표시)

### 1. 코드 복잡도

```yaml
complexity:
  cyclomatic:
    warning: 10
    error: 15

  backend:
    tool: radon cc app/ -a -s

  frontend:
    tool: eslint --rule 'complexity: [warn, 10]'
```

### 2. 코드 중복

```yaml
duplication:
  warning: 5%
  error: 10%

  tool: jscpd --min-lines 5 --min-tokens 50
  ignore:
    - "**/test/**"
    - "**/*.json"
```

### 3. 문서화

```yaml
documentation:
  public_api: required
  internal: recommended

  backend:
    tool: interrogate -v app/
    minimum: 80%

  frontend:
    tool: typedoc --validation
```

---

## 품질 게이트 실행 스크립트

### Backend (Python)

```bash
#!/bin/bash
# scripts/quality-gate-backend.sh

set -e
echo "🔍 Backend 품질 게이트 검사..."

# 1. 테스트 + 커버리지
echo "📊 테스트 커버리지 검사..."
pytest --cov=app --cov-fail-under=70 --cov-report=term-missing

# 2. 린트
echo "🔧 린트 검사..."
ruff check .

# 3. 타입
echo "📝 타입 검사..."
mypy . --ignore-missing-imports

# 4. 보안
echo "🔒 보안 검사..."
bandit -r app/ -ll

echo "✅ Backend 품질 게이트 통과!"
```

### Frontend (TypeScript/React)

```bash
#!/bin/bash
# scripts/quality-gate-frontend.sh

set -e
echo "🔍 Frontend 품질 게이트 검사..."

# 1. 테스트 + 커버리지
echo "📊 테스트 커버리지 검사..."
vitest run --coverage --coverage.thresholds.lines=70

# 2. 린트
echo "🔧 린트 검사..."
eslint src/ --max-warnings=0

# 3. 타입
echo "📝 타입 검사..."
tsc --noEmit

# 4. 빌드 검증
echo "🏗️ 빌드 검사..."
npm run build

echo "✅ Frontend 품질 게이트 통과!"
```

---

## 게이트 실패 시 행동

### 실패 유형별 대응

| 게이트 | 실패 시 행동 |
|--------|-------------|
| 커버리지 < 70% | 부족한 파일 식별 → 테스트 추가 |
| 린트 에러 | 자동 수정 (ruff --fix) 시도 |
| 타입 에러 | 에러 위치 표시 → 수동 수정 |
| 보안 취약점 | 즉시 수정 필수 (병합 차단) |

### 자동 수정 가능 여부

```yaml
auto_fix:
  lint: true        # ruff --fix, eslint --fix
  format: true      # black, prettier
  imports: true     # isort, eslint-plugin-import

  type_errors: false  # 수동 수정 필요
  security: false     # 수동 검토 필요
  coverage: false     # 테스트 작성 필요
```

---

## CI/CD 연동 예시

### GitHub Actions

```yaml
name: Quality Gate

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Backend Quality Gate
        run: |
          pip install -r requirements.txt
          pytest --cov=app --cov-fail-under=70
          ruff check .
          mypy .

      - name: Frontend Quality Gate
        run: |
          npm ci
          npm run test:coverage
          npm run lint
          npm run build
```
