# Multi Blog Hub — Brand Guide

**Direction C · Bracket / Code wordmark**
"Operate many · Earn as one"

---

## 1. 컨셉

`[multi]blog.hub` — 멀티 블로그 운영자를 위한 코드/CMS DNA의 워드마크.
대괄호 `[ ]` 는 "선택자(selector)"이자 "복수 항목을 묶는 컨테이너"의 시각적 메타포로,
브랜드의 핵심 가치인 **"여러 개를 운영하되 하나처럼"** 을 형식 자체로 드러낸다.

- 모노스페이스 = 코드, 터미널, CMS의 시각 언어
- 액센트 블루의 `[ ]` = 시스템·자동화·기술적 정밀함
- 굵은 `hub` = 모든 채널이 모이는 종착점

---

## 2. 컬러 팔레트

| 토큰     | HEX        | 용도                                 |
| -------- | ---------- | ------------------------------------ |
| Accent   | `#4F6BFF`  | 브래킷 `[ ]`, 강조, 인터랙션 포커스  |
| Ink      | `#1F2530`  | `hub` (700), 본문 메인 텍스트        |
| Ink-2    | `#3D4554`  | `multi`, `blog`, 보조 텍스트         |
| Ink-3    | `#7B8295`  | `.`, 디스크립터, 메타 정보           |
| Paper    | `#F8F7F2`  | 라이트 모드 배경                     |
| Dark BG  | `#1A1F2A`  | 다크 모드 배경                       |

---

## 3. 타이포그래피

**프라이머리 (워드마크):** JetBrains Mono
폴백 스택: `'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, Consolas, monospace`

| 부분    | 굵기 | 컬러     |
| ------- | ---- | -------- |
| `[` `]` | 500  | Accent   |
| `multi` | 500  | Ink-2    |
| `blog`  | 500  | Ink-2    |
| `.`     | 500  | Ink-3    |
| `hub`   | 700  | Ink      |

레터 스페이싱: `-0.04em` (84px 기준 약 -3)
라인 하이트: 1

**디스크립터 (보조):** Inter / 시스템 산세리프
- 사이즈: 13px
- 트래킹: 3.5
- 컬러: Ink-3
- 케이스: UPPERCASE
- 카피: `OPERATE MANY · EARN AS ONE`

---

## 4. 파일 구조 (`brand/`)

### 워드마크 풀 락업

| 파일                                       | 용도                            |
| ------------------------------------------ | ------------------------------- |
| `multi-blog-hub-logo-white.{png,svg}`      | 라이트 배경 (Paper)             |
| `multi-blog-hub-logo-black.{png,svg}`      | 다크 배경 (Dark BG)             |
| `multi-blog-hub-logo-transparent.{png,svg}`| 투명 배경 — 자유 배치           |
| `multi-blog-hub-logo-mark-only.{png,svg}`  | `[m]` 마크만 — 컴팩트 노출용    |

### 파비콘 / 앱 아이콘

각 모드별 SVG + 32 / 64 / 192 / 512 PNG.

| 모드       | 파일                              |
| ---------- | --------------------------------- |
| Light      | `favicon-light.svg`, `-32/64/192/512.png` |
| Dark       | `favicon-dark.svg`, `-32/64/192/512.png`  |
| Transparent| `favicon-transparent.svg`, `-32/64/192/512.png` |

---

## 5. 사용 가이드

### 권장 — Do

- 워드마크 주변에 **최소 여백**: 글자 높이 × 0.5 이상
- 최소 표시 사이즈: 워드마크 PNG는 폭 240px 이상, 16px 파비콘은 `[m]` 마크만 사용
- 배경 대비 충분치 않을 때는 **transparent → 배경 위 텍스트 컬러 유지** 또는 light/dark 변형 사용
- 파비콘은 항상 둥근 모서리(14/80 = 17.5%) 배경 사용 — 모서리 노이즈 방지

### 금지 — Don't

- 글자 색을 임의로 바꾸지 않기 (액센트 = 브래킷에만)
- 워드마크의 자간/굵기/케이스 변경 금지 (모두 소문자 유지, `hub`만 700)
- 효과(드롭섀도우, 그라디언트, 외곽선) 금지
- 회전, 비례 왜곡, 배경 패턴 위 직접 배치 금지

---

## 6. 사이즈 가이드

| 컨텍스트          | 권장                          |
| ----------------- | ----------------------------- |
| 헤더 / 네비게이션 | SVG, 높이 28–40px             |
| 풋터              | SVG, 높이 20–28px             |
| 소셜 OG 이미지    | `-white` 또는 `-black` PNG    |
| 앱 아이콘 (iOS)   | `favicon-light-512.png`       |
| 브라우저 탭       | `favicon-light-32.png` + SVG  |
| 명함 / 인쇄물     | SVG (벡터 우선)               |

---

## 7. 음성 / 메시지 톤

워드마크가 코드/시스템 DNA를 시각적으로 말하므로, 카피는 **차분하고 정확한 시스템 언어**를 권장.

- 좋음: "Operate many · Earn as one", "One inbox. Many channels.", "All your blogs, one dashboard."
- 피하기: 과장된 마케팅 어투, 이모지 남용, 감탄사

---

*Last updated · Direction C · v1*
