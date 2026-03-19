# TASKS 문서 생성 규칙 v2.0

이 문서는 TASKS (06-tasks.md) 생성 시 반드시 따라야 하는 규칙입니다.

## ⚠️ 출력 경로 필수 규칙

> **반드시 `docs/planning/06-tasks.md`에 생성! 프로젝트 루트 `TASKS.md` 금지!**

```bash
# 디렉토리 먼저 생성
mkdir -p docs/planning

# 올바른 출력 경로
docs/planning/06-tasks.md  ✅
TASKS.md                   ❌ (프로젝트 루트 금지!)
```

---

## 1. Task ID 형식 (v2.0 변경!)

### 새 Task ID 형식

| 형식 | 용도 | 예시 |
|------|------|------|
| `P{N}-T{M}.{X}` | 일반 태스크 | P0-T0.1: 프로젝트 초기화 |
| `P{N}-R{M}-T{X}` | **Backend Resource** | P2-R1-T1: Products API |
| `P{N}-S{M}-T{X}` | Frontend Screen | P2-S1-T1: Product List UI |
| `P{N}-S{M}-V` | Screen Verification | P2-S1-V: 연결점 검증 |

### Resource vs Screen 분리 (핵심!)

```
기존 (v1.0): 화면 종속적
P2-S1-T1: 상품 목록 백엔드  ← 화면에 종속

개선 (v2.0): 리소스 독립적
P2-R1-T1: Products API     ← 리소스 독립
P2-S1-T1: 상품 목록 UI     ← 화면 전용
```

---

## 2. Phase 번호 규칙

**모든 태스크 ID에는 반드시 Phase 접두사를 포함해야 합니다!**

오케스트레이터가 서브에이전트를 호출할 때 Phase 번호로 Git Worktree 생성 여부를 결정합니다:
- **Phase 0** → main 브랜치에서 작업 (Worktree 불필요)
- **Phase 1+** → Git Worktree 생성 후 작업

| 올바른 형식 | 잘못된 형식 |
|-------------|-------------|
| `P0-T0.1: 프로젝트 초기화` | `T0.1: 프로젝트 초기화` |
| `P2-R1-T1: Products API` | `R1-T1: Products API` |
| `P2-S1-T1: 상품 목록 UI` | `S1-T1: 상품 목록 UI` |

### Phase 번호 매핑

| 마일스톤 | Phase | 예시 |
|----------|-------|------|
| M0 (프로젝트 셋업) | P0 | `P0-T0.1` ~ `P0-T0.4` |
| M0.5 (계약 & 테스트) | P0 | `P0-T0.5.1` ~ `P0-T0.5.3` |
| M1 (공통 리소스/레이아웃) | P1 | `P1-R1`, `P1-S0` |
| M2 (핵심 기능) | P2 | `P2-R1`, `P2-S1` |

---

## 3. Resource 태스크 템플릿 (NEW!)

> **Backend API는 화면에 종속되지 않습니다.**
> 리소스 단위로 태스크를 생성합니다.

### Resource 태스크 형식

```markdown
## P{N}-R{M}: {Resource 이름} Resource

### [ ] P{N}-R{M}-T1: {Resource 이름} API 구현
- **담당**: backend-specialist
- **리소스**: {resource_name}
- **엔드포인트**:
  - GET /api/{resources} (목록)
  - GET /api/{resources}/:id (상세)
  - POST /api/{resources} (생성)
  - PUT /api/{resources}/:id (수정)
  - DELETE /api/{resources}/:id (삭제)
- **필드**: {field1}, {field2}, ...
- **파일**: `tests/api/test_{resources}.py` → `app/routes/{resources}.py`
- **스펙**: {구현할 기능 요약}
- **Worktree**: `worktree/phase-{N}-resources`
- **TDD**: RED → GREEN → REFACTOR
- **헌법**: `constitutions/{framework}/api-design.md` 준수
```

### Resource 태스크 예시

```markdown
## P2-R1: Products Resource

### [ ] P2-R1-T1: Products API 구현
- **담당**: backend-specialist
- **리소스**: products
- **엔드포인트**:
  - GET /api/products
  - GET /api/products/:id
  - POST /api/products
- **필드**: id, name, price, description, thumbnail, category_id
- **파일**: `tests/api/test_products.py` → `app/routes/products.py`
- **스펙**: 상품 CRUD API (목록/상세/생성)
- **Worktree**: `worktree/phase-2-resources`
- **TDD**: RED → GREEN → REFACTOR
- **헌법**: `constitutions/fastapi/api-design.md` 준수

## P2-R2: Categories Resource

### [ ] P2-R2-T1: Categories API 구현
- **담당**: backend-specialist
- **리소스**: categories
- **엔드포인트**:
  - GET /api/categories
- **필드**: id, name, slug, product_count
- **파일**: `tests/api/test_categories.py` → `app/routes/categories.py`
- **스펙**: 카테고리 목록 API
- **Worktree**: `worktree/phase-2-resources`
- **TDD**: RED → GREEN → REFACTOR
- **헌법**: `constitutions/fastapi/api-design.md` 준수
```

---

## 4. Screen 태스크 템플릿

### Screen 태스크 형식

```markdown
## P{N}-S{M}: {화면 이름} 화면

### [ ] P{N}-S{M}-T1: {화면 이름} UI 구현
- **담당**: frontend-specialist
- **화면**: {route}
- **컴포넌트**: {ComponentA}, {ComponentB}, ...
- **데이터 요구**: {resource1}, {resource2} (data_requirements 참조)
- **파일**: `tests/pages/{Screen}.test.tsx` → `src/pages/{route}/index.tsx`
- **스펙**: {구현할 기능 요약}
- **Worktree**: `worktree/phase-{N}-{feature}`
- **TDD**: RED → GREEN → REFACTOR
- **데모**: `/demo/phase-{N}/s{M}-{screen-name}`
- **데모 상태**: loading, error, empty, normal

### [ ] P{N}-S{M}-T2: {화면 이름} 통합 테스트
- **담당**: test-specialist
- **화면**: {route}
- **시나리오**: {scenario1}, {scenario2}, ...
- **파일**: `tests/e2e/{screen-name}.spec.ts`
- **Worktree**: `worktree/phase-{N}-{feature}`

### [ ] P{N}-S{M}-V: 연결점 검증
- **담당**: test-specialist
- **화면**: {route}
- **검증 항목**:
  - [ ] Field Coverage: {resource}.[fields] 존재
  - [ ] Endpoint: GET /api/{resource} 존재
  - [ ] Navigation: {Component} → {route} 라우트 존재
  - [ ] Auth: {resource} 인증 체크
```

---

## 5. TDD 워크플로우 규칙

**Phase 1+ 태스크에는 테스트→구현 파일 경로만 명시합니다.**

### 태스크 필수 포함 요소 (4항목 + 자동화 3항목)

| 요소 | 설명 | 예시 |
|------|------|------|
| **담당** | 실행할 에이전트 | `backend-specialist` |
| **파일** | 테스트 → 구현 경로 | `tests/test_auth.py` → `app/auth.py` |
| **스펙** | 구현할 기능 요약 | `로그인/로그아웃 엔드포인트` |
| **Worktree** | Git Worktree 경로 | `worktree/phase-2-products` |
| **TDD** | TDD 사이클 | `RED → GREEN → REFACTOR` |
| **병렬** | 병렬 실행 가능 태스크 | `P2-R2-T1과 병렬 가능` |

### Resource 태스크 추가 요소

| 요소 | 설명 | 예시 |
|------|------|------|
| **리소스** | 리소스 이름 | `products` |
| **엔드포인트** | API 엔드포인트 목록 | `GET /api/products` |
| **헌법** | 준수할 헌법 | `constitutions/fastapi/api-design.md` |

---

## 6. 태스크 독립성 규칙

**각 태스크는 다른 태스크에 영향을 주지 않고 독립적으로 실행 가능해야 합니다.**

### 독립성 보장 원칙

| 원칙 | 설명 |
|------|------|
| **격리된 테스트** | 각 태스크의 테스트는 다른 태스크 완료 여부와 무관하게 실행 가능 |
| **Mock/Stub 활용** | 의존하는 기능은 Mock으로 대체하여 독립 개발 |
| **계약 기반 개발** | API 계약(interface)만 있으면 구현 없이도 테스트 작성 가능 |
| **Git Worktree 분리** | 각 Phase는 별도 worktree에서 작업하여 충돌 방지 |

### 의존성 있는 태스크 처리

```markdown
### [ ] P2-S1-T1: 상품 목록 UI
- **담당**: frontend-specialist
- **의존**: P2-R1-T1 (Mock: `mockProductsAPI`)
- **파일**: `tests/ProductList.test.tsx` → `src/pages/products/index.tsx`
- **스펙**: 상품 그리드 UI
- **Worktree**: `worktree/phase-2-products`
- **TDD**: RED → GREEN → REFACTOR
- **병렬**: P2-R1-T1과 병렬 가능 (Mock 사용)
```

---

## 7. 병렬 실행 규칙 (v2.0 변경!)

### Resource 태스크 병렬 실행

```
Resource 태스크간 병렬:
P2-R1-T1 (Products) ←─┐
                       ├── 병렬 가능!
P2-R2-T1 (Categories) ←┘
```

### Screen 태스크는 Resource 완료 후

```
P2-R1-T1 (Products API) ────┐
                            ├──→ P2-S1-T1 (상품 목록 UI)
P2-R2-T1 (Categories API) ──┘
```

### 병렬 실행 가능 그룹

| Phase | 그룹 | 태스크 | 조건 |
|-------|------|--------|------|
| P2 | Resources | P2-R1-T1, P2-R2-T1 | 서로 의존 없음 |
| P2 | Screens | P2-S1-T1, P2-S2-T1 | 다른 화면이면 병렬 가능 |
| P2 | Same Screen | P2-S1-T1, P2-S1-T2 | UI 완료 후 Test |

---

## 8. 생성 전 필수 체크리스트

**TASKS 문서 생성 직전에 반드시 확인하세요!**

```
+---------------------------------------------------------------------+
|  TASKS 문서 생성 전 필수 체크 (12항목)                                 |
+---------------------------------------------------------------------+
|                                                                     |
|  📝 기본 규칙                                                        |
|                                                                     |
|  [ ] 1. 모든 태스크 ID에 Phase 접두사가 포함되었는가?                 |
|         - P0-T0.1 / P2-R1-T1 / P2-S1-T1 / P2-S1-V 형식              |
|                                                                     |
|  [ ] 2. Resource 태스크와 Screen 태스크가 분리되었는가?               |
|         - P{N}-R{M}-T{X}: Backend Resource                          |
|         - P{N}-S{M}-T{X}: Frontend Screen                           |
|                                                                     |
|  [ ] 3. 모든 Phase 1+ 태스크에 필수 요소가 있는가?                    |
|         - 담당, 파일(테스트→구현), 스펙                              |
|         - Worktree, TDD, 병렬                                        |
|                                                                     |
|  🔧 Resource 태스크 규칙                                             |
|                                                                     |
|  [ ] 4. Resource 태스크에 헌법 참조가 있는가?                         |
|         - 헌법: constitutions/{framework}/api-design.md 준수        |
|                                                                     |
|  [ ] 5. Resource 태스크에 엔드포인트 목록이 있는가?                   |
|         - GET /api/{resources}, POST /api/{resources} 등            |
|                                                                     |
|  [ ] 6. Resource 태스크에 필드 목록이 있는가?                         |
|         - 필드: id, name, price, ...                                |
|                                                                     |
|  🎨 Screen 태스크 규칙                                               |
|                                                                     |
|  [ ] 7. Screen 태스크에 데이터 요구 참조가 있는가?                    |
|         - 데이터 요구: products, categories (data_requirements)      |
|                                                                     |
|  [ ] 8. 프론트엔드 태스크에 데모 필드가 있는가? (DDD)                 |
|         - 데모 경로, 데모 상태 목록                                  |
|                                                                     |
|  [ ] 9. 통합 테스트에 시나리오가 포함되었는가?                        |
|         - Given/When/Then 형식                                       |
|                                                                     |
|  ✅ 검증 규칙                                                        |
|                                                                     |
|  [ ] 10. 연결점 검증 태스크(V)가 각 화면에 있는가?                    |
|          - P{N}-S{M}-V: 연결점 검증                                  |
|                                                                     |
|  [ ] 11. Field Coverage 검증이 포함되었는가?                          |
|          - 화면 needs vs 리소스 fields 검증                          |
|                                                                     |
|  [ ] 12. 의존성 그래프(Mermaid)가 있는가?                             |
|          - Resource → Screen 의존성 표시                             |
|                                                                     |
+---------------------------------------------------------------------+

⚠️ Resource/Screen 분리가 없으면 백엔드가 화면에 종속됩니다!
⚠️ 헌법 참조가 없으면 API 설계 규칙을 위반할 수 있습니다!
```

---

## 9. 담당자 매핑

| 태스크 유형 | 담당 에이전트 |
|------------|--------------|
| 프로젝트 구조, 빌드 설정 | frontend-specialist |
| DB 스키마, 마이그레이션 | database-specialist |
| API 엔드포인트, 비즈니스 로직 | backend-specialist |
| UI 컴포넌트, 상태관리 | frontend-specialist |
| 테스트 작성, 품질 검증 | test-specialist |

---

## 10. 오케스트레이터 → 서브에이전트 호출 형식

오케스트레이터가 서브에이전트를 호출할 때 다음 정보를 전달합니다:

### Resource 태스크 호출

```markdown
## 태스크 정보
- Phase: 2
- 태스크 ID: P2-R1-T1
- 담당: backend-specialist
- 유형: Resource

## Git Worktree
- 브랜치: phase/2-resources
- 경로: ../project-phase2-resources

## 리소스 정보
- 리소스: products
- 엔드포인트: GET /api/products, GET /api/products/:id, POST /api/products
- 필드: id, name, price, description, thumbnail, category_id

## 헌법 준수
- `constitutions/fastapi/api-design.md`
- Raw 데이터 반환, 화면명 URL 금지

## TDD 요구사항
- 테스트 파일: tests/api/test_products.py
- 구현 파일: app/routes/products.py
- 테스트 명령어: pytest tests/api/test_products.py

## 완료 조건
- [ ] 테스트 통과
- [ ] 헌법 위반 없음
- [ ] API 문서 자동 생성
```

### Screen 태스크 호출

```markdown
## 태스크 정보
- Phase: 2
- 태스크 ID: P2-S1-T1
- 담당: frontend-specialist
- 유형: Screen

## Git Worktree
- 브랜치: phase/2-products
- 경로: ../project-phase2-products

## 화면 정보
- 화면: /products
- 컴포넌트: CategorySidebar, ProductGrid, ProductCard
- 데이터 요구: products, categories

## TDD 요구사항
- 테스트 파일: tests/pages/ProductList.test.tsx
- 구현 파일: src/pages/products/index.tsx
- 테스트 명령어: npm test ProductList

## 데모
- 경로: /demo/phase-2/s1-product-list
- 상태: loading, error, empty, normal

## 완료 조건
- [ ] 테스트 통과
- [ ] 데모 페이지 동작
- [ ] 데이터 요구사항 API 연결
```
