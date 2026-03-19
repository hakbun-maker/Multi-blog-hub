---
name: goal-setting
description: TASKS.md 기반 목표 관리 및 진행 상황 모니터링. evaluation, auto-orchestrate와 연동.
trigger: auto-orchestrate 시작 시 자동 초기화
---

# Goal Setting & Monitoring 스킬

> **Agentic Design Pattern #5**: 명확한 목표 설정, 진행 상황 추적, 완료 조건 정의

## 개요

TASKS.md 기반 목표 관리 및 진행 상황 모니터링을 제공합니다.

## 핵심 원칙

```
┌─────────────────────────────────────────────────────────────┐
│  Goal-Driven Development                                    │
│                                                             │
│  Goal 정의 → 분해 → 실행 → 모니터링 → 완료 검증             │
│                                                             │
│  핵심 요소:                                                  │
│  ├── SMART 목표: Specific, Measurable, Achievable           │
│  ├── 진행률 추적: Phase/Task 단위 완료율                     │
│  └── 완료 조건: 테스트 통과 + 품질 게이트                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 목표 정의 체계

### TASKS.md 구조와 목표 매핑

```markdown
# TASKS.md

## 프로젝트 목표 (Project Goal)
> 3주 내 상품 관리 시스템 MVP 완성

## 마일스톤 (Milestones)
- M1: Phase 0-1 완료 (1주차) - 기본 CRUD
- M2: Phase 2-3 완료 (2주차) - 인증 + 검색
- M3: Phase 4 완료 (3주차) - 배포 + 모니터링

## Phase 목표
### Phase 0: 계약 정의 (Goal: API 스펙 확정)
### Phase 1: 기본 구현 (Goal: CRUD 동작)
### Phase 2: 인증 추가 (Goal: 로그인/권한 동작)
```

### 목표 분해 규칙

| 레벨 | 단위 | 완료 조건 |
|------|------|----------|
| **Project** | 전체 프로젝트 | 모든 Milestone 완료 |
| **Milestone** | 여러 Phase | 해당 Phase 모두 병합 |
| **Phase** | 관련 Task 그룹 | 모든 Task 완료 + 품질 게이트 |
| **Task** | 단일 작업 | 테스트 통과 (GREEN) |

---

## 📊 진행 상황 모니터링

### 자동 진행률 계산

```
Phase 진행률 = (완료된 Task 수 / 전체 Task 수) × 100%

Project 진행률 = Σ(Phase 가중치 × Phase 진행률)
```

### 진행 상황 파일 (.claude/goals/progress.md)

```markdown
# 진행 상황 대시보드

## 전체 진행률: 65% ████████████░░░░░░░░

## 마일스톤 현황
| 마일스톤 | 상태 | 진행률 | 예상 완료 |
|----------|------|--------|----------|
| M1: 기본 CRUD | ✅ 완료 | 100% | 01/15 ✓ |
| M2: 인증 + 검색 | 🔄 진행중 | 60% | 01/20 예정 |
| M3: 배포 | ⏸️ 대기 | 0% | 01/25 예정 |

## Phase 현황
| Phase | Task | 완료 | 진행률 |
|-------|------|------|--------|
| Phase 0 | 5 | 5 | ██████████ 100% |
| Phase 1 | 4 | 4 | ██████████ 100% |
| Phase 2 | 6 | 3 | █████░░░░░ 50% |
| Phase 3 | 4 | 0 | ░░░░░░░░░░ 0% |

## 현재 작업
🔄 Phase 2, T2.4: 검색 API 구현 (backend-specialist)
   └─ 시작: 14:30 | 예상: 30분

## 블로커
⚠️ T2.5 대기중: T2.4 완료 필요 (의존성)
```

---

## 🎯 완료 조건 정의

### Task 완료 조건

```yaml
task_completion:
  required:
    - tests_pass: true              # pytest/vitest 통과
    - lint_clean: true              # 린트 에러 없음
    - type_check: true              # 타입 에러 없음

  optional:
    - coverage_threshold: 70%       # 커버리지 (권장)
    - documentation: true           # 문서화 (권장)
```

### Phase 완료 조건

```yaml
phase_completion:
  required:
    - all_tasks_done: true          # 모든 Task 완료
    - quality_gate_pass: true       # 품질 게이트 통과
    - no_critical_security: true    # 보안 CRITICAL 없음

  verification:
    - integration_tests: pass       # 통합 테스트
    - e2e_tests: pass               # E2E 테스트 (해당 시)
```

### Milestone 완료 조건

```yaml
milestone_completion:
  required:
    - all_phases_merged: true       # 모든 Phase main 병합
    - demo_ready: true              # 데모 가능 상태

  deliverables:
    - changelog: updated            # CHANGELOG.md 업데이트
    - release_notes: created        # 릴리스 노트 작성
```

---

## 🔄 모니터링 워크플로우

### 자동 진행 상황 업데이트

```
Task 완료 시:
├── TASKS.md 체크박스 업데이트: [ ] → [x]
├── .claude/goals/progress.md 갱신
├── 진행률 재계산
└── 블로커 확인 (의존성 해소된 Task 식별)

Phase 완료 시:
├── Milestone 진행률 업데이트
├── 다음 Phase 자동 시작 가능 여부 확인
└── 평가 리포트 생성 (Evaluation 스킬 연동)
```

### 알림 트리거

| 이벤트 | 알림 내용 |
|--------|----------|
| Task 완료 | "✅ T2.4 완료 (Phase 2: 75%)" |
| Phase 완료 | "🎉 Phase 2 완료! main 병합 완료" |
| Milestone 달성 | "🏆 M2 달성! 다음: M3 (배포)" |
| 블로커 해소 | "🔓 T2.5 시작 가능 (T2.4 완료)" |
| 지연 감지 | "⚠️ Phase 2 예상 완료일 초과" |

---

## 📈 목표 시각화

### ASCII 대시보드

```
═══════════════════════════════════════════════════════
  프로젝트: 상품 관리 시스템 MVP
  전체 진행률: 65%
═══════════════════════════════════════════════════════

Milestones:
M1 [████████████████████] 100% ✅ 완료
M2 [████████████░░░░░░░░]  60% 🔄 진행중
M3 [░░░░░░░░░░░░░░░░░░░░]   0% ⏸️ 대기

Phases (M2):
  P2 [█████░░░░░]  50% ← 현재
  P3 [░░░░░░░░░░]   0%

Tasks (P2):
  T2.1 ✅ 로그인 API
  T2.2 ✅ 회원가입 API
  T2.3 ✅ 프로필 조회
  T2.4 🔄 검색 API ← 진행중
  T2.5 ⏸️ 검색 UI (T2.4 대기)
  T2.6 ⏸️ 통합 테스트

═══════════════════════════════════════════════════════
```

### 타임라인 뷰

```
Week 1        Week 2        Week 3
|-------------|-------------|-------------|
[==M1 완료==] [====M2=====] [====M3=====]
              ^현재
              Phase 2, T2.4

예상 완료: 01/25 (예정대로)
```

---

## 🔗 다른 스킬과 연동

### Orchestrator 연동

```markdown
Orchestrator가 Task 할당 시:
1. 현재 진행 상황 확인 (Goal Setting)
2. 가용한 Task 식별 (의존성 해소된 것)
3. 우선순위에 따라 할당
4. 완료 시 진행 상황 업데이트
```

### Evaluation 연동

```markdown
Phase 완료 시:
1. Goal Setting: 완료 조건 검증 요청
2. Evaluation: 품질 메트릭 측정
3. Goal Setting: 결과 기반 완료 판정
4. 완료 시 → 다음 Phase 목표 활성화
```

### Memory 연동

```markdown
목표 관련 학습 기록:
- 정확한 추정: "T2.4 예상 30분 → 실제 25분"
- 추정 오차: "T2.5 예상 20분 → 실제 45분 (API 변경)"
```

---

## 📁 Goal 파일 구조

```
.claude/goals/
├── objectives.md       # 프로젝트/마일스톤 목표 정의
├── progress.md         # 실시간 진행 상황
├── blockers.md         # 현재 블로커 목록
└── timeline.md         # 타임라인 및 일정
```

---

## 사용 방법

### 목표 초기화

```bash
# TASKS.md 분석하여 목표 파일 생성
/goal init
```

### 진행 상황 확인

```bash
# 현재 진행 상황 대시보드
/goal status

# 특정 Phase 상세
/goal status phase-2
```

### 목표 업데이트

```bash
# Task 완료 표시
/goal complete T2.4

# 블로커 추가
/goal block T2.5 --reason "API 스펙 변경 대기"
```

---

## 활성화 조건

다음 상황에서 자동 활성화:
- `/orchestrate` 실행 시 진행 상황 표시
- Task/Phase 완료 시 자동 업데이트
- `/goal` 명령어 실행 시
