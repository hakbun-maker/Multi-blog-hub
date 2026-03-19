# Ultra-Thin Orchestrate 통신 프로토콜

> **메인 오케스트레이터 ↔ 서브에이전트 간 최소 토큰 통신 규약**
> 메인 에이전트 컨텍스트 절약을 위한 핵심

---

## 프로토콜 개요

```
┌─────────────────────────────────────────────────────────────────┐
│  Ultra-Thin 프로토콜의 핵심: 1단계 직접 호출 + 최소 문자열 교환  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  의존성 해석: "RESOLVE_NEXT" → "READY:T1.3:backend,T1.4:frontend"│
│  전문가 호출: Task(specialist, run_in_background=true)           │
│  결과 확인:  Read(output_file) → "DONE:T1.3"                    │
│                                                                 │
│  ⚠️ Claude Code 제약: 서브에이전트 중첩 호출 불가!               │
│  메인이 전문가를 직접 호출해야 함 (1단계만 허용)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 에이전트 간 통신 구조

```
┌──────────────────┐
│ Main Orchestrator│
│  (Ultra-Thin)    │
└────────┬─────────┘
         │
    ┌────┼────────────────────────────┐
    │    │                            │
┌───▼───┐│  직접 호출 (run_in_background=true)
│Resolve││
│ Agent ││  ┌────┬────┬────┬────┬────┐
└───────┘│  │    │    │    │    │    │
         │┌─▼─┐┌─▼─┐┌─▼─┐┌─▼─┐┌─▼─┐┌─▼─┐
         ││BE ││FE ││DB ││QA ││SEC││3D │
         │└───┘└───┘└───┘└───┘└───┘└───┘
         │  (전문가 에이전트 6종 - 메인이 직접 호출)
         │
         └── ⚠️ 1단계만! 서브→서브 호출 불가
```

---

## 1. Main → Dependency-Resolver

### 요청 형식

```
RESOLVE_NEXT
```

또는

```
RESOLVE_NEXT:PHASE:2
```

또는

```
RESOLVE_NEXT:FORCE
```

### 응답 형식

| 상황 | 응답 |
|------|------|
| 실행 가능 Task 있음 | `READY:T1.3:backend,T1.4:frontend` |
| 슬롯 없음 (모두 실행 중) | `WAIT` |
| 현재 Phase 완료 | `PHASE_DONE:1` |
| 모든 Task 완료 | `ALL_DONE` |
| 에러 | `ERROR:reason` |

> ⚠️ READY 응답은 반드시 `:담당` 정보를 포함! (메인이 전문가를 직접 호출하므로)

### 예시

```
Main → Resolver: RESOLVE_NEXT
Resolver → Main: READY:T1.3:backend,T1.4:frontend
```

```
Main → Resolver: RESOLVE_NEXT
Resolver → Main: WAIT
```

---

## 2. Main → Specialist Agents (직접 호출)

> ⚠️ 구 아키텍처의 task-executor 중간 레이어는 폐기됨.
> Claude Code는 서브에이전트가 다른 서브에이전트를 호출할 수 없으므로,
> 메인이 전문가를 직접 `run_in_background=true`로 호출합니다.

### 호출 형식

```
Task(
  subagent_type=SPECIALIST_MAP[specialist],  # "backend-specialist" 등
  description=f"{task_id} 실행",
  max_turns=20,
  run_in_background=true,  # ← 필수! 컨텍스트 절약 핵심
  prompt=f"""
TASK_ID:{task_id}
WORKTREE:{worktree}

## ⚠️ TDD 필수 (Phase 1+)
TDD_MODE:RED_FIRST
1. 테스트를 먼저 작성하세요 (🔴 RED)
2. 테스트 실패 확인 후 최소 구현 (🟢 GREEN)
3. 리팩토링 (🔵 REFACTOR)

## 완료 시 출력
DONE:{task_id}

## 실패 시 출력
FAIL:{task_id}:사유 (100자 이내)
"""
)
```

### SPECIALIST_MAP

```
SPECIALIST_MAP = {
  "backend":   "backend-specialist",
  "frontend":  "frontend-specialist",
  "database":  "database-specialist",
  "test":      "test-specialist",
  "security":  "security-specialist",
  "3d-engine": "3d-engine-specialist"
}
```

### 결과 확인 (output_file 읽기)

```
output = Read(task.output_file)
# → "DONE:T1.3" 또는 "FAIL:T1.3:reason"
```

### 예시

```
Main → backend-specialist (background): TASK_ID:T1.3, WORKTREE:worktree/phase-1-auth
Read(output_file) → DONE:T1.3
```

```
Main → frontend-specialist (background): TASK_ID:T1.4, WORKTREE:worktree/phase-1-auth
Read(output_file) → FAIL:T1.4:Component render error
```

---

## 메시지 형식 상세

### RESOLVE_NEXT 요청

```ebnf
resolve_request ::= "RESOLVE_NEXT" [":PHASE:" phase_number] [":FORCE"]
phase_number    ::= digit+
```

### READY 응답

```ebnf
ready_response   ::= "READY:" task_entry_list
task_entry_list  ::= task_entry ("," task_entry)*
task_entry       ::= task_id ":" specialist
task_id          ::= "T" digit+ "." digit+ ["." digit+]
specialist       ::= "backend" | "frontend" | "database" | "test" | "security" | "3d-engine"
```

### DONE/FAIL 응답

```ebnf
task_response  ::= done_response | fail_response
done_response  ::= "DONE:" task_id
fail_response  ::= "FAIL:" task_id ":" reason
reason         ::= string (최대 100자)
```

---

## 병렬 실행 프로토콜

### 병렬 요청 (전문가 직접 호출)

Main에서 여러 전문가를 동시에 백그라운드 호출:

```
[동시에 발송 - run_in_background=true]
Task(subagent_type="backend-specialist", prompt="TASK_ID:T1.3\n...") →
Task(subagent_type="frontend-specialist", prompt="TASK_ID:T1.4\n...") →
Task(subagent_type="test-specialist", prompt="TASK_ID:T1.5\n...") →
```

### 병렬 응답 수집 (output_file 읽기)

```
Read(t1_3.output_file) → DONE:T1.3
Read(t1_4.output_file) → DONE:T1.4
Read(t1_5.output_file) → FAIL:T1.5:Connection timeout
```

### 병렬 제한 (MAX_PARALLEL=3, 하드 리밋=4)

```
MAX_PARALLEL = state.config.max_parallel or 3  # 기본 3, --parallel N으로 변경 (최대 4)
available_slots = min(MAX_PARALLEL, 4) - len(in_progress_tasks)
# dependency-resolver가 available_slots만큼만 READY 반환
# 메인 오케스트레이터도 동일 계산으로 이중 제한
```

---

## 에러 프로토콜

### 에러 코드

| 코드 | 설명 |
|------|------|
| `ERROR:TASKS_NOT_FOUND` | TASKS.md 파일 없음 |
| `ERROR:CIRCULAR_DEP` | 순환 의존성 감지 |
| `ERROR:MISSING_DEP` | 누락된 의존성 |
| `ERROR:PARSE_FAIL` | TASKS.md 파싱 실패 |
| `ERROR:STATE_CORRUPT` | 상태 파일 손상 |

### 에러 응답 형식

```
ERROR:CIRCULAR_DEP:T1.3->T1.4->T1.3
```

### 에러 처리 흐름

```
Resolver → Main: ERROR:CIRCULAR_DEP:T1.3->T1.4->T1.3
    ↓
Main: 사용자에게 에러 보고, TASKS.md 수정 요청
```

---

## 상태 파일 동기화

### 상태 업데이트 규칙

1. **dependency-resolver**: ready, pending 필드 업데이트
2. **main (오케스트레이터)**: in_progress, completed, failed, execution, checkpoints 필드 업데이트

> ⚠️ in_progress: 메인이 전문가를 호출할 때 추가, 결과 수신 시 completed/failed로 이동

### 동시성 제어

```
잠금 파일: .claude/orchestrate-state.json.lock

1. 잠금 획득 시도 (최대 5초 대기)
2. 상태 파일 읽기
3. 수정
4. 상태 파일 쓰기
5. 잠금 해제
```

---

## 체크포인트 프로토콜

### Phase 완료 시

```
Resolver → Main: PHASE_DONE:1
    ↓
Main:
  1. Worktree에서 테스트 실행
  2. main 병합
  3. Slack 알림 (설정된 경우)
  4. 상태 파일 업데이트
  5. 다음 Phase Worktree 설정
    ↓
Main → Resolver: RESOLVE_NEXT
```

### 전체 완료 시

```
Resolver → Main: ALL_DONE
    ↓
Main:
  1. 최종 보고 출력
  2. 메트릭 계산
  3. Slack 알림
  4. 종료
```

---

## 토큰 사용량 계산

### 요청 토큰

| 메시지 | 토큰 (추정) |
|--------|-------------|
| `RESOLVE_NEXT` | ~5 |
| `READY:T1.3:backend,T1.4:frontend` | ~20 |
| `DONE:T1.3` | ~5 |
| `FAIL:T1.3:reason` | ~20 |

### 일반 모드 vs Ultra-Thin

| 항목 | 일반 모드 | Ultra-Thin | 절감 |
|------|----------|------------|------|
| 의존성 해석 | 메인에서 직접 | dependency-resolver | 99% |
| Task 결과 확인 | 메인 컨텍스트에 쌓임 | output_file 읽기 | 99% |
| 총 (200 Task) | ~600K | ~38K | 94% |

---

## 프로토콜 확장

### 커스텀 메시지

```
CUSTOM:type:payload
```

예시:
```
CUSTOM:PRIORITY:T1.3  # 우선순위 상향 요청
CUSTOM:SKIP:T1.5      # Task 건너뛰기 요청
CUSTOM:RETRY:T1.3     # 수동 재시도 요청
```

---

## 디버깅 모드

### 상세 로깅 활성화

```
/auto-orchestrate --ultra-thin --verbose
```

상세 모드에서는 추가 정보 포함:

```
DONE:T1.3:elapsed=120s:tests=15
FAIL:T1.3:elapsed=300s:retries=5:Redis connection refused
```

### 로그 파일

```
.claude/orchestrate.log

[2026-01-21T10:00:00] RESOLVE_NEXT
[2026-01-21T10:00:01] READY:T1.3:backend,T1.4:frontend
[2026-01-21T10:00:02] EXECUTE:T1.3→backend-specialist (background)
[2026-01-21T10:00:02] EXECUTE:T1.4→frontend-specialist (background)
[2026-01-21T10:02:30] DONE:T1.3
[2026-01-21T10:03:15] DONE:T1.4
```

---

## 호환성 매트릭스

| 에이전트 | 버전 | 프로토콜 |
|----------|------|----------|
| main (ultra-thin) | 2.0 | Full |
| dependency-resolver | 2.0 | RESOLVE/READY (담당 정보 포함) |
| backend-specialist | 2.0 | 메인이 직접 호출 (run_in_background) |
| frontend-specialist | 2.0 | 메인이 직접 호출 (run_in_background) |
| 기타 전문가 4종 | 2.0 | 메인이 직접 호출 (run_in_background) |

**Note**: 메인 오케스트레이터가 전문가 에이전트를 직접 호출 (서브에이전트 중첩 불가)
