---
name: design-linker
description: design/ 폴더의 목업 이미지와 HTML 파일을 스캔하여 06-tasks.md의 각 Phase/Task에 디자인 레퍼런스를 자동 연결합니다. "디자인 연결", "목업 연결", "design link" 등의 키워드에 반응합니다.
---

# Design Linker: 목업 디자인 → 06-tasks.md 연결 스킬

## 역할

`design/` 폴더에 있는 Google Stitch 목업(HTML, PNG)을 스캔하고,
`06-tasks.md`의 각 Phase/Task에 해당 디자인 파일을 레퍼런스로 추가합니다.

---

## 실행 조건

```
/design-linker 또는 "디자인 연결해줘" 요청 시 실행
```

---

## 워크플로우

```
1. design/ 폴더 존재 확인
    ↓
2. 하위 폴더 및 파일 스캔
    ↓
3. 06-tasks.md 파일 찾기
    ↓
4. 디자인 ↔ Task 매핑
    ↓
5. 06-tasks.md 업데이트
    ↓
6. 결과 보고
```

---

## 1단계: design/ 폴더 확인

```bash
# design 폴더 존재 여부 확인
if [ -d "design" ]; then
    echo "✅ design/ 폴더 발견"
    ls -la design/
else
    echo "❌ design/ 폴더가 없습니다"
    echo "Google Stitch에서 내보낸 목업을 design/ 폴더에 넣어주세요"
    exit 1
fi
```

### 예상 폴더 구조

```
design/
├── login/                    # 로그인 화면
│   ├── login.html           # HTML 프리뷰
│   └── login.png            # 스크린샷
├── dashboard/                # 대시보드 화면
│   ├── dashboard.html
│   └── dashboard.png
├── product-list/             # 상품 목록
│   ├── product-list.html
│   └── product-list.png
└── checkout/                 # 결제 화면
    ├── checkout.html
    └── checkout.png
```

---

## 2단계: 디자인 파일 스캔

```bash
# 모든 하위 폴더와 파일 스캔
echo "📂 디자인 파일 스캔 중..."

for dir in design/*/; do
    if [ -d "$dir" ]; then
        folder_name=$(basename "$dir")
        html_file=$(find "$dir" -name "*.html" -type f | head -1)
        png_file=$(find "$dir" -name "*.png" -type f | head -1)

        echo "- $folder_name:"
        [ -n "$html_file" ] && echo "  HTML: $html_file"
        [ -n "$png_file" ] && echo "  PNG: $png_file"
    fi
done
```

### 스캔 결과 형식

```
📂 발견된 디자인 목업:

| 폴더명 | HTML | PNG | 연결 대상 Task |
|--------|------|-----|----------------|
| login | ✅ | ✅ | T1.2 (인증 UI) |
| dashboard | ✅ | ✅ | T2.1 (대시보드) |
| product-list | ✅ | ✅ | T2.3 (상품 목록) |
| checkout | ✅ | ✅ | T3.1 (결제) |
```

---

## 3단계: 06-tasks.md 파일 찾기

```bash
# 06-tasks.md 파일 위치 확인
TASKS_FILE="docs/planning/06-tasks.md"

if [ -f "$TASKS_FILE" ]; then
    echo "✅ 태스크 파일 발견: $TASKS_FILE"
else
    echo "❌ docs/planning/06-tasks.md 파일을 찾을 수 없습니다"
    echo "/tasks-generator를 먼저 실행해주세요"
    exit 1
fi
```

---

## 4단계: 디자인 ↔ Task 매핑

### 자동 매핑 규칙

| 디자인 폴더명 패턴 | 매핑 대상 Task 키워드 |
|-------------------|----------------------|
| `login`, `auth`, `signin` | 인증, 로그인, Auth |
| `register`, `signup` | 회원가입, Register |
| `dashboard`, `home` | 대시보드, 메인, Home |
| `profile`, `user` | 프로필, 사용자, User |
| `product`, `item` | 상품, 제품, Product |
| `cart`, `basket` | 장바구니, Cart |
| `checkout`, `payment` | 결제, 주문, Checkout |
| `list`, `table` | 목록, 리스트, List |
| `detail`, `view` | 상세, 조회, Detail |
| `form`, `input` | 폼, 입력, Form |
| `settings`, `config` | 설정, Settings |

### 매핑 로직

```python
# 의사 코드
def match_design_to_task(design_folder, tasks):
    folder_lower = design_folder.lower()

    for task in tasks:
        task_title_lower = task.title.lower()

        # 키워드 매칭
        if any(keyword in folder_lower for keyword in get_keywords(task_title_lower)):
            return task

        # 폴더명이 Task 제목에 포함되면 매칭
        if folder_lower in task_title_lower:
            return task

    return None  # 수동 매핑 필요
```

### 수동 매핑 질문 (매칭 실패 시)

```
📋 자동 매핑되지 않은 디자인이 있습니다:

design/settings/ 폴더를 어떤 Task에 연결할까요?

1. Phase 1, T1.3: 사용자 설정 API
2. Phase 2, T2.5: 설정 페이지 UI
3. Phase 3, T3.2: 알림 설정
4. 연결 안 함 (나중에 수동 연결)
```

---

## 5단계: 06-tasks.md 업데이트

### 추가되는 섹션 형식

각 Task에 다음 형식으로 디자인 레퍼런스를 추가합니다:

```markdown
### [] Phase 2, T2.1: 대시보드 UI 구현 RED→GREEN

**담당**: frontend-specialist

**디자인 레퍼런스**:
| 파일 | 경로 | 미리보기 |
|------|------|----------|
| HTML | [dashboard.html](../../../design/dashboard/dashboard.html) | 브라우저에서 열기 |
| PNG | ![대시보드 목업](../../../design/dashboard/dashboard.png) | 스크린샷 |

**TDD 사이클**:
...
```

### 업데이트 스크립트

```bash
# 06-tasks.md에 디자인 레퍼런스 추가 (예시)

# Task 찾기 및 업데이트
add_design_reference() {
    local task_id=$1
    local design_folder=$2
    local tasks_file=$3

    html_path="design/$design_folder/*.html"
    png_path="design/$design_folder/*.png"

    # 디자인 레퍼런스 블록 생성
    reference_block="
**디자인 레퍼런스**:
| 파일 | 경로 |
|------|------|
| HTML | [${design_folder}.html](../../../design/${design_folder}/${design_folder}.html) |
| PNG | ![${design_folder}](../../../design/${design_folder}/${design_folder}.png) |
"

    # Task 섹션에 삽입 (담당: 라인 다음에)
    # 실제 구현은 Claude가 Edit 도구로 수행
}
```

---

## 6단계: 결과 보고

```
✅ 디자인 연결 완료!

📊 연결 결과:
| Task | 디자인 폴더 | 상태 |
|------|------------|------|
| T1.2: 로그인 UI | login/ | ✅ 연결됨 |
| T2.1: 대시보드 | dashboard/ | ✅ 연결됨 |
| T2.3: 상품 목록 | product-list/ | ✅ 연결됨 |
| T3.1: 결제 화면 | checkout/ | ✅ 연결됨 |

📁 업데이트된 파일: docs/planning/06-tasks.md

💡 팁: 브라우저에서 HTML 파일을 열어 실제 디자인을 확인하세요.
```

---

## 전체 실행 예시

```
사용자: "/design-linker" 또는 "디자인 연결해줘"

Claude:
1️⃣ design/ 폴더 확인 중...
   ✅ design/ 폴더 발견

2️⃣ 디자인 파일 스캔 중...
   - login/: HTML ✅, PNG ✅
   - dashboard/: HTML ✅, PNG ✅
   - product-list/: HTML ✅, PNG ✅
   - checkout/: HTML ✅, PNG ✅

3️⃣ 06-tasks.md 파일 찾기...
   ✅ docs/planning/06-tasks.md 발견

4️⃣ 디자인 ↔ Task 매핑 중...
   - login/ → T1.2 (인증 UI)
   - dashboard/ → T2.1 (대시보드)
   - product-list/ → T2.3 (상품 목록)
   - checkout/ → T3.1 (결제)

5️⃣ 06-tasks.md 업데이트 중...
   [Edit 도구로 각 Task에 디자인 레퍼런스 추가]

6️⃣ 완료!
   ✅ 4개 Task에 디자인 레퍼런스가 연결되었습니다.
```

---

## 실행 시작

**스킬 발동 시 즉시 실행:**

1. `design/` 폴더 존재 확인 (Bash)
2. 하위 폴더 및 파일 목록 조회 (Bash)
3. 06-tasks.md 파일 읽기 (Read)
4. 디자인-Task 매핑 분석
5. 06-tasks.md 업데이트 (Edit)
6. 결과 보고

---

## 에러 처리

| 상황 | 처리 |
|------|------|
| design/ 폴더 없음 | 폴더 생성 안내 + 종료 |
| 06-tasks.md 없음 | /tasks-generator 실행 안내 |
| HTML/PNG 없음 | 해당 폴더 건너뛰기 + 경고 |
| 매핑 실패 | 사용자에게 수동 선택 요청 |

---

## Google Stitch 내보내기 가이드

Google Stitch에서 디자인을 내보낼 때:

1. 각 화면별로 **폴더 생성** (예: `login/`, `dashboard/`)
2. **HTML 내보내기**: 해당 폴더에 저장
3. **PNG 스크린샷**: 같은 폴더에 저장
4. 폴더명은 **영문 소문자 + 하이픈** 권장 (예: `product-list`)
