# API Contracts (계약)

> BE/FE 간 API 계약을 정의하는 디렉토리입니다.
> Contract-First Development의 핵심 파일들이 위치합니다.

---

## 목적

```
┌─────────────────────────────────────────────────────────────┐
│                    Contract-First Development                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  contracts/*.ts (이 폴더)                                   │
│       │                                                     │
│       ├─────────────────────────────────────────────────    │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────┐                    ┌─────────────┐        │
│  │  Backend    │                    │  Frontend   │        │
│  │  (Python)   │                    │  (TypeScript)│       │
│  │             │                    │             │        │
│  │  schemas/   │◄── 타입 동기화 ──►│  types/     │        │
│  │  tests/api/ │                    │  __tests__/ │        │
│  │             │                    │  mocks/     │        │
│  └─────────────┘                    └─────────────┘        │
│       │                                   │                 │
│       └───────────────┬───────────────────┘                 │
│                       │                                     │
│                       ▼                                     │
│                  통합 검증                                   │
│                  (E2E 테스트)                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 파일 구조

```
contracts/
├── types.ts                    # 공통 타입 정의
├── auth.contract.ts            # 인증 API 계약
├── {feature}.contract.ts       # 기능별 API 계약
└── README.md                   # 이 파일
```

---

## 사용법

### 1. 계약 정의

새 기능 추가 시:

1. `feature.contract.template.ts`를 복사
2. `{feature}.contract.ts`로 이름 변경
3. 템플릿 변수 치환 및 엔드포인트 정의

### 2. Pydantic 스키마 동기화

계약 정의 후 `backend/app/schemas/` 에 대응하는 Pydantic 스키마 생성:

```python
# backend/app/schemas/{feature}.py
from pydantic import BaseModel

class FeatureCreate(BaseModel):
    title: str
    content: str

class FeatureResponse(BaseModel):
    id: int
    title: str
    content: str
    user_id: int
    created_at: datetime
```

### 3. 테스트 작성 (🔴 RED)

계약 기반으로 테스트 작성:

```python
# backend/tests/api/test_{feature}.py
@pytest.mark.asyncio
async def test_create_feature(async_client):
    response = await async_client.post("/features", json={
        "title": "Test",
        "content": "Content"
    })
    assert response.status_code == 201
```

### 4. Mock 생성

프론트엔드 독립 개발을 위한 MSW Mock:

```typescript
// frontend/src/mocks/handlers/{feature}.ts
import { http, HttpResponse } from 'msw';

export const featureHandlers = [
  http.get('/api/features', () => {
    return HttpResponse.json({
      data: mockFeatures,
      meta: { page: 1, total: 10, ... }
    });
  }),
];
```

---

## 타입 동기화 체크리스트

| TypeScript | Pydantic | 동기화 |
|------------|----------|--------|
| `string` | `str` | ✓ |
| `number` | `int` / `float` | ✓ |
| `boolean` | `bool` | ✓ |
| `string` (ISO 8601) | `datetime` | ✓ |
| `string` (email) | `EmailStr` | ✓ |
| `T \| null` | `Optional[T]` | ✓ |
| `T[]` | `List[T]` | ✓ |

---

## 주의사항

1. **계약 변경 시 양쪽 모두 업데이트**
   - TypeScript 계약
   - Pydantic 스키마
   - 테스트 케이스
   - Mock 핸들러

2. **네이밍 컨벤션**
   - TypeScript: camelCase (`createdAt`)
   - Python: snake_case (`created_at`)
   - API 변환 레이어에서 처리

3. **에러 코드 일관성**
   - 계약에 정의된 에러 코드를 BE/FE 모두 사용
   - 새 에러 추가 시 계약 먼저 업데이트
