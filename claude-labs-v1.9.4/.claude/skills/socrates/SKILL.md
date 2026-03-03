---
name: socrates
description: 소크라테스식 1:1 기획 컨설팅. 핵심 기능 도출 → 화면 매핑 → 7개 기획 문서 생성. /screen-spec과 연결.
---

# Socrates: 소크라테스식 기획 컨설팅

> "기능에 집중하고, 화면에 매핑하라"

---

## 활성화 트리거

- `/socrates` 명령 입력 시
- `docs/planning/` 폴더가 비어있을 때
- 프로젝트 초기 기획 단계

---

## 핵심 워크플로우

### 1단계: 초기 설정
- 사용자 프로필 확인 (`.claude/memory/user-profile.md`)
- neurion-proposal.md 확인 (브레인스토밍 기획안 활용 여부)
- MCP 설정 상태 체크 (Stitch, Gemini, Context7)
- 레벨 측정 (신규 사용자만, L1~L4)

### 2단계: 핵심 기능 도출 (Phase 1)
- "무엇을 만들고 싶어요?" 질문
- 핵심 기능 3가지 도출
- 각 기능의 Why 질문 (1~2회)
- 레벨별 질문 스타일 적용

### 3단계: 화면 매핑 (Phase 2)
- 각 기능을 화면에 매핑
- 화면 간 이동 경로 정의
- 컴포넌트 도출 (버튼, 입력 필드, 목록)
- 기능→화면→컴포넌트 전환

### 4단계: 기술 스택 결정 (Phase 2.5)
- 레벨별 전략: L1/L2는 자동 추천, L3/L4는 선택지 제공
- 기술 스택 트레이드오프 설명
- 결정된 스택 기록

### 5단계: 문서 생성 (Phase 3)
- 7개 기획 문서 생성 (`docs/planning/`)
- 01-prd.md ~ 07-coding-convention.md
- 06-screens.md는 /screen-spec 입력
- 기획 검증 (망하는 기획 4요건 검사)

---

## 제약 조건

### ✅ MUST DO
- 반드시 AskUserQuestion 도구 사용
- Phase 진입 시 TaskCreate로 진행 상황 표시
- 모든 기능을 화면에 매핑 (Phase 2 완료 기준)
- 7개 기획 문서 모두 생성
- 완료 후 다음 단계 선택지 제공 (/screen-spec 권장)

### ⛔ MUST NOT DO
- 질문 없이 기획서 작성 금지
- 고정 질문 기계적 사용 금지
- Phase 2 건너뛰기 금지 (화면 매핑 필수)
- 문서 생성 없이 완료 주장 금지

---

## 참조 라우팅

| Topic | Reference | Load When |
|-------|-----------|-----------|
| 21개 질문 체계 | references/question-framework.md | 소크라테스 대화 진행 시 (Phase 1) |
| 기획 문서 생성 | references/output-documents.md | 문서 출력 단계 시 (Phase 3) |
| 화면 매핑 | references/screen-mapping.md | 기능→화면 전환 시 (Phase 2) |
| 레벨 측정 | references/level-assessment.md | 신규 사용자 최초 진입 시 |
| 소크라테스 기법 | references/socratic-method.md | 질문 생성 시 |
| 동적 질문 생성 | references/dynamic-questions.md | 답변 기반 질문 생성 시 |
| 대화 규칙 | references/conversation-rules.md | 전체 대화 중 |
| Phase별 상세 가이드 | references/phase-details.md | 각 Phase 진입 시 |
| 기술 스택 추천 | references/tech-stack-recommendation.md | Phase 2.5 진입 시 |
| 기획 검증 | references/failing-planning-checklist.md | Phase 3.5 검증 시 |

---

## 빠른 시작

```bash
# 1. /socrates 실행
/socrates

# 2. 레벨 측정 (신규 사용자)
→ 2-3개 질문으로 L1~L4 판정

# 3. 핵심 기능 도출 (Phase 1)
→ "무엇을 만들고 싶어요?"
→ "핵심 기능 3가지가 뭐예요?"

# 4. 화면 매핑 (Phase 2)
→ "{기능1}은 어떤 화면에서 하나요?"
→ "화면 간 이동 경로가 어떻게 되나요?"

# 5. 문서 생성 (Phase 3)
→ docs/planning/*.md 7개 파일 생성

# 6. 다음 단계
→ /screen-spec 실행 (권장)
```

---

## ⏭️ 다음 단계 (CRITICAL)

> **이 섹션은 스킬 완료 후 반드시 실행합니다.**

**기획 문서 생성 완료 후 AskUserQuestion 실행:**

```json
{
  "questions": [{
    "question": "기획 문서 7개가 생성되었습니다!\n\n다음 단계를 선택해주세요:",
    "header": "다음 단계",
    "options": [
      {"label": "/screen-spec 실행 (권장)", "description": "화면별 YAML 명세 생성"},
      {"label": "/tasks-generator 실행", "description": "화면 명세 없이 바로 TASKS.md 생성"},
      {"label": "여기서 마무리", "description": "기획 문서만 저장하고 종료"}
    ],
    "multiSelect": false
  }]
}
```

**CRITICAL: 사용자가 스킬을 선택하면 반드시 `Skill` 도구로 즉시 실행!**

```
사용자 선택: "/screen-spec 실행"
    ↓
Skill({ skill: "screen-spec" })      ← 반드시 Skill 도구 호출!

사용자 선택: "/tasks-generator 실행"
    ↓
Skill({ skill: "tasks-generator" })  ← 반드시 Skill 도구 호출!

사용자 선택: "여기서 마무리"
    ↓
종료 메시지 출력
```

> **AskUserQuestion 결과를 텍스트로만 출력하지 말고,**
> **반드시 `Skill` 도구를 호출하여 다음 스킬을 실제 실행하세요.**

**권장 워크플로우:**
```
/socrates → /screen-spec → /tasks-generator → /project-bootstrap → /auto-orchestrate
```
