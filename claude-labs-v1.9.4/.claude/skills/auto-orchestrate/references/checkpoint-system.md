# Phase Checkpoint 시스템

> **100개 이상의 태스크**를 안정적으로 실행하기 위한 체크포인트 시스템
> LangGraph/CrewAI 수준의 상태 관리 제공

---

## 핵심 원칙

```
┌─────────────────────────────────────────────────────────────┐
│  1. Phase 완료 → 상태 저장 (orchestrate-state.json)         │
│  2. CLAUDE.md 자동 업데이트 (진행 상황 섹션)                │
│  3. 슬랙 알림 + AskUserQuestion 체크포인트                  │
│  4. 사용자 결정: 컴팩팅 후 계속 / 바로 계속 / 중단         │
│  5. --resume 옵션으로 이어서 실행                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 상태 파일 구조

```json
// .claude/orchestrate-state.json
{
  "project": "my-ecommerce",
  "started_at": "2026-01-18T10:00:00",
  "updated_at": "2026-01-18T12:30:00",
  "slack_webhook_url": "https://hooks.slack.com/...",
  "total_tasks": 100,
  "current_phase": 2,
  "phases": {
    "0": {
      "status": "completed",
      "total_tasks": 15,
      "completed_tasks": 15,
      "completed_at": "2026-01-18T10:30:00",
      "summary": "계약 정의, 테스트 스캐폴딩 완료"
    },
    "1": {
      "status": "completed",
      "total_tasks": 25,
      "completed_tasks": 25,
      "completed_at": "2026-01-18T11:45:00",
      "summary": "상품 API, 상품 목록 UI 완료"
    },
    "2": {
      "status": "in_progress",
      "total_tasks": 20,
      "completed_tasks": 8,
      "next_task": "T2.9"
    }
  },
  "completed_tasks": ["T0.1", "T0.2", "...", "T2.8"],
  "failed_tasks": [
    {
      "id": "T1.5",
      "error": "Stripe API 키 필요",
      "attempts": 10,
      "skipped_at": "2026-01-18T11:20:00"
    }
  ],
  "decisions": [
    "인증: JWT + HttpOnly Cookie",
    "상태관리: Zustand"
  ]
}
```

---

## Phase 완료 시 워크플로우

```
Phase N 완료
    ↓
1️⃣ orchestrate-state.json 업데이트 (Write 도구)
    ↓
2️⃣ CLAUDE.md 진행 상황 섹션 업데이트 (Edit 도구)
    ↓
3️⃣ 슬랙 웹훅 알림 (컴팩팅 권장 포함)
    ↓
4️⃣ AskUserQuestion 도구로 다음 단계 확인
    ┌─────────────────────────────────────────────────┐
    │ ✅ Phase 1 완료! (25개 태스크)                   │
    │                                                  │
    │ [1] /compact 후 계속 (권장)                      │
    │ [2] 바로 Phase 2 시작                            │
    │ [3] 여기서 중단                                  │
    └─────────────────────────────────────────────────┘
    ↓
5️⃣ 사용자 선택에 따른 처리
```

---

## AskUserQuestion 체크포인트 구현

```typescript
AskUserQuestion({
  questions: [{
    header: "Phase 완료",
    question: `Phase ${currentPhase} 완료! 다음 단계를 선택하세요.`,
    options: [
      {
        label: "/compact 후 계속 (권장)",
        description: "컨텍스트 정리 후 안정적으로 다음 Phase 시작"
      },
      {
        label: "바로 다음 Phase 시작",
        description: "⚠️ 50개 이상 태스크 시 누락 가능성"
      },
      {
        label: "여기서 중단",
        description: "나중에 --resume 옵션으로 재개 가능"
      }
    ]
  }]
})
```

---

## 선택별 처리

### 선택 1: /compact 후 계속 (권장)

```
🔄 컴팩팅 준비 완료

상태가 저장되었습니다:
  📁 .claude/orchestrate-state.json
  📄 CLAUDE.md

다음 명령어를 순서대로 입력해주세요:
  1. /compact
  2. /auto-orchestrate --resume
```

### 선택 2: 바로 다음 Phase 시작

```
⚠️ 경고: 현재까지 누적 태스크 40개
   → 50개 초과 시 태스크 누락 가능성

🔄 Phase 2 시작...
```

### 선택 3: 여기서 중단

```
⏸️ Auto-Orchestrate 일시 중단

재개 방법: /auto-orchestrate --resume
현재 진행률: 40% (40/100 태스크)
다음 태스크: Phase 2, T2.9
```

---

## --resume 옵션

```bash
/auto-orchestrate --resume
```

**동작:**
1. `.claude/orchestrate-state.json` 로드
2. 마지막 완료 태스크 확인
3. 다음 태스크부터 자동 실행

---

## 대규모 프로젝트 권장 설정

| 태스크 수 | 권장 설정 |
|----------|----------|
| < 30 | 기본값, 체크포인트 없이 실행 가능 |
| 30-50 | Phase마다 체크포인트 권장 |
| 50-100 | Phase마다 /compact 필수 |
| > 100 | Phase마다 /compact + 수동 검토 |
