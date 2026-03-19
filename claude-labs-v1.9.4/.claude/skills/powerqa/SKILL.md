---
name: powerqa
description: 자동 QA 사이클링 워크플로우 - 테스트, 검증, 수정을 목표 달성까지 자동 반복. 최대 5사이클, 동일 실패 3회 시 조기 종료.
---

# PowerQA - 자동 QA 사이클링

[POWERQA ACTIVATED - AUTONOMOUS QA CYCLING]

## 개요

**PowerQA**는 QA 목표가 달성될 때까지 자동으로 검증-진단-수정을 반복하는 자율 워크플로우입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    PowerQA Cycle                            │
│                                                             │
│   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐             │
│   │ RUN  │ → │CHECK │ → │DIAGNOSE│ → │ FIX  │ ─┐          │
│   │ QA   │    │RESULT│    │(실패시)│    │      │  │          │
│   └──────┘    └──────┘    └──────┘    └──────┘  │          │
│       ↑                                          │          │
│       └──────────────────────────────────────────┘          │
│                                                             │
│   종료 조건: 목표 달성 / 5사이클 / 동일실패 3회            │
└─────────────────────────────────────────────────────────────┘
```

---

## 실행 방법

### 기본 사용법

```bash
/powerqa --tests              # 모든 테스트 통과까지
/powerqa --build              # 빌드 성공까지
/powerqa --lint               # 린트 에러 0까지
/powerqa --typecheck          # 타입 에러 0까지
/powerqa --all                # tests + build + lint + typecheck 전부
/powerqa --custom "pattern"   # 커스텀 패턴 매칭까지
```

### 복합 목표

```bash
/powerqa --tests --lint       # 테스트 + 린트 동시 목표
/powerqa --build --typecheck  # 빌드 + 타입체크 동시 목표
```

---

## 목표 타입별 검증 명령

| 목표 | 검증 명령 | 성공 조건 |
|------|----------|----------|
| `--tests` | `npm test` / `pytest` / `go test ./...` | 0 failures |
| `--build` | `npm run build` / `cargo build` | exit 0 |
| `--lint` | `npm run lint` / `ruff check .` | 0 errors |
| `--typecheck` | `tsc --noEmit` / `mypy .` | 0 errors |
| `--custom` | 사용자 지정 명령 | 패턴 매칭 |

### 언어별 자동 감지

프로젝트 루트의 파일을 기반으로 언어/프레임워크 자동 감지:

| 감지 파일 | 언어 | 테스트 명령 | 빌드 명령 |
|----------|------|-----------|----------|
| `package.json` | JS/TS | `npm test` | `npm run build` |
| `pyproject.toml` / `setup.py` | Python | `pytest` | `python -m build` |
| `Cargo.toml` | Rust | `cargo test` | `cargo build` |
| `go.mod` | Go | `go test ./...` | `go build ./...` |
| `pom.xml` | Java | `mvn test` | `mvn package` |

---

## 사이클 워크플로우

### Cycle N (Max 5)

```
[POWERQA Cycle 1/5] 시작...

STEP 1: RUN QA
├── 목표 타입에 따른 검증 명령 실행
├── 출력 캡처
└── exit code 확인

STEP 2: CHECK RESULT
├── 성공? → EXIT with success
└── 실패? → STEP 3로

STEP 3: DIAGNOSE (진단)
├── 에러 메시지 분석
├── 실패 원인 파악
├── 영향받는 파일 식별
└── 수정 방안 도출

STEP 4: FIX (수정)
├── 진단 기반 코드 수정
├── 최소 변경 원칙
└── 한 번에 하나씩 수정

STEP 5: REPEAT
└── Cycle N+1로 돌아가기
```

---

## 에이전트 위임

### 진단 (Diagnosis)

실패 시 진단을 위해 적절한 에이전트 호출:

```
Task(subagent_type="backend-specialist", prompt="
DIAGNOSE FAILURE:
Goal: [tests/build/lint/typecheck]
Command: [실행한 명령]
Output: [에러 출력]

분석 요청:
1. 근본 원인 파악
2. 영향받는 파일 목록
3. 구체적 수정 방안
")
```

### 수정 (Fix)

진단 결과를 바탕으로 수정:

```
Task(subagent_type="backend-specialist", prompt="
FIX ISSUE:
Diagnosis: [진단 결과]
Files: [영향받는 파일]
Fix: [수정 방안]

주의:
- 최소 변경 원칙
- 한 번에 하나씩 수정
- 새로운 문제 도입 금지
")
```

### 에이전트 선택 기준

| 상황 | 에이전트 |
|------|---------|
| 백엔드 테스트 실패 | `backend-specialist` |
| 프론트엔드 테스트 실패 | `frontend-specialist` |
| 타입 에러 | `backend-specialist` / `frontend-specialist` |
| 린트 에러 | 해당 도메인 specialist |
| 빌드 에러 | 해당 도메인 specialist |
| 복잡한 진단 필요 | `test-specialist` (Opus) |

---

## 종료 조건

| 조건 | 동작 | 메시지 |
|------|------|--------|
| **목표 달성** | 성공 종료 | `POWERQA COMPLETE: N사이클 후 목표 달성` |
| **5사이클 도달** | 진단과 함께 종료 | `POWERQA STOPPED: 최대 사이클. 진단: ...` |
| **동일 실패 3회** | 조기 종료 | `POWERQA STOPPED: 동일 실패 3회. 근본 원인: ...` |
| **환경 에러** | 에러 종료 | `POWERQA ERROR: [환경 문제]` |

### 동일 실패 감지

```python
# 실패 시그니처 비교
def is_same_failure(current, previous):
    # 에러 메시지 핵심 부분 추출
    current_sig = extract_signature(current)
    previous_sig = extract_signature(previous)
    return similarity(current_sig, previous_sig) > 0.8
```

---

## 상태 추적

### 상태 파일

`.claude/powerqa-state.json`:

```json
{
  "active": true,
  "goal_type": ["tests", "lint"],
  "goal_pattern": null,
  "cycle": 2,
  "max_cycles": 5,
  "failures": [
    {
      "cycle": 1,
      "type": "tests",
      "message": "3 tests failing: auth.test.ts",
      "signature": "auth.test.ts:TypeError:undefined"
    }
  ],
  "same_failure_count": 1,
  "started_at": "2025-01-27T12:00:00Z",
  "session_id": "uuid"
}
```

### 상태 정리

**중요: 완료 시 상태 파일 삭제**

```bash
# 목표 달성 또는 종료 시
rm -f .claude/powerqa-state.json
```

---

## 출력 형식

### 진행 상황

```
[POWERQA Cycle 1/5] 테스트 실행 중...
[POWERQA Cycle 1/5] FAILED - 3개 테스트 실패
  └── auth.test.ts: TypeError: Cannot read property 'id' of undefined
  └── user.test.ts: Expected 200, got 401
  └── api.test.ts: Timeout after 5000ms

[POWERQA Cycle 1/5] 진단 중...
  └── 근본 원인: auth 모듈에서 user 객체 null 체크 누락
  └── 영향 파일: src/auth/service.ts:45

[POWERQA Cycle 1/5] 수정 중...
  └── src/auth/service.ts:45 - null 체크 추가

[POWERQA Cycle 2/5] 테스트 실행 중...
[POWERQA Cycle 2/5] PASSED - 47/47 테스트 통과

✅ POWERQA COMPLETE: 2사이클 후 목표 달성
```

### 실패 종료

```
[POWERQA Cycle 5/5] 테스트 실행 중...
[POWERQA Cycle 5/5] FAILED - 1개 테스트 실패

❌ POWERQA STOPPED: 최대 사이클 도달

📊 최종 진단:
├── 반복 실패: database.test.ts - Connection refused
├── 근본 원인: 테스트 환경에서 DB 연결 불가
├── 권장 조치:
│   1. 테스트용 DB 설정 확인
│   2. 환경 변수 DATABASE_URL 확인
│   3. Docker compose로 테스트 DB 실행
└── 수동 개입 필요
```

---

## 취소

사용자가 중간에 취소 가능:

```bash
# 취소 명령
Ctrl+C 또는 "취소해줘"

# 상태 정리
rm -f .claude/powerqa-state.json
```

---

## 다른 스킬과 연동

### /auto-orchestrate 연동

Phase 완료 후 자동 품질 검증:

```
Phase N 구현 완료
  ↓
/powerqa --tests --lint --typecheck
  ↓
통과 시 → Phase 병합
실패 시 → 자동 수정 후 재시도
```

### /code-review 연동

PowerQA 통과 후 코드 리뷰:

```
/powerqa --all
  ↓
통과 시 → /code-review 자동 실행
```

### /verification-before-completion 연동

PowerQA는 verification-before-completion 원칙을 자동화:

- 모든 주장 전 실제 명령 실행
- 출력 기반 판단
- 증거 없는 성공 주장 금지

---

## 설정

### 사이클 제한 커스텀

```bash
/powerqa --tests --max-cycles 10  # 최대 10사이클
/powerqa --build --max-cycles 3   # 최대 3사이클
```

### 타임아웃

```bash
/powerqa --tests --timeout 300    # 5분 타임아웃
```

---

## 베스트 프랙티스

### DO

- 구체적인 목표 지정 (`--tests` vs `--all`)
- 작은 단위로 자주 실행
- 실패 로그 주의 깊게 읽기
- 환경 문제는 수동 해결

### DON'T

- 무한 루프 기대 (최대 5사이클)
- 환경 문제를 코드로 해결 시도
- 동일 실패 무시

---

## 문제 해결

### "동일 실패 3회" 메시지

근본 원인이 코드가 아닌 환경 문제일 가능성:
- DB 연결 확인
- 환경 변수 확인
- 의존성 설치 확인
- 포트 충돌 확인

### "최대 사이클 도달"

복잡한 문제로 자동 수정 한계:
- 수동 진단 필요
- /systematic-debugging 스킬 사용
- 문제를 작은 단위로 분리

---

## 참조 파일

- [검증 명령어 레퍼런스](./references/verification-commands.md)
- [에러 패턴 매핑](./references/error-patterns.md)
