# Domain Resources Schema

> 백엔드 API 계약을 정의하는 스키마
> `specs/domain/resources.yaml` 파일 형식

---

## 왜 Domain Resources가 필요한가?

### 화면 종속적 API의 문제

```yaml
# 나쁜 예: 화면마다 API 정의
# product-list.yaml
components:
  - id: product_grid
    api:
      endpoint: GET /api/products
      response:
        products: Product[]
        total: number

# product-detail.yaml
components:
  - id: product_info
    api:
      endpoint: GET /api/products/:id
      response:
        id: string
        name: string
        description: string  # 목록에는 없던 필드!
```

**문제점:**
- 같은 리소스(products)가 여러 화면에서 중복 정의
- 필드 불일치 가능성
- 백엔드가 화면에 종속됨

### Domain Resources의 해결책

```yaml
# 좋은 예: 리소스 중심 정의
# specs/domain/resources.yaml
resources:
  products:
    endpoints:
      - method: GET
        path: /api/products
      - method: GET
        path: /api/products/:id
    fields:
      id: { type: uuid }
      name: { type: string }
      price: { type: number }
      description: { type: string }
      thumbnail: { type: string }
```

**장점:**
- 리소스가 단일 소스로 정의
- 화면은 필요한 필드만 참조 (`needs`)
- 백엔드 독립적 설계

---

## Schema 구조

```yaml
# specs/domain/resources.yaml

version: "1.0"

resources:
  {resource_name}:
    name: string              # 리소스 표시 이름
    description: string       # 리소스 설명 (선택)
    auth_required: boolean    # 인증 필요 여부 (기본: false)

    endpoints:                # API 엔드포인트 목록
      - method: string        # HTTP 메서드 (GET, POST, PUT, DELETE)
        path: string          # URL 경로 (파라미터는 :id 형식)
        query_params: string[]  # 쿼리 파라미터 (선택)
        auth: boolean         # 개별 엔드포인트 인증 (선택)

    fields:                   # 리소스 필드 정의
      {field_name}:
        type: string          # 필드 타입
        required: boolean     # 필수 여부 (기본: true)
        description: string   # 필드 설명 (선택)
```

---

## 필드 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| `uuid` | UUID 형식 | `550e8400-e29b-41d4-a716-446655440000` |
| `string` | 문자열 | `"상품명"` |
| `number` | 숫자 (정수/실수) | `10000`, `0.15` |
| `boolean` | 불리언 | `true`, `false` |
| `datetime` | ISO 8601 날짜시간 | `2024-01-15T10:30:00Z` |
| `array` | 배열 | `[1, 2, 3]` |
| `object` | 객체 | `{ key: value }` |
| `ref:{resource}` | 다른 리소스 참조 | `ref:categories` |

---

## 전체 예시

```yaml
version: "1.0"

resources:
  # ===== Products =====
  products:
    name: Products
    description: 상품 리소스

    endpoints:
      - method: GET
        path: /api/products
        query_params: [category, min_price, max_price, sort, page, limit]

      - method: GET
        path: /api/products/:id

      - method: POST
        path: /api/products
        auth: true

      - method: PUT
        path: /api/products/:id
        auth: true

      - method: DELETE
        path: /api/products/:id
        auth: true

    fields:
      id:
        type: uuid
        description: 상품 고유 ID

      name:
        type: string
        description: 상품명

      description:
        type: string
        required: false
        description: 상품 상세 설명

      price:
        type: number
        description: 가격 (원)

      discount_rate:
        type: number
        required: false
        description: 할인율 (0.0 ~ 1.0)

      stock:
        type: number
        description: 재고 수량

      category_id:
        type: ref:categories
        description: 카테고리 참조

      thumbnail:
        type: string
        required: false
        description: 썸네일 이미지 URL

      created_at:
        type: datetime
        description: 생성 일시

      updated_at:
        type: datetime
        description: 수정 일시

  # ===== Categories =====
  categories:
    name: Categories
    description: 카테고리 리소스

    endpoints:
      - method: GET
        path: /api/categories

      - method: GET
        path: /api/categories/:id

    fields:
      id:
        type: uuid

      name:
        type: string

      slug:
        type: string
        description: URL 슬러그

      parent_id:
        type: uuid
        required: false
        description: 상위 카테고리 ID

      product_count:
        type: number
        description: 해당 카테고리 상품 수

  # ===== Cart =====
  cart:
    name: Cart
    description: 장바구니 리소스
    auth_required: true

    endpoints:
      - method: GET
        path: /api/cart
        auth: true

      - method: POST
        path: /api/cart/items
        auth: true

      - method: DELETE
        path: /api/cart/items/:id
        auth: true

    fields:
      id:
        type: uuid

      user_id:
        type: ref:users

      items:
        type: array
        description: 장바구니 아이템 목록

      total:
        type: number
        description: 총 금액

      item_count:
        type: number
        description: 아이템 수

  # ===== Wishlist =====
  wishlist:
    name: Wishlist
    description: 위시리스트 리소스
    auth_required: true

    endpoints:
      - method: GET
        path: /api/wishlist
        auth: true

      - method: POST
        path: /api/wishlist
        auth: true

      - method: DELETE
        path: /api/wishlist/:id
        auth: true

    fields:
      id:
        type: uuid

      user_id:
        type: ref:users

      product_id:
        type: ref:products

      created_at:
        type: datetime

  # ===== Orders =====
  orders:
    name: Orders
    description: 주문 리소스
    auth_required: true

    endpoints:
      - method: GET
        path: /api/orders
        auth: true

      - method: GET
        path: /api/orders/:id
        auth: true

      - method: POST
        path: /api/orders
        auth: true

      - method: GET
        path: /api/orders/:id/items
        auth: true

    fields:
      id:
        type: uuid

      user_id:
        type: ref:users

      status:
        type: string
        description: 주문 상태 (pending, paid, shipped, delivered)

      total:
        type: number

      items:
        type: array

      created_at:
        type: datetime
```

---

## 화면과의 연결

### 화면 명세에서 참조

```yaml
# specs/screens/product-list.yaml

data_requirements:
  - resource: products            # resources.yaml의 products 참조
    needs: [id, name, price, thumbnail]
    filters:
      category: "?category"
      page: "?page"

  - resource: categories          # resources.yaml의 categories 참조
    needs: [id, name, slug, product_count]
```

### 검증 규칙

1. **resource**: `resources.yaml`에 정의된 리소스 이름과 일치해야 함
2. **needs**: 해당 리소스의 `fields`에 정의된 필드여야 함
3. **auth_required**: 리소스의 `auth_required`와 일치해야 함

---

## 체크리스트

```
+---------------------------------------------------------------------+
|  Domain Resources 작성 체크리스트                                     |
+---------------------------------------------------------------------+
|                                                                     |
|  📋 기본 구조                                                        |
|                                                                     |
|  [ ] version: "1.0" 명시                                            |
|  [ ] 모든 리소스에 name 필드 있음                                    |
|  [ ] 모든 리소스에 endpoints 정의됨                                  |
|  [ ] 모든 리소스에 fields 정의됨                                     |
|                                                                     |
|  📡 Endpoints                                                        |
|                                                                     |
|  [ ] RESTful 경로 사용 (/api/{resources})                           |
|  [ ] 복수형 명사 사용 (products, not product)                        |
|  [ ] 파라미터는 :id 형식                                             |
|  [ ] 인증 필요 엔드포인트에 auth: true                               |
|                                                                     |
|  📝 Fields                                                           |
|                                                                     |
|  [ ] 모든 필드에 type 지정                                           |
|  [ ] 선택 필드에 required: false                                     |
|  [ ] 참조 필드에 ref:{resource} 형식                                 |
|  [ ] id 필드는 uuid 타입                                             |
|  [ ] 날짜 필드는 datetime 타입                                       |
|                                                                     |
|  🔐 Auth                                                             |
|                                                                     |
|  [ ] 인증 필요 리소스에 auth_required: true                          |
|  [ ] 개별 엔드포인트 인증에 auth: true                               |
|                                                                     |
+---------------------------------------------------------------------+
```

---

## 관련 문서

- [화면 명세 스키마 v2.0](./schema.md)
- [Domain Resource Validation](../../tasks-generator/references/domain-resource-validation.md)
- [FastAPI API Design 헌법](../../constitutions/fastapi/api-design.md)
