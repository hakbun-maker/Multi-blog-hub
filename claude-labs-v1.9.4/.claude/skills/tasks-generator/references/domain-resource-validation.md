# Domain Resource Validation 규칙

> "화면이 주도하되, 도메인이 방어한다"
> 화면 요구사항과 도메인 리소스 간 Interface Contract Validation

---

## 왜 검증이 필요한가?

### 실패 사례

| 실패 | 원인 | 검증으로 방지 |
|------|------|-------------|
| 500 Internal Server Error | 화면이 요구하는 필드가 API에 없음 | Field Coverage 검증 |
| 404 Not Found | 화면이 참조하는 엔드포인트가 없음 | Endpoint Existence 검증 |
| 401 Unauthorized | 화면과 API의 인증 요구사항 불일치 | Auth Consistency 검증 |

---

## 검증 규칙

### 1. Field Coverage (필드 커버리지)

화면이 필요한 필드(`needs`)가 리소스에 정의된 필드(`fields`)에 존재하는지 검증합니다.

```yaml
# 화면 명세 (product-list.yaml)
data_requirements:
  - resource: products
    needs: [id, name, price, thumbnail, discount_rate]

# 리소스 정의 (resources.yaml)
resources:
  products:
    fields:
      id: { type: uuid }
      name: { type: string }
      price: { type: number }
      thumbnail: { type: string }
      # discount_rate 없음!
```

**검증 결과:**

```
┌─────────────────────────────────────────────────────────────┐
│  Field Coverage Validation                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  화면: product-list.yaml                                     │
│  리소스: products                                            │
│                                                              │
│  ✅ id           → products.id         (uuid)               │
│  ✅ name         → products.name       (string)             │
│  ✅ price        → products.price      (number)             │
│  ✅ thumbnail    → products.thumbnail  (string)             │
│  ❌ discount_rate → ???                NOT FOUND            │
│                                                              │
│  FAILED: products.discount_rate 필드가 정의되지 않음         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Endpoint Existence (엔드포인트 존재)

화면이 사용하는 리소스의 엔드포인트가 정의되어 있는지 검증합니다.

```yaml
# 화면 명세 (product-detail.yaml)
data_requirements:
  - resource: products
    needs: [id, name, description]  # 상세 조회 필요
  - resource: reviews
    needs: [id, content, rating]    # 리뷰 목록 필요

# 리소스 정의 (resources.yaml)
resources:
  products:
    endpoints:
      - method: GET
        path: /api/products
      - method: GET
        path: /api/products/:id
  # reviews 리소스 없음!
```

**검증 결과:**

```
┌─────────────────────────────────────────────────────────────┐
│  Endpoint Existence Validation                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  화면: product-detail.yaml                                   │
│                                                              │
│  ✅ products                                                 │
│     - GET /api/products      (목록)                          │
│     - GET /api/products/:id  (상세)                          │
│                                                              │
│  ❌ reviews                                                  │
│     - 리소스 정의 없음!                                      │
│                                                              │
│  FAILED: reviews 리소스가 정의되지 않음                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Auth Consistency (인증 일관성)

화면과 리소스의 인증 요구사항이 일치하는지 검증합니다.

```yaml
# 화면 명세 (cart.yaml)
screen:
  name: 장바구니
  route: /cart
  auth: true  # 인증 필요

data_requirements:
  - resource: cart
    needs: [items, total]
    auth_required: true

  - resource: products
    needs: [id, name, price]
    # auth_required 없음 (public)

# 리소스 정의 (resources.yaml)
resources:
  cart:
    auth_required: true
    endpoints:
      - method: GET
        path: /api/cart
        auth: true

  products:
    # auth 없음 (public)
    endpoints:
      - method: GET
        path: /api/products
```

**검증 결과:**

```
┌─────────────────────────────────────────────────────────────┐
│  Auth Consistency Validation                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  화면: cart.yaml (auth: true)                                │
│                                                              │
│  ✅ cart                                                     │
│     - 화면 auth: true                                        │
│     - 리소스 auth_required: true                             │
│     - 일치!                                                  │
│                                                              │
│  ✅ products                                                 │
│     - 화면 auth_required: false (기본값)                     │
│     - 리소스 auth_required: false (기본값)                   │
│     - 일치!                                                  │
│                                                              │
│  PASSED: 모든 인증 요구사항 일치                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 검증 워크플로우

### 자동 검증 시점

```
/tasks-generator 실행
       ↓
Phase 0: Domain Resources 읽기
       ↓
Phase 1: Screen 명세 읽기
       ↓
Phase 2: Interface Contract Validation
       ├── Field Coverage
       ├── Endpoint Existence
       └── Auth Consistency
       ↓
검증 실패 시 → 태스크 생성 중단!
검증 통과 시 → 태스크 생성 진행
```

### 검증 실패 시 조치

```
┌─────────────────────────────────────────────────────────────┐
│  ❌ Interface Contract Validation FAILED                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  발견된 문제:                                                 │
│                                                              │
│  1. [Field Coverage] products.thumbnail 미정의               │
│  2. [Endpoint] reviews 리소스 미정의                         │
│  3. [Auth] wishlist 인증 요구 불일치                         │
│                                                              │
│  해결 방법:                                                  │
│                                                              │
│  1. specs/domain/resources.yaml 업데이트:                    │
│     products:                                                │
│       fields:                                                │
│         thumbnail: { type: string }  # 추가                  │
│                                                              │
│  2. reviews 리소스 정의 추가:                                 │
│     reviews:                                                 │
│       endpoints: [...]                                       │
│       fields: [...]                                          │
│                                                              │
│  3. wishlist auth_required 추가:                              │
│     wishlist:                                                │
│       auth_required: true                                    │
│                                                              │
│  → 수정 후 /tasks-generator 재실행                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Coverage Matrix

검증 통과 시 Coverage Matrix를 출력합니다:

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ Interface Contract Validation PASSED                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Coverage Matrix                                             │
│                                                              │
│  Resource     │ Fields  │ Endpoints │ Screens Using          │
│  ─────────────┼─────────┼───────────┼────────────────        │
│  products     │ 6/6 ✅  │ 3/3 ✅    │ product-list, detail   │
│  categories   │ 4/4 ✅  │ 1/1 ✅    │ product-list           │
│  cart         │ 3/3 ✅  │ 3/3 ✅    │ cart                   │
│  wishlist     │ 2/2 ✅  │ 2/2 ✅    │ product-list           │
│  orders       │ 5/5 ✅  │ 4/4 ✅    │ checkout, order-list   │
│                                                              │
│  Total: 5 resources, 8 screens, 100% coverage               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 검증 태스크 생성

검증 통과 후 각 화면에 Verification 태스크가 생성됩니다:

```markdown
### [ ] P2-S1-V: 연결점 검증
- **담당**: test-specialist
- **화면**: /products
- **검증 항목**:
  - [ ] Field Coverage: products.[id,name,price,thumbnail] 존재
  - [ ] Field Coverage: categories.[id,name,slug] 존재
  - [ ] Endpoint: GET /api/products 응답 정상
  - [ ] Endpoint: GET /api/categories 응답 정상
  - [ ] Navigation: ProductCard → /products/:id 라우트 존재
  - [ ] Auth: wishlist API 인증 체크
- **파일**: `tests/integration/product-list.verify.ts`
```

---

## 검증 스크립트

검증을 수동으로 실행할 수 있는 스크립트:

```bash
# 검증 실행
/tasks-generator validate

# 출력 예시
[Domain Resource Validation]

Reading specs/domain/resources.yaml...
Reading specs/screens/*.yaml...

Validating product-list.yaml...
  ✅ Field Coverage: products (5/5)
  ✅ Field Coverage: categories (4/4)
  ✅ Endpoint Existence: 4/4 endpoints
  ✅ Auth Consistency: all match

Validating product-detail.yaml...
  ✅ Field Coverage: products (8/8)
  ✅ Field Coverage: reviews (4/4)
  ✅ Endpoint Existence: 3/3 endpoints
  ✅ Auth Consistency: all match

✅ All validations passed!
```

---

## 체크리스트

```
+---------------------------------------------------------------------+
|  Domain Resource Validation 체크리스트                                |
+---------------------------------------------------------------------+
|                                                                     |
|  📋 사전 조건                                                        |
|                                                                     |
|  [ ] specs/domain/resources.yaml 파일 존재                          |
|  [ ] specs/screens/*.yaml 파일 존재                                  |
|  [ ] 모든 화면에 data_requirements 섹션 존재                          |
|                                                                     |
|  ✅ Field Coverage                                                   |
|                                                                     |
|  [ ] 모든 화면의 needs 필드가 리소스 fields에 존재                    |
|  [ ] 필드 타입이 일치 (uuid, string, number 등)                       |
|                                                                     |
|  ✅ Endpoint Existence                                               |
|                                                                     |
|  [ ] 모든 참조 리소스가 resources.yaml에 정의됨                       |
|  [ ] 필요한 HTTP 메서드 (GET, POST 등) 엔드포인트 존재                |
|                                                                     |
|  ✅ Auth Consistency                                                 |
|                                                                     |
|  [ ] 화면 auth와 리소스 auth_required 일치                           |
|  [ ] 인증 필요 화면의 모든 리소스가 인증 체크                         |
|                                                                     |
+---------------------------------------------------------------------+

⚠️ 검증 실패 시 태스크 생성이 중단됩니다!
⚠️ 리소스 정의를 먼저 수정한 후 재실행하세요!
```
