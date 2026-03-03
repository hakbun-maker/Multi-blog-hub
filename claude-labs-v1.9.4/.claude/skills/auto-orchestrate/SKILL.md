---
name: auto-orchestrate
description: TASKS.md를 분석하여 의존성 기반 자동 직렬/병렬 실행. Phase 병합까지 완전 자동화.
trigger: /orchestrate에서 "완전 자동화" 선택 시 내부 호출
---

# Auto-Orchestrate

> **역할**: TASKS.md의 모든 태스크를 의존성 분석 기반으로 자동 실행. Phase 병합, 테스트, 빌드까지 완전 자동화.

---

## 활성화 트리거

- `/orchestrate`에서 "완전 자동화" 선택 시
- `/auto-orchestrate` 직접 실행 시
- `--resume` 옵션으로 재개 시

---

## 핵심 워크플로우

### 1단계: TASKS.md 파싱 + 의존성 분석
- kongkong2로 2번 읽기 (ID + 완료 조건)
- 의존성 그래프 구축 (Phase 0 = 의존성 없음)

### 2단계: Git Worktree 설정
- TASKS.md에서 Phase별 Worktree 경로 확인
- 없으면 `git worktree add` 명령으로 생성
- **⚠️ 모든 Phase 작업은 반드시 Worktree에서 수행**

### 3단계: Task 실행 (TDD 필수!)
- 전문가 에이전트를 Task 도구로 호출
- **Phase 1+ 태스크: TDD 3단계 강제 (RED→GREEN→REFACTOR)**
- 프롬프트에 `TDD_MODE:RED_FIRST` 포함하여 전문가 호출
- 병렬 가능한 태스크 그룹화 (같은 Phase, 다른 파일, **최대 3-4개**)
- 프론트엔드 → 스크린샷 검증 필수

### 4단계: 에러 복구 (컨텍스트 인식)
- 1-2회: 단순 재시도 (같은 에이전트 내)
- 3회: 새 에이전트로 이어서 진행 (컨텍스트 리셋)
- 4회: 프롬프트 단순화 후 재호출
- 5회: FAIL → CLAUDE.md 기록 후 건너뛰기
- **⚠️ 전문가 호출 시 반드시 `max_turns: 20` 설정 (컨텍스트 폭발 방지)**

### 5단계: Phase 완료 → 품질 체인 실행
- 품질 게이트 검증 (테스트, 커버리지, 린트, 빌드)
- **품질 체인 실행 순서**: verification → evaluation → (선택) code-review
- 슬랙 알림 전송 (웹훅 URL 설정된 경우)
- **일반 모드**: AskUserQuestion으로 병합/`/compact` 선택
- **Ultra-Thin 모드**: 자동 품질 검증 → 자동 병합 → 즉시 다음 Phase

---

## 제약 조건

### ✅ MUST DO
- TASKS.md의 "담당" 필드 확인 → 전문가 에이전트 호출
- Git Worktree 생성 후 해당 디렉토리에서 작업
- 에러 발생 시 CLAUDE.md에 기록
- Phase 완료 시 품질 게이트 검증
- Phase 완료 후 슬랙 알림 (웹훅 URL 있으면)

### ⛔ MUST NOT DO
- 메인 에이전트가 소스 코드 직접 작성 (**절대 금지**)
- main 브랜치에서 직접 코드 작성 (Worktree 필수)
- Phase 완료 후 사용자 확인 없이 바로 다음 Phase 진행 (일반 모드)
- Ultra-Thin 모드가 아닌데 자동 병합

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

## 참조 라우팅

| Topic | Reference | Load When |
|-------|-----------|-----------|
| Phase 실행 상세 | references/phase-execution.md | Task 실행/병렬화 판단 시 |
| 품질 체인 | references/quality-chain.md | Phase 완료 후 품질 검증 시 |
| 병합 워크플로우 | references/merge-workflow.md | Phase 완료 후 병합 시 |
| 에러 처리 | references/error-handling.md | Task 실패/재시도 시 |

---

## 빠른 시작

### 초기 실행

```bash
# 1. 슬랙 웹훅 URL 확인
cat .claude/orchestrate-state.json

# 2. TASKS.md 확인 (06-tasks.md 우선 검색)
cat docs/planning/06-tasks.md

# 3. 자동 실행
/auto-orchestrate

# 4. 결과 확인
cat .claude/orchestrate-state.json
```

### 재개

```bash
# 중단된 작업 재개 (완료된 태스크 건너뛰기)
/auto-orchestrate --resume
```

### Ultra-Thin 모드 (50-200개 태스크)

```bash
# 메인 컨텍스트 76% 절감, 오토 컴팩팅 불필요
/auto-orchestrate --ultra-thin
```

---

## 상태 파일

```
.claude/
├── orchestrate-state.json  ← 진행 상황, 슬랙 URL, 완료/실패 태스크
├── progress.txt            ← RALPH 학습 기록
└── goals/progress.md       ← 목표 진행률
```
