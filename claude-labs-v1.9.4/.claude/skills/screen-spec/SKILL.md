---
name: screen-spec
description: 소크라테스 결과를 기반으로 화면별 상세 명세(YAML v2.0)를 생성합니다. 화면이 필요로 하는 데이터(data_requirements)를 정의하고, 도메인 리소스와 느슨하게 결합합니다.
---

# screen-spec v2.0

> "화면이 주도하되, 도메인이 방어한다"
> 화면은 "무엇이 필요한지"만 선언, 백엔드는 "어떻게 제공할지" 독립적으로 결정

## 역할

소크라테스(/socrates)에서 도출된 화면 정의(06-screens.md)를 기반으로, 각 화면의 **상세 명세**를 YAML 형식으로 작성합니다.

### v2.0 핵심 변경

| 영역 | v1.0 | v2.0 |
|------|------|------|
| **API 정의** | `api.endpoint`, `api.request` | `data_requirements` + `data_source.resource` |
| **레이아웃** | `width: 250px` | `position: main`, `layout: sidebar-main` |
| **통합 테스트** | 12+개 | **3-5개 필수 시나리오만** |
| **파일 크기** | 400줄/화면 | **100줄/화면** 목표 |

---

## 워크플로우 개요

| Phase | 설명 | 주요 작업 |
|-------|------|----------|
| **Phase 0** | 도메인 리소스 확인 | `specs/domain/resources.yaml` 존재 확인 |
| **Phase 1** | 기획 문서 확인 | `06-screens.md` 화면 목록 파악 |
| **Phase 2** | 화면별 명세 작성 | 데이터 요구사항 → 컴포넌트 → 이벤트 → 테스트 |
| **Phase 3** | 공통 요소 추출 | 공통 컴포넌트, 타입 추출 |
| **Phase 4** | 도메인 커버리지 검증 | 화면 needs vs 리소스 fields 검증 |
| **Phase 5** | Stitch 디자인 생성 (선택) | 자동 체크 후 Google Stitch MCP로 목업 생성 |

> **상세 내용**: `references/phase-details.md` 참조

---

## 핵심 원칙

### 1. 화면은 "무엇이 필요한지"만 선언

```yaml
# 좋음 (v2.0)
data_requirements:
  - resource: products
    needs: [id, name, price, thumbnail]

# 나쁨 (v1.0)
api:
  endpoint: GET /api/products
  request:
    fields:
      category: string
```

### 2. 느슨한 결합 (Loose Coupling)

- 화면 → `data_requirements.resource` 참조
- 리소스 → `specs/domain/resources.yaml`에서 독립 관리
- 백엔드는 화면에 종속되지 않음

### 3. 100줄/화면 목표

- 상세한 API 스펙 제거
- 레이아웃 픽셀값 제거
- 통합 테스트 3-5개로 제한

---

## 출력 구조

> **⚠️ 필수 경로 규칙**: Stitch 출력물은 반드시 `design/` 하위에 저장!
> **프로젝트 루트에 PNG/HTML 파일을 직접 저장하면 안 됩니다!**

```
specs/
├── domain/
│   └── resources.yaml       # 도메인 리소스 정의
├── screens/
│   ├── index.yaml           # 화면 목록
│   ├── home.yaml            # + design_reference (Stitch 연동 시)
│   ├── product-list.yaml
│   └── ...
├── design-tokens.yaml       # Stitch 디자인 토큰 (선택)
└── shared/
    ├── components.yaml      # 공통 컴포넌트
    └── types.yaml           # 공통 타입

design/                       # ⚠️ Stitch 출력물 (반드시 이 폴더 하위에!)
├── screens/                 # 목업 이미지 (design/screens/*.png)
│   ├── product-list.png     # ❌ 루트/product-list.png 금지!
│   └── ...                  # ✅ design/screens/product-list.png
├── html/                    # 생성된 HTML (design/html/*.html)
│   ├── product-list.html
│   └── ...
└── stitch-project.json      # 프로젝트 메타데이터
```

### Stitch 파일 저장 전 필수 작업

```bash
# Phase 5 시작 시 반드시 디렉토리 먼저 생성!
mkdir -p design/screens design/html
```

---

## YAML 명세 예시

```yaml
# specs/screens/product-list.yaml
version: "2.0"

screen:
  name: 상품 목록
  route: /products
  layout: sidebar-main

data_requirements:
  - resource: products
    needs: [id, name, price, thumbnail]
    filters: { category: "?category", page: "?page" }

components:
  - id: product_grid
    type: grid
    position: main
    function: 상품 카드 그리드 표시
    data_source:
      resource: products

tests:
  - name: 초기 로드
    when: 페이지 접속
    then: [상품 12개 표시, 카테고리 사이드바 표시]
```

---

## Phase 5 발동 조건 (Stitch) - 자동 실행

> ⚠️ **Phase 4 완료 즉시 Phase 5가 자동으로 시작됩니다.**
> Stitch MCP 설정 여부를 자동 체크하고, 설정되어 있으면 사용자에게 연동 여부를 질문합니다.

### 자동 체크 시퀀스 (필수 실행)

```
Phase 4 완료 (도메인 커버리지 검증)
    ↓
┌─────────────────────────────────────────────────────────┐
│  🔍 Phase 5: Stitch MCP 자동 체크 시작                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Step 1️⃣: settings.json에서 stitch 설정 확인             │
│  Bash: cat ~/.claude/settings.json 2>/dev/null |        │
│        grep -q '"stitch"'                               │
│  ├─ 없음 → Step 2로 (미설정 안내)                        │
│  └─ 있음 → AskUserQuestion으로 Stitch 연동 여부 질문     │
│                                                         │
│  Step 2️⃣: 미설정 시 안내                                 │
│  ├─ Stitch MCP 미설정 안내 메시지 출력                   │
│  └─ 건너뛰고 "다음 단계" 질문으로 이동                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Stitch MCP 설정 상태 확인 코드

```bash
# Claude가 Phase 5 진입 시 실행하는 체크
cat ~/.claude/settings.json 2>/dev/null | grep -q '"stitch"' && \
  echo "✅ Stitch MCP 설정됨"
```

### 체크 결과별 동작

| 상태 | 동작 |
|------|------|
| ✅ stitch 설정 있음 | AskUserQuestion → "Stitch로 디자인 생성할까요?" |
| ❌ stitch 설정 없음 | **설치 가이드 안내** 후 건너뛰기 |

### ❌ Stitch MCP 미설정 시 안내 (필수!)

Stitch MCP가 설정되어 있지 않으면 다음 **설치 가이드를 사용자에게 안내**합니다:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 Stitch MCP 미설정                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stitch MCP는 YAML 화면 명세에서 디자인 목업을 자동 생성합니다.   │
│                                                                 │
│  💡 API Key로 간단히 설정 가능합니다! (GCP 불필요)              │
│                                                                 │
│  📋 Step 1: API Key 생성                                         │
│     👉 https://stitch.withgoogle.com/settings                   │
│     → "Create Key" 클릭 → 생성된 Key 복사                       │
│                                                                 │
│  📋 Step 2: Claude Labs 인스톨러                                 │
│     $ ./install.sh → Stitch MCP 선택 → API Key 입력             │
│                                                                 │
│  지금은 디자인 생성을 건너뛰고 진행합니다.                        │
└─────────────────────────────────────────────────────────────────┘
```

> **참고**: Stitch MCP 없이도 화면 명세는 정상적으로 생성됩니다.
> 디자인 목업 자동 생성 기능만 사용할 수 없습니다.

---

## 📊 CLI 하단 진행 상황 표시 (필수!)

> **모든 Phase 진입 시 TaskCreate를 사용하여 CLI 하단에 진행 상황을 표시합니다.**

### Phase별 TaskCreate 호출

```typescript
// Phase 0: 도메인 리소스 확인
TaskCreate({
  subject: "/screen-spec Phase 0: 도메인 리소스 확인",
  description: "resources.yaml 존재 및 구조 확인",
  activeForm: "📋 도메인 리소스 확인 중..."
})

// Phase 1: 기획 문서 확인
TaskCreate({
  subject: "/screen-spec Phase 1: 기획 문서 확인",
  description: "06-screens.md 화면 목록 파악",
  activeForm: "📄 화면 목록 파악 중..."
})

// Phase 2: 화면별 명세 (화면 개수만큼 반복)
TaskCreate({
  subject: "/screen-spec Phase 2: {화면명} 명세",
  description: "{화면명} YAML 명세 작성",
  activeForm: "📱 {화면명} 명세 작성 중... ({현재}/{전체})"
})

// Phase 3: 공통 요소 추출
TaskCreate({
  subject: "/screen-spec Phase 3: 공통 요소 추출",
  description: "공통 컴포넌트 및 타입 추출",
  activeForm: "🔧 공통 요소 추출 중..."
})

// Phase 4: 도메인 커버리지 검증
TaskCreate({
  subject: "/screen-spec Phase 4: 커버리지 검증",
  description: "화면 needs vs 리소스 fields 검증",
  activeForm: "✅ 커버리지 검증 중..."
})

// Phase 5: Stitch 디자인 생성 (자동 체크 후)
TaskCreate({
  subject: "/screen-spec Phase 5: Stitch 체크",
  description: "Stitch MCP 설정 및 OAuth 확인",
  activeForm: "🔍 Stitch MCP 체크 중..."
})

// Phase 5: Stitch 디자인 생성 (실행 시)
TaskCreate({
  subject: "/screen-spec Phase 5: Stitch 디자인 생성",
  description: "Google Stitch로 디자인 목업 생성",
  activeForm: "🎨 {화면명} 디자인 생성 중... ({현재}/{전체})"
})
```

### Stitch 디자인 생성 진행 표시

```
┌─────────────────────────────────────────────────────────┐
│  ⏳ /screen-spec Phase 5: Stitch 디자인 생성             │
│     🎨 product-list 디자인 생성 중... (2/5)              │
└─────────────────────────────────────────────────────────┘
```

### Phase 완료 시

```typescript
TaskUpdate({
  taskId: "{현재 task id}",
  status: "completed"
})
```

---

## 참조 파일

| 파일 | 설명 |
|------|------|
| [phase-details.md](./references/phase-details.md) | Phase별 상세 가이드 + **Stitch 자동 체크** |
| [schema.md](./references/schema.md) | 화면 명세 스키마 v2.0 |
| [component-types.md](./references/component-types.md) | 컴포넌트 타입 목록 |
| [stitch-prompt-builder.md](./references/stitch-prompt-builder.md) | Stitch 프롬프트 빌더 |
| [stitch-integration.md](./references/stitch-integration.md) | Stitch MCP 연동 가이드 |

---

## ⏭️ 다음 단계 (CRITICAL)

> **이 섹션은 스킬 완료 후 반드시 실행합니다.**

**화면 명세 완료 후 AskUserQuestion 실행:**

```json
{
  "questions": [{
    "question": "화면 명세가 완료되었습니다!\n\n다음 단계를 선택해주세요:",
    "header": "다음 단계",
    "options": [
      {"label": "/tasks-generator 실행 (권장)", "description": "화면 명세 기반 태스크 생성"},
      {"label": "수동으로 진행", "description": "직접 개발 진행"}
    ],
    "multiSelect": false
  }]
}
```

**CRITICAL: 사용자가 스킬을 선택하면 반드시 `Skill` 도구로 즉시 실행!**

```
사용자 선택: "/tasks-generator 실행"
    ↓
Skill({ skill: "tasks-generator" })  ← 반드시 Skill 도구 호출!

사용자 선택: "수동으로 진행"
    ↓
종료 메시지 출력
```

> **AskUserQuestion 결과를 텍스트로만 출력하지 말고,**
> **반드시 `Skill` 도구를 호출하여 다음 스킬을 실제 실행하세요.**

**권장 워크플로우:**
```
/socrates → /screen-spec → /tasks-generator → /project-bootstrap → /auto-orchestrate
```
