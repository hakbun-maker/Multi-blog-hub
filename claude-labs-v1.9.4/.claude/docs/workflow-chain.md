# 스킬 워크플로우 체인

> 모든 스킬은 완료 시 이 문서를 참조하여 다음 단계를 안내합니다.

---

## 메인 워크플로우

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Claude Code Skills 워크플로우                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [아이디어]                                                                   │
│      ↓                                                                       │
│  /neurion (선택) ── AI+사용자 공동 브레인스토밍 → neurion-proposal.md          │
│      ↓                                                                       │
│  /eureka (선택) ─── 추상적 아이디어 → 구체적 MVP 제안                          │
│      ↓                                                                       │
│  /socrates ──────── 21개 질문으로 기획 문서 7개 생성                          │
│      ↓                                                                       │
│  /screen-spec ───── 화면별 상세 명세(YAML) 생성                               │
│      ↓                                                                       │
│  /tasks-generator ─ TASKS.md 생성 (Domain-Guarded)                           │
│      ↓                                                                       │
│  /project-bootstrap 프로젝트 환경 셋업 (백엔드/프론트엔드/Docker)              │
│      ↓                                                                       │
│  /auto-orchestrate ─ TASKS.md 기반 자동 개발                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 스킬별 다음 단계

| 현재 스킬 | 완료 후 | 다음 스킬 | 조건 |
|----------|--------|----------|------|
| `/neurion` | neurion-proposal.md 생성 | `/socrates` | 권장 |
| `/eureka` | MVP 제안 선택 | `/screen-spec` | 자동 진행 |
| `/socrates` | 기획 문서 7개 생성 | `/screen-spec` | 권장 |
| `/screen-spec` | 화면 명세 YAML 생성 | `/tasks-generator` | 자동 진행 |
| `/tasks-generator` | TASKS.md 생성 | `/project-bootstrap` | 새 프로젝트 |
| `/tasks-generator` | TASKS.md 생성 | `/auto-orchestrate` | 기존 프로젝트 |
| `/project-bootstrap` | 환경 셋업 완료 | `/auto-orchestrate` | 권장 |

---

## 진입점별 워크플로우

### 1. 백지 상태 (아이디어 없음)

```
/neurion → /socrates → /screen-spec → /tasks-generator → /project-bootstrap → /auto-orchestrate
```

### 2. 새 아이디어 (막연한 상태)

```
/eureka → /socrates → /screen-spec → /tasks-generator → /project-bootstrap → /auto-orchestrate
```

### 3. 구체적인 기획 (아이디어 확정)

```
/socrates → /screen-spec → /tasks-generator → /project-bootstrap → /auto-orchestrate
```

### 4. 기획 완료 (기획 문서 있음)

```
/screen-spec → /tasks-generator → /project-bootstrap → /auto-orchestrate
```

### 5. 화면 명세 완료 (YAML 있음)

```
/tasks-generator → /project-bootstrap → /auto-orchestrate
```

### 6. 기존 프로젝트 (환경 셋업 완료)

```
/tasks-generator → /auto-orchestrate
```

---

## AskUserQuestion 표준 템플릿

모든 스킬은 완료 시 다음 형식으로 다음 단계를 제안합니다:

```json
{
  "questions": [{
    "question": "{현재 스킬} 완료!\n\n다음 단계를 선택해주세요:",
    "header": "다음 단계",
    "options": [
      {"label": "{다음 스킬 1}", "description": "{설명} - 권장"},
      {"label": "{다음 스킬 2}", "description": "{설명}"},
      {"label": "수동 진행", "description": "직접 진행"}
    ],
    "multiSelect": false
  }]
}
```

---

## 스킬 간 데이터 흐름

```
/neurion
    └── neurion-proposal.md (브레인스토밍 기획안)
            ↓
/eureka
    └── eureka-proposal.md (선택된 제안)
            ↓
/socrates
    └── docs/planning/
        ├── 01-prd.md
        ├── 02-trd.md
        ├── 03-user-flow.md
        ├── 04-database-design.md
        ├── 05-design-system.md
        ├── 06-screens.md        ← /screen-spec 입력
        └── 07-coding-convention.md
            ↓
/screen-spec
    └── specs/
        ├── domain/resources.yaml
        ├── screens/*.yaml       ← /tasks-generator 입력
        └── shared/
            ↓
/tasks-generator
    └── docs/planning/06-tasks.md (TASKS.md)
            ↓
/project-bootstrap
    └── .claude/
        ├── agents/
        ├── commands/
        ├── memory/
        └── metrics/
    └── backend/
    └── frontend/
    └── docker-compose.yml
            ↓
/auto-orchestrate
    └── TASKS.md 기반 자동 개발
```

---

## 스킬 호출 규칙

### 자동 진행 스킬

| 스킬 | 조건 | 다음 스킬 자동 호출 |
|------|------|-------------------|
| `/eureka` | 사용자 제안 선택 시 | `/screen-spec` |
| `/screen-spec` | 모든 화면 명세 완료 시 | `/tasks-generator` |

### 선택 제안 스킬

| 스킬 | 제안 방식 |
|------|----------|
| `/socrates` | AskUserQuestion으로 `/screen-spec` 또는 `/tasks-generator` 선택 |
| `/tasks-generator` | AskUserQuestion으로 `/project-bootstrap` 또는 `/auto-orchestrate` 선택 |
| `/project-bootstrap` | AskUserQuestion으로 `/auto-orchestrate` 또는 수동 진행 선택 |

---

## 📊 CLI 하단 진행 상황 표시 (필수!)

> **모든 스킬은 Phase 진입 시 TaskCreate를 사용하여 CLI 하단에 진행 상황을 표시합니다.**
> 이를 통해 사용자는 현재 워크플로우의 어느 단계에 있는지 실시간으로 확인할 수 있습니다.

### 진행 상황 표시 원칙

1. **Phase 시작 시**: TaskCreate로 태스크 생성 (상태: pending → in_progress)
2. **Phase 진행 중**: activeForm으로 현재 작업 표시
3. **Phase 완료 시**: TaskUpdate로 completed 상태로 변경
4. **다음 Phase**: 새 TaskCreate 또는 기존 태스크 업데이트

### 스킬별 TaskCreate 템플릿

#### /neurion

```typescript
// Phase 0 시작
TaskCreate({
  subject: "/neurion Phase 0: 워밍업",
  description: "페르소나 소개 및 시작 방식 선택",
  activeForm: "🧠 브레인스토밍 준비 중..."
})

// Phase 2 시작
TaskCreate({
  subject: "/neurion Phase 2: 아이디어 폭발",
  description: "발산적 사고로 15-20개 아이디어 생성",
  activeForm: "💡 아이디어 폭발 중..."
})

// Phase 3 시작
TaskCreate({
  subject: "/neurion Phase 3: 그룹핑 & 방향 선택",
  description: "아이디어 그룹화 및 방향 선택",
  activeForm: "🔗 아이디어 그룹핑 중..."
})

// Phase 4 시작
TaskCreate({
  subject: "/neurion Phase 4: 기획안 생성",
  description: "neurion-proposal.md 1페이지 기획안 생성",
  activeForm: "📝 기획안 생성 중..."
})
```

#### /socrates

```typescript
// Phase 0 시작
TaskCreate({
  subject: "/socrates Phase 0: MCP 설정 체크",
  description: "MCP 사전 설정 상태 확인 및 표시",
  activeForm: "🔧 MCP 설정 상태 확인 중..."
})

// Phase 1 시작
TaskCreate({
  subject: "/socrates Phase 1: 핵심 기능 도출",
  description: "핵심 기능 3가지 도출을 위한 대화",
  activeForm: "💬 핵심 기능 도출 중..."
})

// Phase 2 시작
TaskCreate({
  subject: "/socrates Phase 2: 화면 매핑",
  description: "기능을 화면에 매핑",
  activeForm: "🗺️ 화면 매핑 진행 중..."
})

// Phase 3 시작
TaskCreate({
  subject: "/socrates Phase 3: 문서 생성",
  description: "7개 기획 문서 생성",
  activeForm: "📄 기획 문서 생성 중..."
})
```

#### /screen-spec

```typescript
// Phase 0 시작
TaskCreate({
  subject: "/screen-spec Phase 0: 도메인 리소스 확인",
  description: "resources.yaml 확인",
  activeForm: "📋 도메인 리소스 확인 중..."
})

// Phase 2 시작 (화면별)
TaskCreate({
  subject: "/screen-spec Phase 2: {화면명} 명세",
  description: "{화면명} YAML 명세 작성",
  activeForm: "📱 {화면명} 명세 작성 중..."
})

// Phase 5 시작 (Stitch)
TaskCreate({
  subject: "/screen-spec Phase 5: Stitch 디자인 생성",
  description: "Google Stitch MCP로 디자인 목업 생성",
  activeForm: "🎨 Stitch 디자인 생성 중..."
})
```

#### /tasks-generator

```typescript
TaskCreate({
  subject: "/tasks-generator: TASKS.md 생성",
  description: "화면 명세 기반 태스크 구조화",
  activeForm: "📝 TASKS.md 생성 중..."
})
```

#### /auto-orchestrate

```typescript
// 현재 Phase 표시
TaskCreate({
  subject: "/auto-orchestrate: Phase {N} 실행",
  description: "Phase {N} 태스크 병렬 실행",
  activeForm: "⚡ Phase {N} 실행 중 ({완료}/{전체})..."
})
```

### CLI 하단 표시 예시

```
┌─────────────────────────────────────────────────────────┐
│  [일반 대화 화면]                                        │
│                                                         │
│  User: /socrates                                        │
│  Claude: 기획 컨설팅을 시작합니다...                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ⏳ /socrates Phase 1: 핵심 기능 도출                    │  ← CLI 하단 statusline
│     💬 핵심 기능 도출 중...                              │
└─────────────────────────────────────────────────────────┘
```

### MCP 설정 상태 표시 (socrates 시작 시)

```
┌─────────────────────────────────────────────────────────┐
│  🔧 MCP 설정 상태                                        │
├─────────────────────────────────────────────────────────┤
│  🎨 Stitch MCP:   ✅ 설정됨 (OAuth 완료)                 │
│  🤖 Gemini MCP:   ✅ 설정됨                              │
│  📚 Context7 MCP: ❌ 미설정                              │
├─────────────────────────────────────────────────────────┤
│  💡 /screen-spec Phase 5에서 Stitch 디자인 자동 생성 가능 │
└─────────────────────────────────────────────────────────┘
```

### TaskUpdate 상태 전환

```typescript
// Phase 완료 시
TaskUpdate({
  taskId: "{task-id}",
  status: "completed"
})

// 다음 Phase로 전환
TaskCreate({
  subject: "/screen-spec Phase 5: Stitch 디자인 생성",
  activeForm: "🎨 Stitch 디자인 생성 중..."
})
```
