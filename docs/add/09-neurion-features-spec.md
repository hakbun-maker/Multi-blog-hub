# Neurion 아이디어 #15 #4 #10 #13 — 기능 개발 방향 & 전략 정의서

> 작성일: 2026-03-16 | 버전: 1.1.0
> neurion-proposal.md에서 선택된 4개 아이디어의 구체적 개발 방향 정의

---

## 개요 및 구현 우선순위

| 순위 | # | 아이디어명 | 핵심 목적 | 구현 위치 |
|------|---|-----------|---------|---------|
| 1 | **#15** | 다중 언어 자동 발행 | 블로그별 언어 → 해당 언어로 원어 작성 + 언어별 스케줄링 | 블로그 설정 > 언어/지역 탭 |
| 2 | **#4** | 수익화 가이드 | 목표 수익 → 실천 전략 자동 계산 (아코디언 패널) | 수익화 대시보드 > 수익화 가이드 섹션 |
| 3 | **#10** | SNS 자동 변환 배포 | 발행 글 → 인스타/X/쓰레드 자동 변환 + 이미지 옵션 | 블로그 설정 > SNS 자동화 탭 |
| 4 | **#13** | 제휴마케팅 자동화 | 쿠팡파트너스 ID 기반 상품 링크 자동 삽입 | 블로그 설정 > 수익화 연동 탭 |

---

## #15 — 다중 언어 자동 발행

### 개념 정의

> "블로그별로 언어를 설정하면, AI가 해당 언어로 글을 **직접 작성** (번역이 아닌 원어 작성)"
> 키워드 발굴부터 스케줄러까지 언어별 특성이 자동으로 반영된다.

### 지원 언어 및 특성 (6개)

> Growth+ 전용 기능 (`multilingual`). ko는 모든 플랜에서 사용 가능.

| 코드 | 언어 | 주요 검색엔진 | 1순위 키워드 소스 | CPC 특성 | 코어타임 | 제휴 기본값 |
|------|------|------------|----------------|---------|---------|-----------|
| `ko` | 한국어 | 네이버 + 구글 | 네이버 광고 API | 중간~높음 | 06:00 KST | 쿠팡 |
| `en` | English | Google | Google KWP (Global) | 높음 | 09:00 PST | Amazon US |
| `ja` | 日本語 | Google + Yahoo JP | Google KWP (JP) | 높음 | 07:00 JST | Amazon JP |
| `de` | Deutsch | Google | Google KWP (DE) | 매우 높음 | 07:00 CET | Amazon DE |
| `pt_br` | Português | Google | Google KWP (BR) | 중간 | 08:00 BRT | Amazon BR |
| `es` | Español | Google | Google KWP (ES) | 중~높음 | 08:00 CET | Amazon ES |

### 설정 구조 (블로그 설정 > 언어/지역 탭)

```
[언어/지역 설정]

작성 언어:   [한국어 ▼]  (한국어 / English / 日本語 / Deutsch / Português / Español)
타겟 국가:   [대한민국 ▼]
타겟 검색엔진: ← 언어 선택 시 자동 설정 (수정 가능)

─────────────────────────────────────────
자동 적용 발행 설정 (언어 선택 시 자동 채워짐)
─────────────────────────────────────────
코어 발행 시간: [06:00] (시간대: Asia/Seoul)
권장 일일 발행 수: [1~3편]
최소 글자수: [1,500자]
키워드 소스 우선순위: 네이버 광고 API → Google KWP → DataLab
```

### AI 글쓰기 언어별 처리

```typescript
// 언어별 글쓰기 지시 자동 매핑
const LANGUAGE_WRITING_CONFIG = {
  ko: {
    instruction: "한국어로 자연스럽게 작성하세요. 구어체와 문어체를 상황에 맞게 사용하세요.",
    seoTarget: "naver",
    minWordCount: 1500,
    model: 'claude-sonnet-4-6',
  },
  en: {
    instruction: "Write in natural American English. Use idioms native speakers use. Avoid keyword stuffing.",
    seoTarget: "google",
    minWordCount: 1200,  // 영어 단어 기준
    model: 'claude-sonnet-4-6',
  },
  ja: {
    instruction: "自然な日本語で書いてください。です/ます体を基本とし、読みやすい構成にしてください。",
    seoTarget: "google",  // Yahoo JP도 결국 Google 기반 SEO
    minWordCount: 1500,
    model: 'claude-sonnet-4-6',
  },
  de: {
    instruction: "Schreiben Sie in natürlichem Deutsch. Verwenden Sie korrekte Grammatik und einen professionellen aber zugänglichen Ton.",
    seoTarget: "google",
    minWordCount: 1200,  // 독일어 단어 기준
    model: 'claude-sonnet-4-6',
  },
  pt_br: {
    instruction: "Escreva em português brasileiro natural. Use um tom conversacional e acessível, com expressões locais.",
    seoTarget: "google",
    minWordCount: 1200,
    model: 'claude-sonnet-4-6',
  },
  es: {
    instruction: "Escribe en español natural. Usa un tono conversacional y accesible, evitando regionalismos excesivos para alcance global.",
    seoTarget: "google",
    minWordCount: 1200,
    model: 'claude-sonnet-4-6',
  },
}
```

### 키워드 발굴 언어별 데이터 소스 자동 매핑

```typescript
type BlogLanguage = 'ko' | 'en' | 'ja' | 'de' | 'pt_br' | 'es'

function getDataSourceConfig(language: BlogLanguage): DataSourceConfig {
  return {
    ko: {
      primary: 'naver_ads',       // 1순위: 검색량 + 경쟁도
      secondary: 'google_kwp',    // 2순위: CPC (애드센스 수익 핵심)
      trend: 'naver_datalab',     // 3순위: 계절성
      timezone: 'Asia/Seoul',
      corePublishHour: 6,
      defaultAffiliate: 'coupang',
    },
    en: {
      primary: 'google_kwp',      // Global — 네이버 없음
      secondary: null,
      trend: 'google_trends',
      timezone: 'America/Los_Angeles',
      corePublishHour: 9,
      defaultAffiliate: 'amazon',
    },
    ja: {
      primary: 'google_kwp',      // JP 지역 설정
      secondary: null,            // Yahoo Japan 공식 API 미제공 → Google만 사용
      trend: 'google_trends',
      timezone: 'Asia/Tokyo',
      corePublishHour: 7,
      defaultAffiliate: 'amazon',
    },
    de: {
      primary: 'google_kwp',      // DE 지역 설정 — 유럽 최고 CPC
      secondary: null,
      trend: 'google_trends',
      timezone: 'Europe/Berlin',
      corePublishHour: 7,
      defaultAffiliate: 'amazon',
    },
    pt_br: {
      primary: 'google_kwp',      // BR 지역 설정
      secondary: null,
      trend: 'google_trends',
      timezone: 'America/Sao_Paulo',
      corePublishHour: 8,
      defaultAffiliate: 'amazon',
    },
    es: {
      primary: 'google_kwp',      // ES 지역 설정 — LATAM 포함
      secondary: null,
      trend: 'google_trends',
      timezone: 'Europe/Madrid',
      corePublishHour: 8,
      defaultAffiliate: 'amazon',
    },
  }[language]
}
```

### 배분 엔진 언어별 스케줄 통합

```
[같은 날 한국어 3개 + 영어 1개 배분 예시]

한국어 블로그 A:  06:00 KST (새벽 코어타임)
한국어 블로그 B:  07:15 KST (1~2시간 랜덤 간격)
한국어 블로그 C:  08:40 KST (1~2시간 랜덤 간격)
영어 블로그:      09:00 PST = 다음날 02:00 KST (UTC 변환 후 pg_cron 등록)

→ 각 언어의 현지 시간대 코어타임 기준으로 스케줄링
→ pg_cron은 UTC 기준으로 등록
```

### 구현 위치

```
app/(dashboard)/blogs/[id]/settings/page.tsx        — 언어/지역 탭 추가
lib/monetize/engines/ai-writer.ts                   — 언어별 프롬프트 분기
lib/monetize/engines/keyword-scorer.ts              — 언어별 데이터 소스 자동 선택
lib/monetize/engines/distribution-engine.ts         — 언어별 시간대 스케줄링
app/api/monetize/keywords/search/route.ts           — 언어 파라미터 추가
```

---

## #4 — 수익화 가이드 (수익 목표 역산)

### 개념 정의

> "목표 수익 입력 → 달성에 필요한 블로그 구성 + 페르소나 + 일일 발행 전략을 구체적으로 안내"
> 98% 자동화 환경이므로 하루 작성 시간 제약 없이 계산한다.
> **대시보드에서 평소엔 숨겨져 있고, 클릭 시 아코디언으로 슬라이드 다운.**

### UI 구조: 아코디언 패널 (수익화 대시보드 하단)

```
[수익화 로켓 대시보드]
  ┌────────────────────────────────────┐
  │ RocketStatusCard | RevenueSummary  │  ← 기존 위젯들
  ├────────────────────────────────────┤
  │ RevenueLineChart | BlogGradeTable  │
  ├────────────────────────────────────┤
  │ MultiDimensionChart                │
  ├────────────────────────────────────┤
  │ ▼ 수익화 가이드 ────────────────── │  ← 아코디언 토글 버튼
  │   (클릭 시 아래로 슬라이드 오픈)   │
  └────────────────────────────────────┘
```

```
[수익화 가이드 — 열린 상태]

  입력 영역
  ┌──────────────────────────────────────────────┐
  │ 월 목표 수익:   [_____________원]             │
  │ 현재 블로그 수: [____개]                      │
  │ 주력 카테고리:  [법률/금융 ▼] [+ 추가]        │
  │                              [전략 계산하기 →] │
  │                              [MD 다운로드 ↓]  │
  └──────────────────────────────────────────────┘

  결과 영역 (계산 후 표시)
  ┌──────────────────────────────────────────────┐
  │ 📊 월 {목표}원 달성 전략                       │
  ├──────────────────────────────────────────────┤
  │ 블로그 구성 추천                               │
  │  S급 (고CPC): 2개 | A급 (고트래픽): 3개       │
  │  B급 (계절성): 2개                            │
  ├──────────────────────────────────────────────┤
  │ 일일 발행 계획 (자동화 기준)                   │
  │  S급 블로그: 일 2편 | A급: 일 3편 | B급: 주 5편│
  │  합계: 하루 평균 {N}편                        │
  ├──────────────────────────────────────────────┤
  │ 블로그 유형별 페르소나 가이드                  │
  │  [S급 법률/금융] 전문가적 어조, INFO+COMPARE   │
  │  [A급 건강/교육] 경험 많은 선배 톤, REVIEW+AD  │
  ├──────────────────────────────────────────────┤
  │ 수익 시뮬레이션                               │
  │  월 예상 발행: {N}편                          │
  │  예상 총 수익: 약 {계산값}원                  │
  │  목표 달성 예상 기간: {N}개월                 │
  ├──────────────────────────────────────────────┤
  │ 이번 주 액션 플랜                             │
  │  1. S급 블로그 1개 개설 + 키워드 10개 수집    │
  │  2. 언어 설정 및 발행 스케줄 등록             │
  │  3. 첫 글 5편 자동 발행 확인                  │
  └──────────────────────────────────────────────┘
```

### 역산 계산 로직

```
입력: 목표 월 수익 + 현재 블로그 수 + 주력 카테고리
조건: 98% 자동화 (발행 능력 제한 없음, 품질 검수 통과율 85% 가정)

계산:
1. 카테고리별 평균 CPC 조회:
   - 법률/금융/보험: 12,000원
   - 의료/건강/B2B: 5,000원
   - 교육/여행/부동산: 2,500원
   - 뷰티/패션/식품: 900원

2. 글 1편 평균 수익 = 월 방문자 × CTR 3% × CPC × AdSense 배분율 68%
   (방문자: 월 검색량 × 네이버 CTR 4% 가정)

3. 필요 발행 수 = 목표 수익 / 편당 평균 수익

4. 블로그 등급 구성:
   - S급 (고CPC) → 목표의 60% 담당
   - A급 (고트래픽) → 목표의 30% 담당
   - B급 (계절성) → 목표의 10% 담당

5. 현재 블로그 수 고려:
   - 부족 시: 추가 필요 블로그 수 명시
   - 충분 시: 기존 블로그 최적화 전략 제시
```

### MD 다운로드 버튼

```typescript
// 결과를 마크다운으로 변환 후 파일 다운로드
function downloadGuideAsMD(strategy: RevenueStrategy): void {
  const markdown = generateStrategyMarkdown(strategy)
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `수익화전략_월${strategy.targetKrw}원_${format(new Date(), 'yyyyMMdd')}.md`
  a.click()
}
```

### 구현 위치

```
app/(dashboard)/monetize/page.tsx               — 대시보드에 아코디언 패널 추가
components/monetize/RevenueGuidePanel.tsx        — 아코디언 + 입력 + 결과 컴포넌트
lib/monetize/engines/revenue-calculator.ts       — 역산 계산 로직
app/api/monetize/guide/calculate/route.ts        — 계산 API
```

---

## #10 — SNS 자동 변환 배포

### 개념 정의

> "블로그 글 발행 완료 → 인스타그램 / X / 쓰레드 PASONA 기반 자동 변환 → 예약 발행"
> **핵심**: 전체 답을 주지 않고, P(문제)→A(공감)→S(힌트)까지만 공개하여 블로그 클릭 유도.
> 이미지는 Google Imagen 3 (iPhone 16 Warm Real Photo 프리셋)로 생성.

### 지원 플랫폼

| 플랫폼 | 포맷 특성 | 자동화 방식 |
|--------|---------|------------|
| 인스타그램 | 이미지 + 캡션(최대 2,200자) + 해시태그 | AI 캡션 + 이미지 선택 생성 |
| X (트위터) | 280자 스레드 (3~5개 트윗) | AI 스레드 분해 |
| 쓰레드 | 500자 이내 게시물 (스레드 연결 가능) | AI 요약 게시 + 보충 스레드 |

### 이미지 생성: Google Imagen 3

> **엔진**: Google Imagen 3 (고정 — 선택지 없음)
> **스타일 프리셋**: iPhone 16 Warm Real Photo
> 따뜻한 자연광, 얕은 피사계 심도, 골든아워 색온도, 캔디드 구도의 실사 이미지.
> 텍스트 오버레이 없음. 사람이 실제로 찍은 듯한 라이프스타일 느낌.

```
시스템 기본 스타일 프롬프트 (모든 이미지에 자동 적용):

  "A warm, authentic photograph as if taken with iPhone 16 Pro.
   Natural soft lighting, shallow depth of field,
   warm color temperature (golden hour tone),
   candid and inviting composition. No text overlay.
   Photorealistic, high resolution, lifestyle feel."

플랫폼별 비율:
  인스타그램: 1:1 정방형
  X / 쓰레드: 16:9 가로형

이미지 주제 자동 결정:
  블로그 글 제목 + 키워드 + Intent → Imagen 프롬프트 자동 생성
  예) 키워드 "제주 카페" + Intent AD → "cozy Jeju cafe interior, latte art, warm afternoon light"
```

### SNS PASONA 변환 전략

> **핵심 원칙: "답을 주지 마라, 궁금증을 팔아라"**
> SNS 게시물의 목적은 블로그 글을 요약하는 것이 **아니라**,
> 호기심을 유발하여 블로그로 유입시키는 것.
> PASONA 중 P(문제)→A(공감)→S(힌트)까지만 노출하고,
> O→N→A(행동)은 블로그에서 완성한다.

#### 변환 5원칙

| # | 원칙 | 설명 |
|---|------|------|
| 1 | **절대 전체 답 공개 금지** | 해결책은 "힌트"만 — 전체는 블로그에서 |
| 2 | **P(Problem) 후킹이 80%** | 첫 문장에서 스크롤을 멈추게 한다 |
| 3 | **CTA는 블로그 링크 고정** | "자세한 내용은 프로필 링크에서" / "전체 가이드 👇" |
| 4 | **플랫폼 네이티브 어투** | 인스타=감성, X=임팩트/논쟁, 쓰레드=대화체 |
| 5 | **이미지는 호기심 자극** | 글의 핵심 장면을 따뜻한 실사 스타일로 |

#### 인스타그램 PASONA Format (캡션 1,000자 이내)

```
[P] 후킹 첫 줄 — 스크롤 멈추는 공감 문제 제기 + 이모지 1개
    "솔직히 말해도 될까요?" / "이거 나만 몰랐던 거야?"

[A] 감정 증폭 2~3줄 — 공감 or 위기감
    "저도 3개월 전까지 이걸 몰라서..."
    "모르면 매달 OO만원 손해보는 거라고요"

[S] 해결책 티저 — 핵심 1줄만 힌트 (전체 공개 X)
    "✦ 딱 3가지만 바꿨더니 완전히 달라졌어요"

[O+N→CTA] 블로그 유도 — 긴급성 + CTA
    "📌 전체 방법이 궁금하다면 프로필 링크 클릭"
    "⚡ 이 정보는 곧 바뀔 수 있어요"

---
📍 해시태그 10~15개 (키워드 기반 자동 생성)
```

#### X (트위터) PASONA Thread Format (3~5 트윗)

```
🧵 1/N [P — Hook]
  임팩트 한 줄 문제 제기
  "XX하면 90%가 망하는 이유 🧵"

2/N [A — Agitation]
  "왜 이게 위험한가" 데이터/사례로 위기감 증폭
  구체적 숫자 필수

3/N [S — Solution Teaser]
  해결 포인트 1개만 공개
  "첫 번째 방법은 OO인데요..." (나머지는 블로그에서)

4/N [N — Narrowing]
  시기적 긴급성 or 한정 정보
  "지금 안 하면 늦는 이유"

5/N [A — Action CTA]
  "전체 가이드는 여기서 👇" + 블로그 링크
  + "알아야 할 사람 태그해주세요"
```

#### 쓰레드 PASONA Format (메인 300자 + 보충 2~3개)

```
메인 게시물 [P+A 압축, 300자]
  문제 제기 + 공감 한 덩어리, 대화체
  "이거 진짜 미리 알았으면 좋았을 텐데..."

보충 1 [S — 힌트]
  핵심 해결 포인트 1개만
  "방법은 의외로 간단한데요—"

보충 2 [O+N — 제안+긴급]
  "근데 이건 타이밍이 중요합니다"
  블로그에서만 공개되는 정보 암시

보충 3 [A — CTA]
  "전체 내용 정리해뒀어요 📎" + 블로그 링크
```

#### Intent별 SNS 후킹 전략

| Intent | 후킹 프레이밍 | P(문제) 예시 |
|--------|-------------|-------------|
| AD | "이거 사기 전에 꼭 봐야 해요" | 잘못된 구매 → 후회 |
| REVIEW | "써보니까 진짜 이랬어요" | 기대 vs 현실 갭 |
| INFO | "이거 모르면 손해인 정보" | 무지로 인한 기회 손실 |
| CRITIC | "솔직히 말할게요, 이건 별로" | 대중의 오해 → 진실 |
| COMPARE | "A vs B, 둘 다 써본 결론" | 선택 장애 → 명확한 답 |
| TREND | "지금 난리 난 이유가 있더라" | FOMO (놓치면 후회) |

### 설정 구조 (블로그 설정 > SNS 자동화 탭)

```
[SNS 자동화 설정]

─────────────────────────────────────────
연결된 SNS 계정
─────────────────────────────────────────
□ 인스타그램   [연결하기]   @___________
□ X (트위터)   [연결하기]   @___________
□ 쓰레드       [연결하기]   @___________

─────────────────────────────────────────
이미지 자동 생성 설정
─────────────────────────────────────────
이미지 자동 생성: [ON ●──] / [OFF ──●]

  [ON 선택 시 표시]
  이미지 생성 엔진: Google Imagen 3 (고정)
  스타일 프리셋:   iPhone 16 Warm Real Photo (고정)
  이미지 비율:
    인스타그램: [1:1 정방형] (고정)
    X / 쓰레드: [16:9 가로형] (고정)
  추가 스타일 힌트 (선택):
  ┌────────────────────────────────────┐
  │ (예: 음식 클로즈업, 카페 분위기)    │
  └────────────────────────────────────┘

─────────────────────────────────────────
플랫폼별 PASONA 시스템 프롬프트
─────────────────────────────────────────
※ "답을 주지 마라, 궁금증을 팔아라" 원칙 기반
※ [기본 프롬프트 사용 ▼] [직접 편집] 토글

[인스타그램 — PASONA 캡션 (1,000자)]
┌────────────────────────────────────────────┐
│ 블로그 글을 인스타그램 캡션으로 변환.       │
│ ■ 전체 답을 공개하지 말 것               │
│ ■ 구조:                                  │
│   [P] 첫 줄: 공감 문제 제기 + 이모지 1개  │
│   [A] 2~3줄: 감정 증폭 (공감 or 위기감)  │
│   [S] 1줄: 해결 힌트만 (전체 X)          │
│   [CTA] "📌 프로필 링크에서 전체 확인"    │
│   해시태그 10~15개                        │
│ ■ 어투: 감성체, 이모지 5~8개 자연스럽게   │
│ ■ 전체 1,000자 이내                      │
└────────────────────────────────────────────┘

[X (트위터) — PASONA 스레드 (3~5트윗)]
┌────────────────────────────────────────────┐
│ 블로그 글을 X 스레드로 변환.               │
│ ■ 해결책은 1개만 공개, 나머지는 블로그로   │
│ ■ 구조:                                  │
│   🧵1/N [P] 임팩트 한 줄 + 🧵           │
│   2/N [A] 데이터/숫자로 위기감 증폭       │
│   3/N [S] 해결 포인트 1개만               │
│   4/N [N] "지금 안 하면 늦는 이유"        │
│   5/N [CTA] 블로그 링크 + "전체 가이드 👇"│
│ ■ 어투: 짧고 강렬, 각 270자 이내         │
└────────────────────────────────────────────┘

[쓰레드 — PASONA 대화체 (메인+보충)]
┌────────────────────────────────────────────┐
│ 블로그 글을 쓰레드 게시물로 변환.           │
│ ■ 메인에서 궁금증만, 전체는 블로그에서     │
│ ■ 구조:                                  │
│   메인 [P+A] 문제+공감 압축 (300자)       │
│   보충1 [S] 핵심 포인트 1개 힌트           │
│   보충2 [O+N] 제안+긴급성                 │
│   보충3 [CTA] "전체 내용 📎" + 링크       │
│ ■ 어투: 편한 대화체                       │
└────────────────────────────────────────────┘

─────────────────────────────────────────
자동 발행 설정
─────────────────────────────────────────
발행 트리거:
  ○ 블로그 글 발행 즉시
  ○ N시간 후: [__] 시간
  ○ 수동 승인

Intent별 SNS 배포 조건:
  □ AD형:     인스타 + X + 쓰레드
  □ REVIEW형: 인스타 + 쓰레드
  □ INFO형:   X + 쓰레드
  □ TREND형:  인스타 + X + 쓰레드
  □ CRITIC형: X
  □ COMPARE형: 인스타 + X
```

### AI 변환 파이프라인

```
[블로그 글 발행 완료]
        ↓
[SNS 자동화 트리거 감지]
        ↓
[활성화된 플랫폼별 병렬 처리]

인스타그램:
  1. PASONA 시스템 프롬프트 로드 (P→A→S 티저 + CTA 구조)
  2. AI API (사용자 선택: Claude/GPT/Gemini): 블로그 글 → PASONA 캡션 변환 (전체 답 공개 금지)
  3. [이미지 ON 시] Google Imagen 3: 1:1 이미지 생성 (iPhone 16 Warm Real Photo)
  4. Instagram Graph API: 예약 발행

X (트위터):
  1. PASONA Thread 프롬프트 로드 (P→A→S→N→CTA 구조)
  2. AI API (사용자 선택: Claude/GPT/Gemini): 글 → 3~5개 PASONA 스레드 분해 (해결책 1개만 공개)
  3. Twitter API v2: 스레드 예약 발행

쓰레드:
  1. PASONA 대화체 프롬프트 로드 (P+A 압축 → S 힌트 → CTA)
  2. AI API (사용자 선택: Claude/GPT/Gemini): 글 → 메인(300자) + 보충 PASONA 스레드
  3. Threads API (Meta Graph API): 예약 발행
```

### 데이터 구조

```typescript
// blogs 테이블 settings JSONB 내 SNS 설정
interface BlogSNSSettings {
  imageGeneration: {
    enabled: boolean              // 이미지 자동 생성 ON/OFF
    engine: 'imagen3'             // Google Imagen 3 (고정)
    stylePreset: 'iphone16_warm_photo'  // 기본 프리셋 (고정)
    additionalStyleHint?: string  // 추가 스타일 힌트 (선택)
  }
  platforms: {
    instagram?: {
      accountId: string
      accessToken: string
      formatPrompt: string    // 사용자 정의 포맷 프롬프트
      enabled: boolean
      intentFilter: string[]  // 발행할 Intent 목록
    }
    twitter?: {
      accountId: string
      accessToken: string
      formatPrompt: string
      enabled: boolean
      intentFilter: string[]
    }
    threads?: {
      accountId: string
      accessToken: string
      formatPrompt: string
      enabled: boolean
      intentFilter: string[]
    }
  }
  publishTrigger: 'immediate' | 'delayed' | 'manual'
  delayHours?: number
}

// sns_posts 테이블: SNS 발행 이력
interface SNSPost {
  id: string
  scheduledPostId: string     // 원본 블로그 글
  platform: 'instagram' | 'twitter' | 'threads'
  content: string             // 변환된 SNS 텍스트
  imageUrl?: string           // 생성된 이미지 URL
  status: 'pending' | 'published' | 'failed'
  platformPostId?: string     // 플랫폼 게시물 ID
  publishedAt?: Date
}
```

### 구현 위치

```
app/(dashboard)/blogs/[id]/settings/page.tsx  — SNS 자동화 탭 추가
components/blogs/SNSSettingsTab.tsx           — SNS 설정 컴포넌트
lib/monetize/engines/sns-converter.ts        — 플랫폼별 변환 로직
lib/monetize/apis/instagram-api.ts
lib/monetize/apis/twitter-api.ts
lib/monetize/apis/threads-api.ts
lib/monetize/apis/imagen-api.ts              — Google Imagen 3 (iPhone 16 Warm Real Photo)
app/api/monetize/sns/convert/route.ts
app/api/monetize/sns/publish/route.ts
```

---

## #13 — 쿠팡파트너스 커머스 자동화

### 개념 정의

> "발행 동시에 쿠팡파트너스 링크가 자동 삽입되는 구조"
> 파트너스 ID만 설정하면, AI가 글 내용 분석 → 적합한 상품 추천 → 제휴링크 자동 삽입.

### 설정 구조 (블로그 설정 > 수익화 연동 탭)

```
[수익화 연동 설정]

쿠팡파트너스:
  파트너스 ID:       _______________
  서브 ID (선택):    _______________ (성과 추적용)
  자동 삽입 위치:    ○ 본문 중간 (O 섹션 앞)  ○ 본문 하단
  최대 삽입 개수:    [1개] [2개●] [3개]

  Intent별 삽입 조건:
    [ON]  AD형    ← 구매 유도 글 / 항상 삽입
    [ON]  REVIEW형  ← 제품 리뷰 / 항상 삽입
    [ON]  COMPARE형 ← 비교 글 / 항상 삽입
    [OFF] INFO형    ← 자연스러울 때만 (AI 판단)
    [OFF] CRITIC형  ← 삽입 안 함
    [OFF] TREND형   ← 자연스러울 때만
```

### AI 상품 추천 → 자동 삽입 로직

```
[글 작성 완료 후 후처리]

1. 메인 키워드 + ad_category → 상품 카테고리 추출
2. 쿠팡 검색 API: 리뷰 100+, 평점 4.0+, 로켓배송 조건으로 상위 5개 후보
3. Claude API: "이 글에 가장 자연스러운 상품 1~2개 선택"
4. 쿠팡파트너스 링크 생성:
   https://coupa.ng/{product_id}?affiliate={affiliateId}&subid={subId}
5. PASONA O(Offer) 파트 시작 전 자동 삽입:

   <!-- 쿠팡파트너스 자동 삽입 -->
   **관련 상품**
   [상품명](쿠팡파트너스링크) | 가격 | 평점 ⭐ | 🚀로켓배송
   <!-- END -->
```

### 데이터 구조

```typescript
// blogs 테이블 settings JSONB 내 쿠팡 설정
interface BlogCoupangSettings {
  affiliateId: string
  subId?: string
  maxInsertCount: 1 | 2 | 3
  insertPosition: 'middle' | 'bottom'
  intentFilter: {
    AD: boolean; REVIEW: boolean; COMPARE: boolean
    INFO: boolean; CRITIC: boolean; TREND: boolean
  }
}
```

### 구현 위치

```
app/(dashboard)/blogs/[id]/settings/page.tsx  — 수익화 연동 탭 추가
lib/monetize/apis/coupang-api.ts              — 쿠팡 상품 검색 + 링크 생성
lib/monetize/engines/ai-writer.ts             — 후처리 단계 링크 삽입
app/api/monetize/affiliate/coupang/route.ts   — 상품 추천 API
```

---

## 기능 간 연계 구조

```
[발행 파이프라인]

키워드 탐색
  └→ #15 언어 → 데이터 소스 자동 선택
     └→ 한국어: 네이버 광고 API 1순위
        영어:   Google KWP 1순위
           ↓
AI 글쓰기
  └→ #15 언어로 원어 작성
  └→ #13 쿠팡파트너스 링크 자동 삽입 (Intent 조건 충족 시)
     ※ 영어 블로그: Amazon Associates로 대체 예정
           ↓
발행 완료
  └→ #10 SNS 자동 변환 + 예약 발행
     └→ 인스타그램 / X / 쓰레드
     └→ 이미지 생성 ON 시: 이미지 자동 첨부
           ↓
#4 수익 가이드 (대시보드 아코디언)
  └→ 누적 발행 데이터 반영 → 예측 정확도 개선
```

---

## DB 신규 테이블 목록

| 테이블 | 목적 |
|--------|------|
| `blog_settings` (JSONB 컬럼 확장) | 언어/지역, SNS 설정, 쿠팡 설정 통합 저장 |
| `sns_posts` | SNS 발행 이력 (플랫폼, 콘텐츠, 이미지 URL, 상태) |
| `affiliate_clicks` | 쿠팡파트너스 클릭 추적 (선택) |

---

## 외부 API 추가 목록

| API | 목적 | 인증 | 키 제공 주체 |
|-----|------|------|-------------|
| Instagram Graph API | 인스타그램 발행 | Meta Developer App (OAuth) | 플랫폼 (무료) |
| Twitter API v2 | X 스레드 발행 | OAuth 2.0 | 플랫폼 (무료) |
| Threads API (Meta Graph API) | 쓰레드 발행 | Meta Developer App (OAuth) | 플랫폼 (무료) |
| Google Imagen 3 API | 이미지 생성 (iPhone 16 Warm Real Photo) | Google Cloud API Key | 블로거 (유료) |
| AI API (Claude/GPT/Gemini) | 글쓰기, SNS 변환 | 사용자 선택 API Key | 블로거 (유료) |
| 쿠팡파트너스 API | 상품 검색 + 링크 생성 | 쿠팡파트너스 가입 | 블로거 (무료) |
| Google KWP (JP/TW/TH) | 다국어 키워드 CPC | Google Ads API | 블로거 (무료) |

---

## 미결정 사항

- [ ] #15 영어 블로그 도메인 전략 (기존 .kr 서브경로 vs 별도 .com 도메인)
- [ ] #15 일본어 야후재팬 API 접근 방식 (공식 API 없어 크롤링 검토)
- [ ] #10 인스타그램 비즈니스 계정 연동 필수 여부 (개인 계정 API 제한)
- [ ] #13 영어 블로그 Amazon Associates 연동 구현 시점
- [ ] #4 수익 예측 기준 데이터 (초기 성과 데이터 없을 때 업계 평균값 사용)
- [ ] #4 MD 다운로드 시 영어/일본어 블로그 전략 포함 여부
