---
name: a2a
description: 에이전트 간 구조화된 통신 및 협업 프로토콜. Request/Response, Handoff, Broadcast 패턴.
trigger: 오케스트레이터가 전문가 에이전트 호출 시 자동 적용
---

# Inter-Agent Communication (A2A) 스킬

> **Agentic Design Pattern #19**: 에이전트 간 구조화된 통신 및 협업 프로토콜

## 개요

전문가 에이전트들 간의 효율적인 정보 교환과 협업을 위한 통신 프로토콜을 정의합니다.

## 핵심 원칙

```
┌─────────────────────────────────────────────────────────────┐
│  Agent-to-Agent Communication                               │
│                                                             │
│  Orchestrator (중앙 조정)                                    │
│       │                                                     │
│       ├── Request → Backend Specialist                      │
│       │      ↓                                              │
│       │   Response (API 스펙)                               │
│       │      ↓                                              │
│       ├── Handoff → Frontend Specialist                     │
│       │      (with API 스펙 컨텍스트)                        │
│       │      ↓                                              │
│       └── Verify → Test Specialist                          │
│                                                             │
│  통신 방식:                                                  │
│  ├── Request/Response - 단방향 요청                          │
│  ├── Handoff - 컨텍스트 전달                                 │
│  └── Broadcast - 전체 공지                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📨 메시지 프로토콜

### 메시지 구조

```yaml
message:
  id: "msg-2025-01-17-001"
  type: "request" | "response" | "handoff" | "broadcast"
  from: "orchestrator"
  to: "backend-specialist"
  timestamp: "2025-01-17T14:30:00Z"

  context:
    task_id: "T1.1"
    phase: 1
    dependencies: ["T0.5.1"]

  payload:
    instruction: "상품 CRUD API 구현"
    requirements: [...]
    constraints: [...]

  artifacts:
    - type: "schema"
      path: "app/schemas/product.py"
    - type: "test"
      path: "tests/api/test_product.py"
```

### 메시지 타입

| 타입 | 용도 | 예시 |
|------|------|------|
| **request** | 작업 요청 | Orchestrator → Backend: "API 구현해줘" |
| **response** | 결과 반환 | Backend → Orchestrator: "완료, 파일 목록" |
| **handoff** | 컨텍스트 전달 | Backend → Frontend: "API 스펙 전달" |
| **broadcast** | 전체 공지 | Orchestrator → All: "Phase 1 완료" |

---

## 🤝 Handoff 프로토콜

### Backend → Frontend Handoff

```markdown
## 🔄 Handoff: Backend → Frontend

### 소스
- **에이전트**: backend-specialist
- **태스크**: T1.1 - 상품 API 구현
- **상태**: 완료 ✅

### 전달 컨텍스트

**1. API 엔드포인트**
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/products | 상품 목록 |
| POST | /api/products | 상품 생성 |
| GET | /api/products/{id} | 상품 상세 |
| PUT | /api/products/{id} | 상품 수정 |
| DELETE | /api/products/{id} | 상품 삭제 |

**2. 응답 스키마**
```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  createdAt: string;
}

interface ProductList {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}
```

**3. 에러 응답**
```typescript
interface ApiError {
  detail: string;
  code: string;
}
```

### 수신자 액션
- **에이전트**: frontend-specialist
- **태스크**: T1.2 - 상품 목록 UI
- **기대 결과**: API 연동된 상품 목록 컴포넌트
```

### Test → Backend Handoff (버그 리포트)

```markdown
## 🐛 Handoff: Test → Backend (Bug Report)

### 소스
- **에이전트**: test-specialist
- **태스크**: T1.3 - 통합 테스트
- **상태**: 실패 ❌

### 버그 상세

**테스트 케이스**
```python
def test_create_product_with_negative_price():
    response = client.post("/api/products", json={
        "name": "Test",
        "price": -100  # 음수 가격
    })
    assert response.status_code == 422  # 예상
    # 실제: 201 Created (버그!)
```

**문제**
- 음수 가격 검증 누락
- 위치: `app/schemas/product.py`

**기대 수정**
```python
class ProductCreate(BaseModel):
    name: str
    price: float = Field(gt=0)  # 양수 검증 추가
```

### 수신자 액션
- **에이전트**: backend-specialist
- **우선순위**: 높음
- **기대 결과**: 가격 검증 추가, 테스트 통과
```

---

## 📋 협업 패턴

### 패턴 1: 순차 협업 (Sequential)

```
Orchestrator → Backend → Frontend → Test → Orchestrator

사용 케이스: 일반적인 기능 구현
```

```markdown
## 순차 협업 흐름

1. **Orchestrator → Backend**
   - 메시지: "T1.1 상품 API 구현"
   - 컨텍스트: 스펙 문서, 테스트 파일

2. **Backend → Orchestrator**
   - 메시지: "완료"
   - 아티팩트: routes/product.py, schemas/product.py

3. **Orchestrator → Frontend** (Handoff)
   - 메시지: "T1.2 상품 UI 구현"
   - 컨텍스트: Backend API 스펙 포함

4. **Frontend → Orchestrator**
   - 메시지: "완료"
   - 아티팩트: ProductList.tsx, ProductDetail.tsx

5. **Orchestrator → Test**
   - 메시지: "T1.3 통합 테스트"
   - 컨텍스트: Backend + Frontend 아티팩트
```

### 패턴 2: 병렬 협업 (Parallel)

```
                 ┌→ Backend ─┐
Orchestrator ────┤           ├→ Test → Orchestrator
                 └→ Frontend ─┘

사용 케이스: 독립적인 작업 동시 진행
```

```markdown
## 병렬 협업 흐름

1. **Orchestrator → [Backend, Frontend]** (동시)
   - Backend: "T2.1 검색 API"
   - Frontend: "T2.2 검색 UI (Mock 사용)"

2. **[Backend, Frontend] → Orchestrator** (동시 대기)
   - Backend: "완료" + API 스펙
   - Frontend: "완료" + Mock 사용 컴포넌트

3. **Orchestrator → Frontend** (Handoff)
   - 메시지: "실제 API 연동으로 전환"
   - 컨텍스트: Backend API 스펙

4. **Frontend → Orchestrator**
   - 메시지: "API 연동 완료"

5. **Orchestrator → Test**
   - 메시지: "통합 테스트"
```

### 패턴 3: 피드백 루프 (Feedback Loop)

```
Orchestrator → Backend ⟺ Test (반복) → Orchestrator

사용 케이스: TDD 사이클, 버그 수정
```

```markdown
## 피드백 루프 흐름

1. **Orchestrator → Test**
   - 메시지: "T0.5.1 테스트 작성 (RED)"

2. **Test → Orchestrator**
   - 메시지: "테스트 작성 완료, RED 상태"
   - 아티팩트: test_product.py

3. **Orchestrator → Backend**
   - 메시지: "T1.1 구현 (GREEN)"
   - 컨텍스트: 테스트 파일 포함

4. **Backend → Test** (자동 검증)
   - pytest 실행
   - 실패 시 → Backend로 피드백
   - 성공 시 → Orchestrator로 완료 보고

5. 반복...
```

---

## 🔔 Broadcast 이벤트

### Phase 완료 Broadcast

```markdown
## 📢 Broadcast: Phase 1 완료

### 발신
- **에이전트**: orchestrator
- **시간**: 2025-01-17 15:30

### 내용
```
═══════════════════════════════════════════════════
  🎉 Phase 1 완료!
═══════════════════════════════════════════════════

완료된 태스크:
- T1.1 ✅ 상품 API (backend-specialist)
- T1.2 ✅ 상품 UI (frontend-specialist)
- T1.3 ✅ 통합 테스트 (test-specialist)

병합: main ← phase-1-product-crud

다음: Phase 2 시작 (인증 기능)
═══════════════════════════════════════════════════
```

### 수신자
- 모든 에이전트
- Memory (기록)
- Goal Setting (진행률 업데이트)
```

### 긴급 알림 Broadcast

```markdown
## 🚨 Broadcast: 보안 취약점 발견

### 발신
- **에이전트**: security-specialist
- **우선순위**: CRITICAL

### 내용
```
⚠️ CRITICAL: SQL Injection 취약점 발견

위치: app/api/routes/product.py:45
코드: f"SELECT * FROM products WHERE name = '{name}'"

즉시 조치 필요:
1. backend-specialist: 파라미터화 쿼리로 수정
2. test-specialist: 보안 테스트 추가
3. 모든 에이전트: 유사 패턴 확인
```

### 필수 액션
- [ ] backend-specialist: 코드 수정
- [ ] test-specialist: 보안 테스트
- [ ] orchestrator: 진행 중단 고려
```

---

## 📁 통신 기록

### 메시지 로그 파일

```
.claude/communication/
├── messages/
│   ├── 2025-01-17-001.md   # 개별 메시지
│   ├── 2025-01-17-002.md
│   └── ...
├── handoffs/
│   ├── backend-to-frontend-T1.1.md
│   └── ...
└── history.md              # 전체 이력 요약
```

### history.md 예시

```markdown
# 통신 이력

## 2025-01-17

### 14:00 - Phase 1 시작
| 시간 | From | To | Type | Summary |
|------|------|-----|------|---------|
| 14:00 | orchestrator | backend | request | T1.1 상품 API |
| 14:45 | backend | orchestrator | response | T1.1 완료 |
| 14:45 | orchestrator | frontend | handoff | T1.2 + API 스펙 |
| 15:15 | frontend | orchestrator | response | T1.2 완료 |
| 15:15 | orchestrator | test | request | T1.3 통합 테스트 |
| 15:25 | test | backend | handoff | 버그 리포트 |
| 15:28 | backend | test | response | 수정 완료 |
| 15:30 | test | orchestrator | response | T1.3 완료 |
| 15:30 | orchestrator | all | broadcast | Phase 1 완료 |
```

---

## 🔗 다른 스킬과 연동

### Memory 연동

```markdown
통신 패턴 학습:
- 효과적인 Handoff 패턴 기록
- 자주 발생하는 피드백 유형 분석
- 에이전트별 응답 시간 추적
```

### Evaluation 연동

```markdown
통신 효율성 측정:
- Handoff 성공률
- 피드백 루프 횟수
- 메시지당 해결 태스크 수
```

---

## 활성화 조건

다음 상황에서 자동 활성화:
- Orchestrator가 에이전트 간 작업 할당 시
- 에이전트 간 컨텍스트 전달 필요 시
- 버그/이슈 발견으로 다른 에이전트 알림 필요 시
