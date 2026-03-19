# Phase 실행 상세

> **로드 시점**: Task 실행/병렬화 판단 시

---

## Phase 병렬/직렬 실행 판단

### 의존성 분석

```
TASKS.md 파싱
    ↓
각 Task의 "Depends On" 필드 추출
    ↓
의존성 그래프 구축
    ↓
Phase 0 (의존성 없음) 식별
    ↓
Phase 1+ (의존성 있음) 순차 계산
```

### 병렬 실행 가능 조건

```
✅ 병렬 가능:
├── 같은 Phase 내 태스크
├── 서로 다른 파일 수정
├── 의존성 없음
└── 다른 에이전트 타입 (backend, frontend, etc.)

❌ 병렬 불가:
├── 의존성 있음 (Depends On 필드)
├── 같은 파일 수정
└── 선행 태스크 실패
```

### Phase별 실행 전략

| Phase | 실행 방식 | 병렬 수 |
|-------|----------|---------|
| Phase 0 | 병렬 (의존성 없음) | 최대 3-4개 |
| Phase 1+ | 순차 (의존성 있음) | 최대 2-3개 |

> **⚠️ 병렬 제한**: 어떤 Phase든 동시 실행 Task는 **기본 3개** (하드 리밋 4개)를 초과하지 않습니다.
> 컨텍스트 폭발과 시스템 리소스 과부하를 방지합니다. `--parallel N` 옵션으로 조정 가능 (최대 4).

---

## 전문가 에이전트 호출 규칙

### ⛔ 강제 금지 규칙 (ABSOLUTE PROHIBITION)

```
┌─────────────────────────────────────────────────────────────────┐
│  🚫 메인 에이전트(오케스트레이터)는 절대 직접 코드 작성 금지!    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ 금지 행동:                                                   │
│  ├── Write/Edit 도구로 소스 코드 직접 작성                      │
│  ├── 테스트 파일 직접 작성                                      │
│  ├── 구현 파일 직접 수정                                        │
│  └── "내가 직접 구현하겠다"는 판단                              │
│                                                                 │
│  ✅ 필수 행동:                                                   │
│  ├── TASKS.md의 "담당" 필드 확인                                │
│  ├── 해당 전문가 에이전트를 Task 도구로 호출                    │
│  ├── 전문가 에이전트의 결과 대기                                │
│  └── 결과에 따라 다음 태스크 진행                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 허용되는 오케스트레이터 직접 작업

| 작업 | 허용 | 이유 |
|------|-----|------|
| TASKS.md 체크박스 업데이트 | ✅ | 진행 상황 관리 |
| CLAUDE.md 업데이트 | ✅ | 학습 내용 기록 |
| Git 명령어 실행 | ✅ | 병합, Worktree 관리 |
| 테스트/빌드 명령어 실행 | ✅ | 품질 게이트 검증 |
| 소스 코드 작성/수정 | ⛔ | 전문가 에이전트 담당 |
| 테스트 코드 작성/수정 | ⛔ | 전문가 에이전트 담당 |

### 전문가 에이전트 매핑

| subagent_type | 역할 | 트리거 (TASKS.md "담당" 필드) |
|---------------|------|---------------------------|
| `backend-specialist` | API, 비즈니스 로직, DB 연동 | backend |
| `frontend-specialist` | React UI, 상태관리, API 통합 | frontend |
| `database-specialist` | 스키마, 마이그레이션 | database |
| `test-specialist` | 테스트 작성, 품질 검증 | test |
| `security-specialist` | 보안 검사, 취약점 분석 | security |
| `3d-engine-specialist` | Three.js, IFC/BIM, 3D 시각화 | 3d-engine |

### ⚠️ TDD 강제 프로토콜 (Phase 1+ 필수!)

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 TDD Iron Law: Phase 1+ 태스크는 반드시 TDD 사이클 준수!     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 0: TDD 생략 가능 (셋업, 계약 정의)                       │
│  Phase 1+: TDD 3단계 필수!                                      │
│                                                                 │
│  🔴 RED: 테스트 먼저 작성 → 실패 확인                           │
│  🟢 GREEN: 테스트 통과하는 최소 구현                            │
│  🔵 REFACTOR: 테스트 유지하며 코드 개선                         │
│                                                                 │
│  ❌ 테스트 없이 구현만 하면 Phase 완료 불가!                    │
│  ❌ 구현 후 테스트 추가는 TDD가 아님!                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

전문가 에이전트 호출 시 반드시 TDD 지시를 프롬프트에 포함:

```
## ⚠️ TDD 필수 (Phase 1+)
TDD_MODE:RED_FIRST
1. 테스트를 먼저 작성하세요 (🔴 RED)
2. 테스트 실패 확인 후 최소 구현 (🟢 GREEN)
3. 리팩토링 (🔵 REFACTOR)
테스트 없이 구현만 하면 FAIL 처리됩니다.
```

### 호출 형식

```
Task({
  subagent_type: "backend-specialist",  ← TASKS.md의 "담당" 값
  description: "P1-T1.1: 거래 API 구현",
  max_turns: 20,  ← 🚨 필수! 컨텍스트 폭발 방지
  prompt: """
## 태스크 정보
- **Phase**: 1
- **태스크 ID**: P1-T1.1
- **Worktree**: worktree/phase-1-api  ← 반드시 명시!

⚠️ 모든 파일 작업은 worktree/phase-1-api 디렉토리에서 수행하세요.

## ⚠️ TDD 필수 (Phase 1+)
TDD_MODE:RED_FIRST
1. 테스트를 먼저 작성하세요 (🔴 RED)
2. 테스트 실패 확인 후 최소 구현 (🟢 GREEN)
3. 리팩토링 (🔵 REFACTOR)

## ⚠️ 컨텍스트 절약 규칙
- 파일은 필요한 부분만 읽기 (offset/limit 활용)
- 전체 파일 읽기 대신 Grep으로 필요한 섹션만 탐색
- 에러 재시도는 최대 3회까지만 (이후 현재까지 결과 반환)

## 요구사항
{TASKS.md에서 추출한 요구사항}

## 완료 조건
{TASKS.md에서 추출한 완료 조건}
"""
})
```

### max_turns 가이드

| 태스크 유형 | max_turns | 예시 |
|------------|-----------|------|
| Phase 0 셋업 | 15 | 프로젝트 초기화, 설정 파일 |
| 단일 기능 구현 | 20 | API 엔드포인트, 컴포넌트 |
| 복합 기능/통합 테스트 | 25 | 여러 파일 수정, E2E 테스트 |

**max_turns 도달 시**: 오케스트레이터가 작업 상태를 확인하고, 미완료 부분만 새 전문가에 이어서 지시합니다.

> ⚠️ Claude Code 제약: 서브에이전트는 다른 서브에이전트를 호출할 수 없음!
> 메인 오케스트레이터가 전문가를 직접 `run_in_background=true`로 호출해야 합니다.

---

## Git Worktree 관리

### ⚠️ Git Worktree 필수 규칙 (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 모든 Phase 작업은 반드시 Git Worktree에서 수행!             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ 금지: main 브랜치에서 직접 코드 작성                        │
│  ✅ 필수: Phase별 Worktree 생성 후 해당 디렉토리에서 작업       │
│                                                                 │
│  이 규칙을 무시하면 Phase 병합 시 충돌 발생!                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Worktree 설정 절차

```bash
# 1. TASKS.md에서 Worktree 경로 확인
# 예: Worktree: worktree/phase-1-object-system

# 2. Worktree 존재 여부 확인
git worktree list

# 3. 없으면 생성
git worktree add worktree/phase-1-object-system -b phase-1-object-system

# 4. Worktree 디렉토리로 이동
cd worktree/phase-1-object-system

# 5. 이 디렉토리에서 모든 태스크 수행!
```

### 전문가 에이전트 호출 시 Worktree 경로 전달

```
Task({
  subagent_type: "frontend-specialist",
  description: "P1-T1.4: 객체 스토어 구현",
  prompt: """
## 태스크 정보
- **Phase**: 1
- **태스크 ID**: P1-T1.4
- **Worktree**: worktree/phase-1-object-system  ← 반드시 명시!

⚠️ 모든 파일 작업은 worktree/phase-1-object-system 디렉토리에서 수행하세요.
메인 프로젝트 루트가 아닌 Worktree 경로를 사용해야 합니다.

...
"""
})
```

---

## 프론트엔드 데모 검증

### 필수 검증 절차

프론트엔드 태스크 완료 시:

```
1️⃣ 데모 페이지 존재 확인
    └── 없으면 → 생성 요청
    ↓
2️⃣ 상태별 스크린샷 검증
    loading, error, empty, normal
    ↓
3️⃣ 콘솔 에러 확인
    ↓
4️⃣ 테스트 가이드 출력 (TASK_DONE 전 필수!)
```

### 테스트 가이드 출력 형식

```
## ✅ P1-T1.2: 거래 목록 컴포넌트 구현 완료!

### 📍 데모 페이지
URL: http://localhost:3000/demo/phase-1/t1-2-transaction-list

### 🧪 테스트 방법
1. 개발 서버 실행: `npm run dev`
2. 위 URL 접속
3. 각 상태 버튼 클릭하여 UI 확인:
   - [Loading] 로딩 스피너 표시
   - [Error] 에러 메시지 표시
   - [Empty] 빈 상태 안내
   - [Normal] 거래 목록 표시

TASK_DONE
```

---

## Ultra-Thin 모드 특수 처리

### Ultra-Thin 핵심 원리

```
┌─────────────────────────────────────────────────────────────────┐
│  일반 모드: 메인이 모든 걸 직접 처리 → 컨텍스트 폭발            │
│  Ultra-Thin: 메인은 교통정리만 → 서브가 모든 걸 처리            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ TASKS.md 직접 파싱 금지 (dependency-resolver가 함)          │
│  ❌ 상세 프롬프트 작성 금지 (Task ID만 전달)                    │
│  ❌ 결과 분석 금지 (output_file로 결과만 확인)                  │
│                                                                 │
│  ✅ Task ID만 전달: "TASK_ID:T1.3"                              │
│  ✅ 한 줄 결과만 수신: "DONE:T1.3"                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 전용 서브에이전트

| 에이전트 | 역할 |
|----------|------|
| `dependency-resolver` | TASKS.md 파싱, 의존성 분석, 실행 가능 Task 계산 |
| 전문가 에이전트 6종 | 메인이 직접 호출 (run_in_background=true, max_turns=20) |

> ⚠️ task-executor는 폐기됨. Claude Code에서 서브에이전트가 서브를 호출할 수 없음.

### 사용 예시

```bash
# 기본 Ultra-Thin 실행
/auto-orchestrate --ultra-thin

# 특정 Phase만
/auto-orchestrate --ultra-thin --phase 2

# 중단 후 재개
/auto-orchestrate --ultra-thin --resume

# 최대 3개 병렬
/auto-orchestrate --ultra-thin --parallel 3
```

> 상세 내용: `../ultra-thin-orchestrate/SKILL.md`

---

## CLI 옵션

| 옵션 | 설명 |
|------|------|
| `/auto-orchestrate` | 전체 자동 실행 |
| `--phase N` | 특정 Phase만 실행 |
| `--resume` | 중단된 작업 재개 |
| `--ralph` | RALPH 루프 모드 (50회 반복) |
| `--verify` | 태스크 누락 검증 |
| `--ultra-thin` | **Ultra-Thin 모드** (200개 태스크까지 지원) |

---

## 상태 파일 구조

```
.claude/
├── orchestrate-state.json  ← 진행 상황, 슬랙 URL
├── progress.txt            ← RALPH 학습 기록
└── goals/progress.md       ← 목표 진행률
```

### orchestrate-state.json 스키마 (v2)

```json
{
  "version": "2.0",
  "mode": "ultra-thin",

  "execution": {
    "current_phase": 1,
    "worktree": "worktree/phase-1-feature",
    "started_at": "2026-01-18T09:00:00Z",
    "last_updated": "2026-01-18T12:00:00Z"
  },

  "tasks": {
    "pending": ["T1.5", "T1.6"],
    "ready": ["T1.3", "T1.4"],
    "in_progress": [],
    "completed": ["T0.1", "T0.2", "T1.1", "T1.2"],
    "failed": []
  },

  "specialists": {
    "T1.3": "backend",
    "T1.4": "frontend"
  },

  "dependencies": {
    "T1.3": ["T1.1", "T1.2"],
    "T1.4": ["T1.1"]
  },

  "checkpoints": {
    "phase_0": {
      "completed_at": "2026-01-18T10:00:00Z",
      "tasks": 2,
      "merged": true
    }
  },

  "config": {
    "max_parallel": 3,
    "retry_limit": 10,
    "slack_webhook_url": "https://hooks.slack.com/..."
  }
}
```
