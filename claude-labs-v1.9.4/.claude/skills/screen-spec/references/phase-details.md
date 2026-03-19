# Screen-Spec Phase 상세 가이드

> SKILL.md에서 분리된 Phase별 상세 내용입니다.

---

## Phase 0: 도메인 리소스 확인

### 리소스 파일 확인

```
specs/domain/resources.yaml 확인
  ↓
없으면 사용자에게 안내
```

### 리소스 없을 때 안내 메시지

```
[도메인 리소스 필요]

화면 명세를 작성하기 전에 도메인 리소스 정의가 필요합니다.
specs/domain/resources.yaml 파일을 먼저 생성해주세요.

예시:
resources:
  products:
    endpoints:
      - method: GET
        path: /api/products
    fields:
      id: { type: uuid }
      name: { type: string }
      price: { type: number }

도메인 리소스를 먼저 정의할까요, 아니면 기본 구조로 진행할까요?
```

---

## Phase 1: 기획 문서 확인

### 화면 목록 확인

```
[화면 목록 확인]

06-screens.md에서 다음 화면들을 확인했습니다:

1. 홈 (/) - 메인 랜딩 페이지
2. 상품 목록 (/products) - 카테고리별 상품 브라우징
3. 상품 상세 (/products/:id) - 상품 정보 및 구매
...

이 화면 목록으로 진행할까요? 추가/수정이 필요하면 말씀해주세요.
```

---

## Phase 2: 화면별 명세 작성

### 2.1 데이터 요구사항 도출

```
[상품 목록 화면 - 데이터 요구사항]

이 화면에 필요한 데이터를 도메인 리소스에서 도출합니다:

1. **products** 리소스
   - 필요 필드: id, name, price, thumbnail
   - 필터: category, page, sort

2. **categories** 리소스
   - 필요 필드: id, name, slug, product_count

3. **wishlist** 리소스 (인증 필요)
   - 필요 필드: product_id

이 데이터 요구사항이 맞나요?
```

### 2.2 컴포넌트 도출

```
[상품 목록 화면 - 컴포넌트 도출]

필요한 컴포넌트를 정의합니다:

1. **category_sidebar** (navigation, sidebar)
   - 기능: 카테고리 필터링
   - 데이터: categories 리소스

2. **product_grid** (grid, main)
   - 기능: 상품 그리드 표시
   - 데이터: products 리소스

3. **product_card** (card, main)
   - 기능: 개별 상품 정보 표시
   - 데이터: products 리소스

이 컴포넌트 구성이 맞나요?
```

### 2.3 이벤트 정의

```
[상품 목록 화면 - 이벤트 정의]

각 컴포넌트의 이벤트를 정의합니다:

**category_sidebar**
- click:category → 선택한 카테고리로 필터링, URL 업데이트

**product_card**
- click:card → 상품 상세 페이지로 이동
- click:wishlist → 로그인 체크 후 위시리스트 토글

이벤트 정의가 맞나요?
```

### 2.4 테스트 시나리오 (3-5개만!)

```
[상품 목록 화면 - 핵심 테스트]

3-5개 핵심 시나리오만 정의합니다:

1. **초기 로드** - 상품 12개 표시, 카테고리 사이드바 표시
2. **카테고리 필터링** - URL 변경, 필터링된 상품 표시
3. **상품 상세 이동** - /products/:id로 이동
4. **찜하기 (비로그인)** - 로그인 모달 표시
5. **무한 스크롤** - 다음 12개 상품 추가 로드

테스트 시나리오가 충분한가요?
```

### 2.5 YAML 저장 예시

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
    events:
      - on: scroll:end
        do: 다음 페이지 로드

tests:
  - name: 초기 로드
    when: 페이지 접속
    then: [상품 12개 표시, 카테고리 사이드바 표시]
```

---

## Phase 3: 공통 요소 추출

모든 화면 명세 완료 후:

1. 공통 컴포넌트 추출 → `specs/shared/components.yaml`
2. 공통 타입 추출 → `specs/shared/types.yaml`
3. 화면 인덱스 생성 → `specs/screens/index.yaml`

---

## Phase 4: 도메인 커버리지 검증

```
[도메인 커버리지 검증]

화면 데이터 요구사항 vs 도메인 리소스 검증:

✅ products.id - 리소스에 존재
✅ products.name - 리소스에 존재
✅ products.price - 리소스에 존재
❌ products.thumbnail - 리소스에 없음!

누락된 필드가 있습니다. 리소스 정의를 업데이트하시겠습니까?
```

---

## Phase 5: Stitch 디자인 생성 (자동 발동)

> ⚠️ **Phase 4 완료 즉시 자동으로 Phase 5가 시작됩니다.**
> Stitch MCP 설정 여부를 체크하고, 설정되어 있으면 사용자에게 연동 여부를 질문합니다.

### 자동 발동 시퀀스

```
Phase 4 완료 (도메인 커버리지 검증)
    ↓
[자동] TaskCreate: "/screen-spec Phase 5: Stitch 체크"
    ↓
[자동] Stitch MCP 설정 체크 실행
    ↓
┌─────────────────────────────────────────────────────────┐
│  🔍 Stitch MCP 설정 체크                                │
│                                                         │
│  1️⃣ settings.json 확인...                               │
│  2️⃣ mcpServers.stitch 설정 확인...                      │
│  3️⃣ GOOGLE_CLOUD_PROJECT 확인...                        │
│  4️⃣ gcloud OAuth 인증 상태 확인...                       │
│                                                         │
│  결과: ✅ Stitch 사용 가능 / ❌ 미설정                    │
└─────────────────────────────────────────────────────────┘
    ↓
[조건부] AskUserQuestion: "Stitch로 디자인 생성할까요?"
```

### Stitch 연동 안내 (설정 완료 시)

```
[Stitch 디자인 생성]

✅ Stitch MCP 설정이 확인되었습니다.
화면 명세에서 디자인 목업을 자동 생성할까요?

1. 예 - 모든 화면 생성 (권장)
2. 선택 - 특정 화면만 선택
3. 아니오 - 건너뛰기

Stitch 연동 시:
- 디자인 시스템 문서(05-design-system.md)의 색상/폰트/간격 자동 적용
- 생성된 목업 이미지와 HTML 자동 저장
- WCAG 2.1 접근성 검사 자동 수행
- YAML에 design_reference 자동 추가
```

### 진행 상황 표시

```
[Stitch 디자인 생성 진행 중]

⚠️ 디렉토리 생성: mkdir -p design/screens design/html

[1/3] 상품 목록 생성 중...
      ├── 프롬프트 생성 완료
      ├── Stitch 화면 생성 완료
      ├── 🖼️ 이미지 추출 (scale=3) → design/screens/product-list.png
      │   ⚠️ 반드시 design/screens/ 하위! 루트 저장 금지!
      ├── 📄 HTML 추출 (format=html) → design/html/product-list.html
      │   ⚠️ 반드시 design/html/ 하위! 루트 저장 금지!
      ├── 접근성 검사 완료 (점수: 92/100)
      └── YAML 업데이트 완료

✅ 완료! 3개 화면 생성됨.
```

### ⚠️ Stitch 추출 필수 옵션 (반드시 적용!)

> **이 옵션들을 사용하지 않으면 저해상도 이미지만 생성되거나 HTML이 누락됩니다!**
> **⚠️ 저장 경로**: 반드시 `design/screens/`, `design/html/` 하위에 저장! 프로젝트 루트 저장 금지!

```bash
# ⚠️ Phase 5 시작 시 반드시 먼저 실행!
mkdir -p design/screens design/html
```

```python
# 화면별 추출 루프
for screen in generated_screens:
    # 1️⃣ 이미지 추출 - scale=3 필수!
    image_data = mcp__stitch__fetch_screen_image(
        screen_id=screen["id"],
        format="png",
        scale=3  # ⚠️ 고해상도 필수 (1=저, 2=중, 3=고)
    )
    # ⚠️ 저장 경로: design/screens/ 하위! 프로젝트 루트 금지!
    save_file(f"design/screens/{screen['name']}.png", image_data)

    # 2️⃣ HTML 추출 - 반드시 호출!
    html_code = mcp__stitch__fetch_screen_code(
        screen_id=screen["id"],
        format="html"  # ⚠️ 명시 필수!
    )
    # ⚠️ 저장 경로: design/html/ 하위! 프로젝트 루트 금지!
    save_file(f"design/html/{screen['name']}.html", html_code)
```

| 추출 타입 | 필수 옵션 | 누락 시 문제 |
|----------|----------|-------------|
| 이미지 | `scale=3` | 저해상도 이미지 |
| HTML | `fetch_screen_code()` 호출 | HTML 파일 미생성 |

### Stitch 발동 전 자동 체크 (필수!)

Phase 5 진입 시 다음을 **자동으로 체크**합니다:

```python
# 1. Stitch MCP 설정 확인
def check_stitch_available():
    settings_path = os.path.expanduser("~/.claude/settings.json")

    if not os.path.exists(settings_path):
        return False, "settings.json 없음"

    with open(settings_path) as f:
        settings = json.load(f)

    if "stitch" not in settings.get("mcpServers", {}):
        return False, "Stitch MCP 미설정"

    stitch_config = settings["mcpServers"]["stitch"]
    if not stitch_config.get("env", {}).get("GOOGLE_CLOUD_PROJECT"):
        return False, "Google Cloud 프로젝트 ID 없음"

    return True, "OK"

# 2. gcloud 인증 확인
def check_gcloud_auth():
    result = subprocess.run(
        ["gcloud", "auth", "application-default", "print-access-token"],
        capture_output=True
    )
    return result.returncode == 0
```

### Stitch 미설정 시 안내 (사용자에게 표시)

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 Stitch MCP 미설정                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stitch MCP는 YAML 화면 명세에서 디자인 목업을 자동 생성합니다.   │
│  설정하려면 다음 단계를 따르세요:                                 │
│                                                                 │
│  📋 Step 1: Google Cloud 프로젝트                                │
│     https://console.cloud.google.com/                           │
│     → 새 프로젝트 생성 또는 기존 프로젝트 선택                    │
│                                                                 │
│  📋 Step 2: Stitch API 활성화                                    │
│     https://console.cloud.google.com/apis/library               │
│     → "Stitch API" 검색 후 활성화                                │
│                                                                 │
│  📋 Step 3: gcloud CLI 인증                                      │
│     터미널에서 실행:                                             │
│     $ gcloud auth login                                         │
│     $ gcloud auth application-default login                     │
│                                                                 │
│  📋 Step 4: settings.json 설정                                   │
│     Claude Labs 인스톨러 재실행:                                 │
│     $ ./install.sh → "Stitch MCP" 선택                          │
│                                                                 │
│     또는 수동으로 ~/.claude/settings.json에 추가:                │
│     {                                                           │
│       "mcpServers": {                                           │
│         "stitch": {                                             │
│           "command": "npx",                                     │
│           "args": ["-y", "@anthropic-ai/stitch-mcp"]            │
│         }                                                       │
│       }                                                         │
│     }                                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

💡 Stitch 없이도 화면 명세는 정상 생성됩니다.
   디자인 목업 자동 생성만 사용할 수 없습니다.

지금은 디자인 생성을 건너뛰고 진행합니다.
```

### gcloud 미인증 시 안내

```
[Google Cloud 인증 필요]

Stitch MCP를 사용하려면 gcloud 인증이 필요합니다.

터미널에서 다음 명령어를 실행하세요:
  $ gcloud auth login
  $ gcloud auth application-default login

브라우저가 열리면 Google 계정으로 로그인하세요.

지금은 디자인 생성을 건너뛰고 진행할까요?
```
