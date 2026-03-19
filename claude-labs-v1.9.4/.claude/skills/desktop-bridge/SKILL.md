---
name: desktop-bridge
description: Claude Desktop(설계) + Claude Code CLI(구현)를 GitHub Issue로 연결하는 하이브리드 워크플로우 스킬. publish/implement 두 모드 지원.
---

# Desktop Bridge: 하이브리드 워크플로우 스킬

> "Desktop에서 설계하고, GitHub으로 연결하고, CLI에서 구현하라"

---

## 스킬 개요

**목적**: Claude Desktop(시각적 설계) + Claude Code CLI(에이전틱 구현)를 GitHub Issue로 연결

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Desktop-Bridge 하이브리드 워크플로우                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Claude Desktop]          [GitHub]           [Claude Code CLI]         │
│  ┌─────────────────┐      ┌─────────┐       ┌─────────────────┐        │
│  │ /socrates       │      │ Issue   │       │ /auto-orchestrate│        │
│  │ /neurion        │ ─────▶ #123    │──────▶│ 완전 자동화     │        │
│  │ /screen-spec    │      │         │       │ 코드 생성       │        │
│  └─────────────────┘      └─────────┘       └─────────────────┘        │
│        ↓                       ↓                   ↓                    │
│   시각적 대화              버전 관리            파일 시스템 접근         │
│   다이어그램 첨부          협업/히스토리         에이전틱 구현            │
│   풍부한 UI               코드 리뷰 연동        테스트 실행              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ⛔ 절대 금지

1. ❌ GitHub 인증 없이 Issue 생성 시도 금지
2. ❌ 기획 문서 없이 publish 모드 실행 금지
3. ❌ Issue 번호 없이 implement 모드 실행 금지

---

## 스킬 시작 시 필수 행동

```
1. Read 도구로 references 파일 읽기:
   - references/publish-flow.md     ← publish 모드 상세
   - references/implement-flow.md   ← implement 모드 상세

2. GitHub 연동 상태 확인:
   - gh CLI 설치 여부: which gh (Mac/Linux) / where gh (Windows)
   - gh 인증 상태: gh auth status

3. 모드 감지:
   - "publish" → publish 모드 실행
   - "implement #N" → implement 모드 실행 (명시적 번호)
   - "implement" (번호 없음) → 자동 감지 시도:
     a) .claude/desktop-bridge-state.json에서 issue_number 확인
     b) gh issue list --label from-desktop 으로 최근 이슈 조회
     c) 모두 없으면 이슈 번호 입력 요청
   - 인자 없음 → 모드 선택 AskUserQuestion
```

---

## GitHub 연동 사전 설정

> ⚠️ **/desktop-bridge 시작 시 반드시 GitHub 연동 상태를 체크하고 사용자에게 표시합니다.**

### 체크 시퀀스

```bash
# gh CLI 및 인증 확인
gh auth status 2>&1
```

### ✅ gh CLI 설정됨

```
┌─────────────────────────────────────────────────────────┐
│  🔗 GitHub 연동 상태                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ gh CLI: 설정됨                                       │
│  ✅ 인증: {username}                                     │
│                                                         │
│  → /desktop-bridge publish 사용 가능                     │
│  → /desktop-bridge implement #N 사용 가능                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### ❌ gh CLI 미설치 시 안내

```
┌─────────────────────────────────────────────────────────┐
│  🔗 GitHub 연동 설정 필요                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  gh CLI가 설치되어 있지 않습니다.                         │
│                                                         │
│  📋 설치 방법:                                          │
│                                                         │
│  Mac:                                                   │
│    $ brew install gh                                    │
│                                                         │
│  Windows:                                               │
│    $ winget install --id GitHub.cli                     │
│                                                         │
│  Linux (Debian/Ubuntu):                                 │
│    $ sudo apt install gh                                │
│                                                         │
│  설치 후 인증:                                          │
│    $ gh auth login                                      │
│    → 브라우저에서 GitHub 로그인                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  💡 또는 ./install.sh 재실행 → GitHub MCP 선택           │
└─────────────────────────────────────────────────────────┘
```

### ❌ gh CLI 설치됨, 인증 필요 시 안내

```
┌─────────────────────────────────────────────────────────┐
│  🔗 GitHub 인증 필요                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  gh CLI는 설치되어 있지만 인증이 필요합니다.              │
│                                                         │
│  $ gh auth login                                        │
│  → 브라우저에서 GitHub 로그인                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 CLI 하단 진행 상황 표시 (필수!)

> **모든 Phase 진입 시 TaskCreate를 사용하여 CLI 하단에 진행 상황을 표시합니다.**

### publish 모드 TaskCreate

```typescript
TaskCreate({
  subject: "/desktop-bridge publish: 기획 문서 수집",
  description: "specs/, docs/planning/ 기획 문서 수집",
  activeForm: "📄 기획 문서 수집 중..."
})

TaskCreate({
  subject: "/desktop-bridge publish: Issue 생성",
  description: "GitHub Issue 생성 및 라벨 설정",
  activeForm: "🔗 GitHub Issue 생성 중..."
})
```

### implement 모드 TaskCreate

```typescript
TaskCreate({
  subject: "/desktop-bridge implement: Issue 로드",
  description: "GitHub Issue #{N} 내용 로드",
  activeForm: "📥 Issue #{N} 로드 중..."
})

TaskCreate({
  subject: "/desktop-bridge implement: TASKS.md 생성",
  description: "Issue 기반 TASKS.md 자동 생성",
  activeForm: "📋 TASKS.md 생성 중..."
})
```

---

## 두 가지 모드

### 1. `publish` 모드 (Desktop → GitHub)

**목적**: Desktop에서 작성한 기획을 GitHub Issue로 발행

```
/desktop-bridge publish
```

**워크플로우**:
```
Phase 1: 기획 문서 수집
├── specs/screens/*.yaml 읽기
├── docs/planning/*.md 읽기
└── 문서 검증 (필수 파일 존재 확인)
    ↓
Phase 2: Issue 내용 구성
├── 제목 생성: [Design] {프로젝트명} - 아키텍처 및 화면 명세
├── 본문 작성: 요약 + 화면 목록 + 기술 스택
└── 라벨 설정: design, from-desktop, v{버전}
    ↓
Phase 3: GitHub Issue 생성
├── gh issue create 실행
├── Issue 번호 획득
└── 사용자에게 Issue URL 반환
    ↓
Phase 4: 연결 정보 저장
└── .claude/desktop-bridge-state.json 저장
```

**생성되는 Issue 형식**:
```markdown
## 📋 설계 요약

{프로젝트 한 줄 설명}

## 🎯 핵심 기능

1. {기능1}
2. {기능2}
3. {기능3}

## 📱 화면 목록

- [ ] {화면1}: {설명}
- [ ] {화면2}: {설명}
- [ ] {화면3}: {설명}

## 🔧 기술 스택

- **Frontend**: {React/Next.js/...}
- **Backend**: {FastAPI/Express/...}
- **Database**: {PostgreSQL/...}

## 📄 첨부 문서

<details>
<summary>PRD (제품 요구사항)</summary>

{01-prd.md 내용 요약}

</details>

<details>
<summary>TRD (기술 요구사항)</summary>

{02-trd.md 내용 요약}

</details>

---

🤖 Generated by Claude Desktop via `/desktop-bridge publish`
```

---

### 2. `implement` 모드 (GitHub → CLI)

**목적**: GitHub Issue를 기반으로 CLI에서 구현 시작

```
/desktop-bridge implement #123    # 명시적 이슈 번호
/desktop-bridge implement         # 자동 감지 (상태 파일 또는 최근 이슈)
```

**이슈 번호 자동 감지 순서**:
```
1. .claude/desktop-bridge-state.json 확인
   ├── issue_number 존재 → "Issue #{N}을 계속 사용할까요?" 확인
   └── 없음 → 다음 단계
       ↓
2. gh issue list --label from-desktop --limit 5
   ├── 이슈 존재 → 목록에서 선택 AskUserQuestion
   └── 없음 → 다음 단계
       ↓
3. 이슈 번호 직접 입력 요청
```

**워크플로우**:
```
Phase 1: Issue 내용 로드
├── gh issue view #{N} --json 실행
├── 본문 파싱 (화면 목록, 기술 스택 추출)
└── 첨부 문서 복원 (필요시)
    ↓
Phase 2: 로컬 명세 생성
├── specs/screens/*.yaml 생성 (없는 경우)
├── docs/planning/*.md 복원 (필요시)
└── .claude/desktop-bridge-state.json 업데이트
    ↓
Phase 3: TASKS.md 생성 (/tasks-generator 연동)
├── Issue의 화면 체크리스트 → Phase/Task 변환
├── 연결점 검증 태스크 자동 생성
└── docs/planning/06-tasks.md 저장
    ↓
Phase 4: 구현 준비 완료
└── /auto-orchestrate 또는 /project-bootstrap 선택
```

**진행 상황 동기화**:
```
┌─────────────────────────────────────────────────────────────────┐
│  구현 진행 시 Issue 자동 업데이트                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 완료 시:                                                 │
│  gh issue comment #{N} --body "✅ Phase {N} 완료: {요약}"       │
│                                                                 │
│  화면 구현 완료 시:                                              │
│  Issue 본문의 체크박스 자동 체크 (gh issue edit)                 │
│                                                                 │
│  전체 완료 시:                                                   │
│  gh issue close #{N} --reason completed                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## GitHub 연동 방식

### 우선순위

| 순위 | 방식 | 확인 방법 |
|------|------|----------|
| 1 | GitHub MCP | mcp 도구 존재 여부 |
| 2 | gh CLI | `which gh` + `gh auth status` |

### gh CLI 폴백 명령어

```bash
# Issue 생성
gh issue create --title "{title}" --body "{body}" --label "design,from-desktop"

# Issue 조회
gh issue view {N} --json title,body,labels,state

# Issue 코멘트 추가
gh issue comment {N} --body "{message}"

# Issue 체크박스 업데이트
gh issue edit {N} --body "{updated_body}"

# Issue 닫기
gh issue close {N} --reason completed
```

---

## 기존 스킬과의 연동

```
[Desktop 환경]
/neurion (브레인스토밍)
    ↓
/socrates (21개 질문)
    ↓
/screen-spec (화면 명세)
    ↓
─────────────────────────────────────────────────
          /desktop-bridge publish
─────────────────────────────────────────────────
    ↓
[GitHub Issue #123 생성]
    ↓
─────────────────────────────────────────────────
          /desktop-bridge implement #123
─────────────────────────────────────────────────
    ↓
[CLI 환경]
/tasks-generator (자동 호출)
    ↓
/project-bootstrap (환경 셋업)
    ↓
/auto-orchestrate (완전 자동화)
    ↓
Issue 코멘트로 진행상황 업데이트
    ↓
PR 생성 및 Issue 연결
    ↓
Issue 자동 닫기
```

---

## 상태 파일

### .claude/desktop-bridge-state.json

```json
{
  "project_name": "my-awesome-project",
  "github_repo": "owner/repo",
  "issue_number": 123,
  "issue_url": "https://github.com/owner/repo/issues/123",
  "mode": "implement",
  "created_at": "2026-01-31T10:00:00Z",
  "last_sync": "2026-01-31T14:30:00Z",
  "screens": {
    "product-list": { "status": "completed", "synced": true },
    "product-detail": { "status": "in_progress", "synced": false },
    "cart": { "status": "pending", "synced": false }
  },
  "phases": {
    "1": { "status": "completed", "commented": true },
    "2": { "status": "in_progress", "commented": false }
  }
}
```

---

## ⏭️ 다음 단계 (CRITICAL)

> **이 섹션은 스킬 완료 후 반드시 실행합니다.**

### publish 모드 완료 후

```json
{
  "questions": [{
    "question": "GitHub Issue가 생성되었습니다!\n\n🔗 Issue #{N}: {URL}\n\n다음 단계를 선택해주세요:",
    "header": "다음 단계",
    "options": [
      {"label": "Issue URL 복사", "description": "CLI에서 implement 할 때 사용"},
      {"label": "바로 implement 실행", "description": "같은 세션에서 바로 구현 시작"}
    ],
    "multiSelect": false
  }]
}
```

### implement 모드 완료 후

```json
{
  "questions": [{
    "question": "구현 준비가 완료되었습니다!\n\n📋 TASKS.md 생성됨\n🔗 Issue #{N} 연동됨\n\n다음 단계를 선택해주세요:",
    "header": "다음 단계",
    "options": [
      {"label": "/project-bootstrap 실행", "description": "에이전트 팀 + 환경 셋업 (권장)"},
      {"label": "/auto-orchestrate 실행", "description": "바로 완전 자동화 개발 시작"}
    ],
    "multiSelect": false
  }]
}
```

**CRITICAL: 사용자가 스킬을 선택하면 반드시 `Skill` 도구로 즉시 실행!**

```
사용자 선택: "/project-bootstrap 실행"
    ↓
Skill({ skill: "project-bootstrap" })   ← 반드시 Skill 도구 호출!

사용자 선택: "/auto-orchestrate 실행"
    ↓
Skill({ skill: "auto-orchestrate" })    ← 반드시 Skill 도구 호출!
```

> **AskUserQuestion 결과를 텍스트로만 출력하지 말고,**
> **반드시 `Skill` 도구를 호출하여 다음 스킬을 실제 실행하세요.**

---

## Reference 파일

| 파일 | 내용 |
|------|------|
| `publish-flow.md` | publish 모드 상세 워크플로우 |
| `implement-flow.md` | implement 모드 상세 워크플로우 |

## Template 파일

| 파일 | 내용 |
|------|------|
| `issue-template.md` | Issue 생성 템플릿 |
| `comment-template.md` | 진행 코멘트 템플릿 |
