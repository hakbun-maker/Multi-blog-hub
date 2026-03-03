# 품질 체인 (Quality Chain)

> **로드 시점**: Phase 완료 후 품질 검증 시

---

## Phase 완료 시 품질 검증 순서

```
Phase N 모든 태스크 완료
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  1️⃣ verification-before-completion (필수)                        │
│     └── pytest / npm test / lint / build / tsc --noEmit         │
│     └── 하나라도 실패 → 수정 후 재검증                          │
├─────────────────────────────────────────────────────────────────┤
│  2️⃣ evaluation (필수)                                            │
│     └── 테스트 커버리지 ≥70%, 복잡도 ≤10, 린트 에러 0           │
│     └── 기준 미달 → 해당 태스크 수정 요청                       │
├─────────────────────────────────────────────────────────────────┤
│  3️⃣ code-review (권장, 일반 모드만)                              │
│     └── Spec Compliance + Code Quality 2단계 리뷰               │
│     └── Ultra-Thin 모드에서는 생략 (토큰 절약)                  │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 모두 통과 → 병합 진행 (merge-workflow.md)                    │
│  ❌ 실패 → 수정 후 1번부터 재실행                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 품질 스킬 역할 구분

| 스킬 | 역할 | 호출 시점 | 자동/수동 |
|------|------|----------|----------|
| **verification-before-completion** | 기본 검증 (테스트/린트/빌드) | Phase 완료 시 | 자동 |
| **evaluation** | 메트릭 측정 (커버리지/복잡도) | Phase 완료 시 | 자동 |
| **code-review** | 2단계 리뷰 (Spec + Quality) | Phase 완료 시 (일반 모드) | 자동 |
| **powerqa** | 실패 시 자동 수정 + 재검증 루프 | 검증 실패 시 | 자동 |
| **trinity** | 五柱 철학 기반 종합 평가 | PR 생성 전 / 사용자 요청 | 수동 |
| **sync** | 명세-코드 동기화 검증 | PR 생성 전 / 사용자 요청 | 수동 |
| **vercel-review** | React/Next.js 성능 최적화 | 프론트엔드 Phase 완료 시 | 자동 |

---

## 오케스트레이터 실행 코드

### 일반 모드 (auto-orchestrate)

```
Phase N 완료 감지
    ↓
# Step 1: 기본 검증
Bash: cd worktree/phase-N-feature
Bash: pytest --cov=app --cov-fail-under=70 (백엔드)
Bash: npm test && npm run lint && npm run build (프론트엔드)
    ↓
# Step 2: evaluation 메트릭
Skill("evaluation")
    → 커버리지, 복잡도, 린트 리포트 생성
    → 기준 미달 시 → powerqa로 자동 수정 루프
    ↓
# Step 3: code-review (일반 모드만)
Skill("code-review")
    → Spec Compliance + Code Quality
    ↓
# Step 4: 프론트엔드 Phase면 vercel-review
Skill("vercel-review")
    → 성능, 접근성, 디자인 패턴
    ↓
AskUserQuestion → 병합 / compact / 수정
```

### Ultra-Thin 모드

```
PHASE_DONE:N 수신
    ↓
# 자동 검증 (최소한)
Bash: pytest / npm test (Worktree에서)
Bash: npm run build
    ↓
# 통과 시 즉시 병합 (사용자 확인 없음)
Git merge → Worktree 정리 → 다음 Phase
    ↓
# 실패 시
powerqa 자동 수정 (최대 3사이클) → 재검증
```

---

## 품질 기준 통일

### Phase 병합 승인 기준 (필수)

```
✅ 테스트 전체 통과 (pytest / npm test)
✅ 빌드 성공 (npm run build / alembic upgrade head)
✅ 린트 에러 0개 (ruff / eslint)
✅ 테스트 커버리지 ≥70%
```

### 추가 메트릭 (권장)

```
📊 Trinity Score ≥70점 (PR 생성 전)
📊 명세-코드 동기화율 ≥80% (PR 생성 전)
📊 Vercel Review 통과 (프론트엔드 Phase)
```

---

## powerqa 자동 수정 루프

검증 실패 시 자동 호출:

```
검증 실패 감지
    ↓
powerqa 사이클 시작 (최대 5회)
├── 사이클 1: 에러 분석 → 수정 → 재검증
├── 사이클 2: 에러 분석 → 수정 → 재검증
├── ...
├── 동일 에러 3회 연속 → 조기 종료
└── 5회 초과 → FAIL 보고
    ↓
성공 → 품질 체인 계속
실패 → 사용자에게 보고
```
