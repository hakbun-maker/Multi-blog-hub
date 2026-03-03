---
name: ultra-thin-orchestrate
description: 200개 태스크도 오토 컴팩팅 없이 처리하는 초슬림 오케스트레이션 모드
trigger: /auto-orchestrate --ultra-thin
---

# Ultra-Thin Orchestrate

> **200개 태스크도 오토 컴팩팅 없이 처리!**
> 메인 에이전트 컨텍스트를 76% 절감하는 초슬림 모드

---

## 핵심 아이디어

```
┌─────────────────────────────────────────────────────────────────┐
│  일반 모드: 메인이 모든 걸 직접 처리 → 컨텍스트 폭발            │
│  Ultra-Thin: 메인은 교통정리만 → 서브가 모든 걸 처리            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  일반 모드 (50 Task): ~160K 토큰 → 컴팩팅 필수                  │
│  Ultra-Thin (200 Task): ~38K 토큰 → 컴팩팅 불필요               │
│                                                                 │
│  핵심: dependency-resolver가 TASKS.md를 파싱하고,               │
│        메인이 전문가를 직접 백그라운드 호출                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 모드 선택 가이드

| Task 수 | 권장 모드 | 명령어 |
|---------|----------|--------|
| 1-30개 | 일반 모드 | `/auto-orchestrate` |
| 30-50개 | 일반 + 컴팩팅 | `/auto-orchestrate` + Phase별 `/compact` |
| **50-200개** | **Ultra-Thin** | `/auto-orchestrate --ultra-thin` |
| 200개+ | Ultra-Thin + 분할 | `--ultra-thin --phase N` |

---

## 초슬림 오케스트레이터 프롬프트

당신은 **초슬림 오케스트레이터**입니다.

### 절대 규칙

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 최우선 규칙: 절대 멈추지 않음! ALL_DONE까지 무조건 진행!    │
├─────────────────────────────────────────────────────────────────┤
│  ❌ TASKS.md 직접 파싱 금지 (dependency-resolver가 함)          │
│  ❌ 소스 코드 직접 작성 금지 (전문가 에이전트가 함)             │
│  ❌ 에러 디버깅 금지 (전문가가 max_turns 내에서 자체 해결)      │
│  ❌ Phase 완료 시 AskUserQuestion 금지 (바로 다음 Phase!)       │
│  ❌ 사용자 확인 요청 금지 (무인 자동화 모드)                    │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 상태 파일만 읽고 쓰기                                       │
│  ✅ dependency-resolver 결과로 전문가를 직접 호출               │
│  ✅ run_in_background=true로 백그라운드 실행                    │
│  ✅ output_file 읽어서 결과 확인                                │
│  ✅ Phase 완료 시 즉시 병합 → 즉시 다음 Phase 시작              │
│  ✅ ALL_DONE 수신 시에만 종료                                   │
└─────────────────────────────────────────────────────────────────┘
```

### ⛔ Ultra-Thin 모드에서 절대 금지

```
┌─────────────────────────────────────────────────────────────────┐
│  🚫 Phase 완료 시 멈춤 금지!                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  일반 auto-orchestrate:                                         │
│    Phase 완료 → AskUserQuestion → 사용자 선택 대기              │
│                                                                 │
│  Ultra-Thin 모드 (--ultra-thin):                                │
│    Phase 완료 → 즉시 병합 → 즉시 다음 Phase → 무한 루프         │
│    ALL_DONE 수신할 때까지 절대 멈추지 않음!                     │
│                                                                 │
│  ⚠️ 이 규칙은 auto-orchestrate의 Phase 완료 규칙보다 우선!      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 워크플로우

```
┌─────────────────────────────────────────────────────────────────┐
│  ULTRA-THIN ORCHESTRATION LOOP                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ INIT: 상태 파일 초기화                                      │
│     └── .claude/orchestrate-state.json 생성/로드               │
│                                                                 │
│  2️⃣ RESOLVE: 다음 Task 계산                                     │
│     └── dependency-resolver → "READY:T1.3:backend,T1.4:frontend"│
│                                                                 │
│  3️⃣ EXECUTE: 전문가 직접 호출 (병렬, 백그라운드)                │
│     └── backend-specialist, frontend-specialist 등 직접 호출    │
│                                                                 │
│  4️⃣ CHECK: 백그라운드 결과 수거 + Phase 완료 확인               │
│     └── PHASE_DONE 시 → 병합 + 다음 Phase                      │
│                                                                 │
│  5️⃣ LOOP: 2-4 반복 until ALL_DONE                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 상세 루프 코드 (절대 멈추지 않음!)

```python
# 🚨 CRITICAL: 이 루프는 ALL_DONE까지 절대 멈추지 않습니다!
# AskUserQuestion, 사용자 확인 요청 등 일체 금지!

# ⚠️ 아키텍처 핵심: 서브에이전트 중첩 금지!
# Claude Code는 "서브에이전트가 다른 서브에이전트를 호출" 불가
# → 메인이 전문가를 직접 1단계로 호출해야 함

SPECIALIST_MAP = {
  "backend": "backend-specialist",
  "frontend": "frontend-specialist",
  "database": "database-specialist",
  "test": "test-specialist",
  "security": "security-specialist",
  "3d-engine": "3d-engine-specialist"
}

MAX_PARALLEL = min(state.config.max_parallel or 3, 4)  # 기본 3, 하드 리밋 4

# ── 변수 초기화 ──
background_tasks = []   # {task_id, output_file} 목록
failed_tasks = []       # 실패한 Task 목록

# ── 메인 루프 ──
while True:

  # ── Step 1: 슬롯 포화 시 결과 수거부터 ──
  if len(background_tasks) >= MAX_PARALLEL:
    # 슬롯 꽉 참 → 기존 백그라운드 결과부터 수거 (Step 4로)
    pass  # 아래 Step 4에서 처리
  else:
    # ── Step 2: 다음 실행 가능 Task 조회 ──
    result = Task(
      subagent_type="dependency-resolver",
      prompt="RESOLVE_NEXT"
    )

    # ── Step 3: 결과 분기 ──
    if result == "ALL_DONE":
      break  # while 루프 탈출 → 최종 보고

    elif result.startsWith("PHASE_DONE"):
      phase_num = result.split(":")[1]
      # Phase 병합 (자동, 사용자 확인 없이!)
      Bash("cd {worktree} && npm test && npm run build")
      Bash("git merge phase-{N} --no-ff")
      # 상태 파일 업데이트
      state.checkpoints[f"phase_{phase_num}"].completed_at = now()
      state.execution.current_phase += 1
      worktree = f"worktree/phase-{state.execution.current_phase}-feature"
      state.execution.worktree = worktree
      continue  # ⚠️ 사용자 확인 없이 즉시 다음 루프!

    elif result == "WAIT":
      pass  # 아래 Step 4에서 기존 결과 수거

    elif result.startsWith("READY"):
      # 파싱: "READY:T1.3:backend,T1.4:frontend"
      raw = result[len("READY:"):]
      pairs = raw.split(",")
      task_entries = []
      for pair in pairs:
        id, specialist = pair.split(":")
        task_entries.append({id: id, specialist: specialist})

      # 🚨 3중 안전장치: 메인에서도 슬롯 계산으로 제한!
      available = MAX_PARALLEL - len(background_tasks)
      task_entries = task_entries[:max(available, 0)]
      worktree = state.execution.worktree

      # ── 전문가 직접 백그라운드 호출 ──
      for entry in task_entries:
        specialist_type = SPECIALIST_MAP[entry.specialist]
        bg_task = Task(
          subagent_type=specialist_type,
          description=f"{entry.id} 실행",
          max_turns=20,
          run_in_background=true,  # 🚨 필수!
          prompt=f"""
TASK_ID:{entry.id}
WORKTREE:{worktree}

TASKS.md에서 {entry.id}의 요구사항을 직접 읽고 수행하세요.
모든 파일 작업은 {worktree}에서 수행하세요.

## TDD 필수 (Phase 1+)
1. 테스트 먼저 작성 → 2. 최소 구현 → 3. 리팩토링

## 완료 시: DONE:{entry.id}
## 실패 시: FAIL:{entry.id}:사유
"""
        )
        # bg_task 객체를 목록에 저장 (output_file 접근용)
        background_tasks.append({
          task_id: entry.id,
          output_file: bg_task.output_file
        })
        # 상태 파일: in_progress에 추가
        state.tasks.in_progress.append(entry.id)

  # ── Step 4: 백그라운드 결과 수거 (output_file 읽기) ──
  completed_indices = []
  for i, bg in enumerate(background_tasks):
    output = Read(bg.output_file)        # "DONE:T1.3" 또는 "FAIL:T1.3:reason"
    if output is None or output == "":
      continue  # 아직 실행 중 → 건너뜀
    if "DONE" in output:
      state.tasks.in_progress.remove(bg.task_id)
      state.tasks.completed.append(bg.task_id)
      completed_indices.append(i)
    elif "FAIL" in output:
      state.tasks.in_progress.remove(bg.task_id)
      state.tasks.failed.append(bg.task_id)
      failed_tasks.append(output)
      completed_indices.append(i)

  # 완료/실패한 항목을 background_tasks에서 제거
  for i in sorted(completed_indices, reverse=True):
    background_tasks.pop(i)

  # 상태 파일 저장
  Write(state, ".claude/orchestrate-state.json")

# ── while 루프 탈출 = ALL_DONE ──
# 최종 보고 출력
print(f"성공: {len(state.tasks.completed)}, 실패: {len(failed_tasks)}")
```

### 🚨 컨텍스트 절약의 핵심: run_in_background + 직접 호출

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ 서브에이전트 중첩 금지! (Claude Code 아키텍처 제약)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ 불가능한 방식 (서브에이전트 중첩):                            │
│     메인 → task-executor(서브) → specialist(서브의 서브)        │
│     → Claude Code에서 서브가 서브를 호출 불가!                  │
│     → task-executor가 혼자 모든 작업 수행 → 컨텍스트 폭발      │
│                                                                 │
│  ✅ 올바른 방식 (1단계 직접 호출):                                │
│     Task(                                                       │
│       subagent_type="backend-specialist",  ← 전문가 직접!       │
│       max_turns=20,                        ← 폭발 방지!         │
│       run_in_background=true,              ← 컨텍스트 절약!     │
│       prompt="TASK_ID:T1.3\nWORKTREE:..."                      │
│     )                                                           │
│     → 전문가가 1단계 서브로 직접 실행                           │
│     → Read(output_file)로 결과만 확인                           │
│     → 메인 컨텍스트에 쌓이지 않음!                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 🚨 멈춤 방지 체크리스트

```
┌─────────────────────────────────────────────────────────────────┐
│  Ultra-Thin 루프에서 절대 하지 말아야 할 것:                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ AskUserQuestion 호출                                        │
│  ❌ "다음 단계를 선택해주세요" 출력                             │
│  ❌ "/compact 후 계속할까요?" 질문                              │
│  ❌ "Phase 완료! 계속할까요?" 확인                              │
│  ❌ 사용자 입력 대기                                            │
│  ❌ 중간에 멈추고 보고                                          │
│                                                                 │
│  ✅ 슬랙 알림만 전송 (비동기, 대기 없음)                        │
│  ✅ 상태 파일만 업데이트                                        │
│  ✅ 바로 다음 Task/Phase로 진행                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 서브에이전트 구조

### ⚠️ 아키텍처 핵심: 1단계 호출만 허용!

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code 제약: 서브에이전트가 서브에이전트를 호출할 수 없음  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ 이전 (불가능):                                               │
│     메인 → task-executor → specialist (2단계 중첩 = 불가!)      │
│                                                                 │
│  ✅ 현재 (1단계만):                                              │
│     메인 → dependency-resolver (Task 계산)                      │
│     메인 → specialist (직접 호출, 백그라운드)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### dependency-resolver (haiku)

```
역할: TASKS.md 파싱 + 의존성 분석 + 실행 가능 Task:담당 계산
입력: RESOLVE_NEXT
출력: READY:T1.3:backend,T1.4:frontend | PHASE_DONE:1 | ALL_DONE | WAIT
```

### 전문가 에이전트 6종 (메인이 직접 호출)

```
backend-specialist   ← TASKS.md "담당: backend"
frontend-specialist  ← TASKS.md "담당: frontend"
database-specialist  ← TASKS.md "담당: database"
test-specialist      ← TASKS.md "담당: test"
security-specialist  ← TASKS.md "담당: security"
3d-engine-specialist ← TASKS.md "담당: 3d-engine"

호출: run_in_background=true, max_turns=20
입력: TASK_ID + WORKTREE + TDD 지시
출력: DONE:{id} | FAIL:{id}:reason
```

---

## 상태 파일

### 경로
```
.claude/orchestrate-state.json
```

### 스키마

```json
{
  "version": "2.0",
  "mode": "ultra-thin",
  "project": "my-project",

  "execution": {
    "current_phase": 1,
    "worktree": "worktree/phase-1-feature",
    "started_at": "2026-01-21T09:00:00Z"
  },

  "tasks": {
    "pending": ["T1.5", "T1.6"],
    "ready": ["T1.3", "T1.4"],
    "in_progress": [],
    "completed": ["T0.5.1", "T1.1", "T1.2"],
    "failed": []
  },

  "checkpoints": {
    "phase_0": {
      "completed_at": "2026-01-21T09:30:00Z",
      "tasks": 3,
      "merged": true
    }
  },

  "slack_webhook_url": "https://hooks.slack.com/..."
}
```

---

## 토큰 사용량 비교

### 일반 모드 (50 Task)

| 항목 | 토큰 |
|------|------|
| TASKS.md 파싱 | 5,000 |
| Task당 프롬프트 | 50 × 2,000 = 100,000 |
| Task당 결과 | 50 × 1,000 = 50,000 |
| 기타 | 5,000 |
| **총계** | **~160,000** |

### Ultra-Thin (200 Task)

| 항목 | 토큰 |
|------|------|
| 상태 파일 읽기 | 200 × 100 = 20,000 |
| Task 호출 | 200 × 50 = 10,000 |
| Task 결과 | 200 × 30 = 6,000 |
| 기타 | 2,000 |
| **총계** | **~38,000** |

**절감율: 76% (200개에서도 40K 이하!)**

---

## CLI 옵션

| 옵션 | 설명 |
|------|------|
| `--ultra-thin` | Ultra-Thin 모드 활성화 |
| `--phase N` | 특정 Phase만 실행 |
| `--resume` | 중단된 작업 재개 |
| `--dry-run` | 실행 계획만 출력 (실제 실행 안 함) |
| `--parallel N` | 최대 병렬 Task 수 (기본: 3, 최대: 4) |

### 사용 예시

```bash
# 기본 Ultra-Thin 실행
/auto-orchestrate --ultra-thin

# 특정 Phase만
/auto-orchestrate --ultra-thin --phase 2

# 중단 후 재개
/auto-orchestrate --ultra-thin --resume

# 최대 3개 병렬 (기본값)
/auto-orchestrate --ultra-thin --parallel 3

# 최대 4개 병렬 (하드 리밋)
/auto-orchestrate --ultra-thin --parallel 4
```

---

## Phase 완료 처리

### Phase 병합 워크플로우

```
PHASE_DONE:1 수신 시:
├── 1. 테스트 실행 (Worktree에서)
├── 2. 빌드 확인
├── 3. main으로 병합
├── 4. Worktree 정리
├── 5. 슬랙 알림
└── 6. 상태 파일 업데이트
```

### 병합 명령어

```bash
cd worktree/phase-1-feature
npm test && npm run build
cd ../..
git merge phase-1-feature --no-ff -m "Phase 1 완료"
git worktree remove worktree/phase-1-feature
```

---

## 에러 처리

### 서브에이전트 실패 시

```
FAIL:T1.3:TypeError - Cannot read property...
    ↓
1. failed_tasks에 추가
2. 계속 진행 (다른 Task 영향 없음)
3. 최종 보고에서 실패 목록 표시
```

### 의존성 Task 실패 시

```
T1.3 실패 → T1.5 (T1.3에 의존) 영향
    ↓
dependency-resolver가 자동 처리:
├── T1.5를 pending에서 blocked로 이동
└── T1.4 등 다른 Task는 계속 진행
```

---

## 완료 보고 형식

```
═══════════════════════════════════════════════════════
  🎉 Ultra-Thin Orchestrate 완료!
═══════════════════════════════════════════════════════

📊 결과 요약:
   총 태스크: 150개
   성공: 148개 (99%)
   실패: 2개

❌ 실패 태스크:
   - T2.5: Redis 연결 실패
   - T3.2: Stripe API 키 필요

📈 컨텍스트 절약:
   일반 모드 예상: ~160K 토큰
   실제 사용: ~38K 토큰
   절감: 76%

═══════════════════════════════════════════════════════
```

---

## 참조 문서

| 문서 | 내용 |
|------|------|
| `references/state-schema.md` | 상태 파일 상세 스키마 |
| `references/protocol.md` | 서브에이전트 통신 프로토콜 |
| `../auto-orchestrate/SKILL.md` | 기본 오케스트레이션 (호환) |

---

## 제한사항

1. **dependency-resolver 필수**: TASKS.md에 "담당" 필드가 있어야 함
2. **상태 파일 의존**: orchestrate-state.json 손상 시 복구 어려움
3. **디버깅 어려움**: 백그라운드 실행이라 상세 로그는 output_file에서만 확인
4. **Worktree 필수**: Phase별 Git Worktree 사용
5. **서브에이전트 1단계만**: Claude Code 제약으로 중첩 호출 불가

---

## 호환성

```
┌─────────────────────────────────────────────────────────────────┐
│  기존 시스템과 100% 호환!                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 기존 전문가 에이전트 6개 → 메인이 직접 호출 (변경 없음)     │
│  ✅ 기존 TASKS.md 형식 → 그대로 사용 ("담당" 필드 필수)         │
│  ✅ 기존 기획 문서 → 그대로 사용                                │
│  ✅ 기존 /auto-orchestrate → 여전히 동작                        │
│                                                                 │
│  🆕 --ultra-thin 옵션 → 새 모드 활성화                          │
│  🆕 dependency-resolver → 담당 포함 출력 (READY:T:specialist)   │
│  ⛔ task-executor → 폐기됨 (서브에이전트 중첩 불가)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 활성화 조건

다음 조건에서 Ultra-Thin 모드 권장:
- Task 수 50개 이상
- 컨텍스트 오버플로우 경험
- 장시간 무인 실행 필요

다음 조건에서는 일반 모드 권장:
- Task 수 30개 미만
- 상세 로그 필요
- 디버깅/학습 목적
