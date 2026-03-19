# 수익화 로켓 전략 정의 & 엔진 작동 원리

> 작성일: 2026-03-15 | 버전: 2.0.0
> 수익화 로켓에 적용되는 4-Layer 전략 모델과 4대 엔진의 상세 명세
> **Neurion 확장 기능 (다국어/SNS/쿠팡/수익화가이드):** `09-neurion-features-spec.md` 참조

---

## 전체 전략 맵 — 4-Layer 분리 모델

> **핵심 원칙:** 6대 전략을 동시 적용하면 상호 충돌이 발생한다.
> (예: AEO 완결형 답변 vs 문맥광고 불완전 답변, SEO 키워드 분포 vs AEO 역피라미드)
> 따라서 전략을 4개 레이어로 분리하여 **각 레이어가 독립적 역할**을 수행한다.

```
[키워드 탐색] ──────────── Revenue Score 전략
     ↓
[키워드 클러스터링] ──────── 클러스터링 × Intent 전략
     ↓
[AI 글쓰기 4-Layer 적용]
  Layer 1 (골격):  PASONA × Intent ──── 글의 뼈대 (Intent별 가중치)
  Layer 2 (발견):  SEO + AEO/GEO ───── 검색엔진·AI엔진 노출 오버레이
  Layer 3 (수익):  문맥광고 ─────────── 광고 섹션 후처리 삽입
  Layer 4 (브랜드): REO/E-E-A-T ────── 블로그 단위 장기 신뢰 (글별 X)
     ↓
[검수 & 발행] ───────────── 품질 검수 엔진 (검수 A / 검수 B)
     ↓
[배분 & 스케줄] ─────────── 배분 엔진
```

### Layer 구분 원칙

| Layer | 범위 | 적용 시점 | 책임 |
|-------|------|----------|------|
| **L1 PASONA × Intent** | 글 1편 | 프롬프트 생성 시 | 설득 구조 (뼈대) |
| **L2 SEO + AEO/GEO** | 글 1편 | 프롬프트 + 후처리 | 발견 최적화 (오버레이) |
| **L3 문맥광고** | 글 1편 | 후처리 전용 | 수익 전환 (삽입) |
| **L4 REO/E-E-A-T** | 블로그 전체 | 블로그 등급 평가 시 | 장기 브랜드 신뢰 |

> **GEO는 AEO에 통합:** AI 생성 검색(ChatGPT, Gemini) 소스 채택 = AEO FAQ 구조 + Schema.org → 동일 레이어
> **REO는 블로그 단위:** E-E-A-T 신호는 글 1편이 아닌 블로그 전체 평판 → L4로 분리, 글별 검수에서 제외

---

## 전략 1: Revenue Score 전략 (키워드 수익성 평가)

### 개념
키워드의 광고 수익 잠재력을 4가지 차원에서 정량화하여 등급화하는 시스템.
단순 검색량이 아닌 **실제 수익 기대치**를 기준으로 키워드 우선순위를 결정한다.

### 계산 공식

```
Revenue Score (0~100) =
  Traffic Score    (25%) : 월간 검색량 정규화
  Revenue Score    (40%) : 예상 CPC × 클릭 예상률
  Difficulty Score (25%) : (1 - 경쟁도) 역산
  Trend Bonus      (10%) : DataLab 트렌드 지수

등급 기준:
  S등급: 90점 이상  → 최우선 배정, S/A등급 블로그 전담
  A등급: 75~89점   → 우선 배정, A/B등급 블로그
  B등급: 60~74점   → 일반 배정
  C등급: 45~59점   → 저우선, 신규 블로그 연습용
  D등급: 44점 이하 → 보류 또는 폐기
```

### 데이터 소스 (우선순위 적용)

> **데이터 소스 3단계 우선순위:**
> - **1순위: 네이버 광고 API** — 한국어 월간 검색량 + 경쟁도 (`compIdx`)
> - **2순위: Google KWP (Keyword Planner)** — CPC 단가 (애드센스 수익 핵심 지표)
> - **3순위: 네이버 DataLab** — 계절성 트렌드 + YoY 성장률

| 지표 | 우선순위 | API | 갱신 주기 |
|------|----------|-----|-----------|
| 월간 검색량 (PC+모바일) | **1순위** | 네이버 광고 API (`monthlyPcQcCnt` + `monthlyMobileQcCnt`) | 일 1회 |
| 경쟁도 (`compIdx`) | **1순위** | 네이버 광고 API | 일 1회 |
| 예상 CPC (애드센스 수익 핵심) | **2순위** | Google KWP (`high_top_of_page_bid_micros` ÷ 1,000,000 × 환율) | 일 1회 |
| 트렌드 지수 + 계절성 | **3순위** | 네이버 DataLab (2년치 상대 검색량 지수) | 실시간 |

> **CPC 주의사항:** 애드센스 수익은 구글 광고 네트워크 기반이므로 CPC는 반드시 Google KWP 기준으로 산출해야 한다.
> 네이버 광고 API의 CPC는 네이버 검색광고 입찰가로, 애드센스 수익과 직접 연결되지 않는다.

### 구현 위치
`lib/monetize/engines/keyword-scorer.ts`

```typescript
export function calculateRevenueScore(keyword: RawKeywordData): number {
  // Traffic Score: 1순위 네이버 광고 API 검색량 기준 (한국어 키워드 ~65% 네이버 점유율)
  const trafficScore = normalizeSearchVolume(keyword.naverPcVolume + keyword.naverMobileVolume) * 0.25
  // Revenue Score: 2순위 Google KWP CPC 기준 (애드센스 수익은 구글 광고 네트워크에서 발생)
  const revenueScore = normalizeCPC(keyword.googleCpcKrw) * 0.40
  // Difficulty Score: 1순위 네이버 광고 API compIdx + 2순위 Google KWP competition 교차 검증
  const difficultyScore = (1 - keyword.competition) * 0.25
  // Trend Bonus: 3순위 네이버 DataLab 상대 검색량 지수 (계절성 + YoY 성장률)
  const trendBonus = normalizeTrend(keyword.datalabTrendIndex) * 0.10
  return Math.round((trafficScore + revenueScore + difficultyScore + trendBonus) * 100)
}

export function assignGrade(score: number): Grade {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}
```

---

## 전략 2: 키워드 클러스터링 × Intent 분류 전략

### 개념
하나의 Seed 키워드에서 8~12개의 연관 키워드를 Intent별로 클러스터링하여,
단일 키워드로 여러 글을 체계적으로 작성하는 전략.
Intent별로 다른 PASONA 가중치를 적용해 맥락에 맞는 글쓰기를 보장한다.

### Intent 6가지 분류

| Intent | 의도 | 특징 | 고CPC 가능성 |
|--------|------|------|-------------|
| AD | 광고성/구매 유도 | "추천", "최고", "구매" 포함 | 매우 높음 |
| REVIEW | 솔직 리뷰 탐색 | "후기", "사용기", "실제" 포함 | 높음 |
| INFO | 정보 탐색 | "방법", "이유", "원인" 포함 | 중간 |
| CRITIC | 비판적 정보 탐색 | "부작용", "단점", "주의" 포함 | 중간 |
| COMPARE | 비교 탐색 | "vs", "차이", "비교" 포함 | 높음 |
| TREND | 트렌드/뉴스 탐색 | "최신", "2026", "신제품" 포함 | 낮음 |

### 클러스터 생성 로직

```
Seed 키워드: "다이어트 보조제"
    ↓
[AD 클러스터]
  - "다이어트 보조제 추천 2026"
  - "체지방 감소 영양제 효과 좋은 것"
  - "다이어트 약 판매 순위"

[REVIEW 클러스터]
  - "다이어트 보조제 후기 실제 효과"
  - "OOO 체지방 연소제 3개월 솔직 후기"

[INFO 클러스터]
  - "다이어트 보조제 종류 및 효능"
  - "체지방 감소 원리 쉽게 설명"

[COMPARE 클러스터]
  - "가르시니아 vs 카르니틴 비교"
  - "다이어트 보조제 가격대별 비교"
```

### AI 클러스터 생성 프롬프트 (Claude API)

```
당신은 블로그 SEO 전문가입니다.
Seed 키워드: {seed_keyword}
타겟 플랫폼: {platform} (네이버/구글)
광고 카테고리: {ad_category}

다음 6가지 Intent 각각에 맞는 연관 키워드를 2개씩 생성해주세요.
Intent: AD, REVIEW, INFO, CRITIC, COMPARE, TREND

각 키워드는:
1. 월간 검색량 1,000 이상 예상
2. Seed 키워드와 주제적 연관성 보유
3. 해당 Intent의 검색 의도 명확히 반영

출력 형식: JSON 배열
[{"intent": "AD", "keyword": "...", "reason": "..."}]
```

### 구현 위치
`lib/monetize/engines/keyword-scorer.ts` (클러스터 생성)

---

## 전략 3: PASONA 전략 (AI 자동 글쓰기 프레임워크) — Layer 1

### 개념
Problem → Agitation/Affinity → Solution → Offer → Narrow → Action 구조에
Intent별 가중치를 다르게 적용해 맥락 최적화된 글을 자동 생성한다.

> **A(2번째) 단계 정의 — Intent에 따라 다른 해석:**
> - AD / CRITIC → **Agitation** (공감 + 불안 자극 → 구매/행동 유도)
> - INFO / REVIEW / COMPARE / TREND → **Affinity** (공감 + 친근함 → 신뢰 구축)

### PASONA 구조 × Intent별 가중치

| PASONA 요소 | AD형 | REVIEW형 | INFO형 | CRITIC형 | COMPARE형 | TREND형 |
|-------------|------|----------|--------|----------|-----------|---------|
| Problem(문제 제기) | 20% | 15% | 30% | 25% | 20% | 25% |
| Affinity(공감 확대) | 15% | 10% | 15% | 20% | 10% | 20% |
| Solution(해결책) | 20% | 25% | 35% | 30% | 25% | 30% |
| Offer(제안) | 30% | 20% | 5% | 5% | 20% | 5% |
| Narrow(범위 제한) | 10% | 15% | 10% | 15% | 15% | 10% |
| Action(행동 유도) | 20% | 15% | 5% | 5% | 10% | 10% |

> **TREND형 설계 근거**: 트렌드 키워드는 정보 전달(P+S=55%)이 핵심이되, 시의성으로 인한 공감(A=20%)이 중요. Offer/Action이 낮은 이유는 트렌드 글은 직접 구매 유도보다 트래픽 확보가 목적이기 때문.

### AI 글쓰기 프롬프트 템플릿

```
당신은 한국 상위 1% 블로거입니다.

[기본 정보]
키워드: {keyword}
Intent: {intent_type}
블로그 광고 카테고리: {ad_category} (이 카테고리 고CPC 광고 유도)
목표 글자수: 1,500자 이상

[PASONA 구조 가이드]
{intent별 가중치 적용 지시}

[SEO 요구사항]
- 제목(H1): 키워드 포함, 35자 이내
- 소제목(H2, H3): 키워드 변형 포함
- 키워드 밀도: 1~2%
- 내부 링크: 2개 이상 (관련 이전 글)
- 이미지 alt 태그: 키워드 포함

[AEO — 글 하단 FAQ 아코디언 (Layer 2)]
본문 끝에 FAQ 아코디언 섹션을 별도 배치하세요:
- <details><summary> 태그로 접힌 상태의 FAQ 3개 작성
- 각 답변: 80~120자(한국어 기준, 2~3문장) 명확한 답변
- 숫자/통계 최소 2개 포함 (AI 인용 가능성 향상)
- ⚠️ PASONA 본문과 분리 — FAQ는 본문 이후 별도 H2 "자주 묻는 질문" 아래 배치

[광고 섹션 타겟팅 (Layer 3 — 후처리)]
고수익 광고 유도를 위해:
<!-- google_ad_section_start -->
{ad_category} 관련 핵심 내용 (Solution~Narrow 영역)
<!-- google_ad_section_end -->
태그로 고CPC 섹션 감싸기 (광고 비율 < 30%)

[출력 형식]
마크다운 형식으로 완성된 블로그 글 작성
구조: PASONA 본문 → H2 "자주 묻는 질문" + FAQ 아코디언
```

### 고CPC 광고 카테고리별 글쓰기 전략

| 등급 | 카테고리 | CPC 범위 | 글쓰기 전략 |
|------|----------|----------|-------------|
| S | 법률/금융/보험 | 5,000~30,000원 | 전문 용어 + 서비스 비교 + CTA 강화 |
| A | 의료/건강/B2B | 2,000~10,000원 | 신뢰성 + E-E-A-T + 증거 기반 |
| B | 교육/여행/부동산 | 1,000~5,000원 | 경험담 + 구체적 정보 + 비교 |
| C | 뷰티/패션/식품 | 500~2,000원 | 감성적 글쓰기 + 이미지 최적화 |

### 구현 위치
`lib/monetize/engines/ai-writer.ts`
`lib/monetize/apis/claude-api.ts`

---

## 전략 4: SEO 전략 — Layer 2

### 개념
검색 엔진(특히 네이버/구글)에서 상위 노출을 위한 온페이지 최적화 전략.
AI 글쓰기 출력물에 자동 적용된다. (AEO/GEO와 함께 Layer 2 — 발견 최적화)

### SEO 체크리스트 (검수 점수 반영)

```
[메타데이터 최적화] (5점)
  □ 제목(H1): 주요 키워드 포함, 35자 이내
  □ 메타 디스크립션: 키워드 포함, 120~160자
  □ URL 슬러그: 키워드 기반 (영문 또는 한글)

[콘텐츠 구조] (7점)
  □ H2 소제목: 2~4개, 키워드 변형 포함
  □ H3 소제목: 각 H2 아래 1~3개
  □ 키워드 밀도: 1~2% (과적 방지)
  □ 글자수: 1,500자 이상
  □ 첫 문단: 키워드 자연 포함

[링크 최적화] (4점)
  □ 내부 링크: 관련 이전 글 2개 이상
  □ 외부 링크: 신뢰할 수 있는 출처 1개 이상

[이미지 최적화] (4점)
  □ 대표 이미지 1개 이상
  □ alt 태그: 키워드 포함
  □ 파일명: 키워드 기반
```

### 네이버 SEO 특화 규칙

```
네이버 저품질 필터 회피:
  - 중복 콘텐츠 0% (AI 생성 후 독창성 체크)
  - 광고 과다 방지 (광고 섹션 비율 < 30%)
  - 최소 글자수: 1,000자 이상
  - 사진 최소 1장 이상
  - 외부 링크 과다 방지 (3개 이하)

네이버 상위 노출 신호:
  - 블로그 지수 관리 (방문자 수, 이웃 수)
  - 발행 시간: 새벽 6시 (코어타임)
  - 카테고리 정확한 분류
```

### 구현 위치
`lib/monetize/engines/quality-checker.ts` (SEO 점수 계산)

---

## 전략 5: AEO/GEO 통합 전략 (AI 검색 최적화) — Layer 2

> **GEO(Generative Engine Optimization)는 AEO에 통합.**
> AI 생성 검색에서 소스로 인용되는 조건 = AEO FAQ 구조 + Schema.org → 동일 기술 스택.

### 개념
AI 검색 엔진(ChatGPT, Perplexity, 네이버 AI 검색, Gemini)에서 답변으로 채택될 확률을 높이는 전략.
구조화된 Q&A + 명확한 답변 + Schema.org 마크업이 핵심.

### AEO 구현 요소 — 글 하단 FAQ 아코디언 + JSON-LD

> **⚠️ 중요: AEO 콘텐츠는 글 본문(PASONA)과 분리 배치해야 한다.**
> PASONA는 설득형 구조(불완전 → 행동 유도)이고, AEO는 완결형 답변이므로 동일 영역에 배치하면 충돌한다.
> **절대 금지: `display:none`, `visibility:hidden` 등 숨김 처리 → 구글 클로킹 패널티 대상**

```
[글 본문 구조 — PASONA body]
  P → A → So → O → N → A (설득 흐름 유지)

[글 하단 FAQ 아코디언 — AEO 전용 영역]
  <details> 태그로 접힌 상태 배치 (사람: 선택적 열람, AI: 전체 인덱싱)
  핵심 질문 3개 + 각 질문에 80~120자(2~3문장) 명확한 답변
  숫자/통계 포함 (AI 인용 가능성 향상)

[JSON-LD Schema — 보이지 않지만 100% 합법]
  FAQPage Schema: Q&A 구조화 데이터
  Article Schema: 작성자, 날짜, 출판사 명시
  HowTo/Product Schema: 글 유형에 따라 적용
```

### FAQ 아코디언 HTML 구조

```html
<!-- 글 본문 (PASONA) 끝 -->

<h2>자주 묻는 질문</h2>
<details>
  <summary>다이어트 보조제 부작용이 있나요?</summary>
  <p>일부 보조제는 소화 불량, 두근거림이 나타날 수 있습니다.
  임상 연구에서 전체 피험자의 12%가 경미한 위장 불편을 보고했으며,
  가르시니아 기반 제품은 FDA에서 안전성을 확인한 바 있습니다.</p>
</details>
<details>
  <summary>다이어트 보조제 효과는 얼마나 걸리나요?</summary>
  <p>일반적으로 12주(3개월) 꾸준한 복용 시 평균 3.2kg 감소 효과가 나타납니다.
  단, 운동 병행 시 효과가 2배 이상 증가합니다.</p>
</details>
```

> **핵심:** `<details>` 태그는 접힌 상태에서도 구글/AI가 전체 내용을 인덱싱한다.
> 사람은 관심 있는 질문만 클릭하여 열람하므로 PASONA 설득 흐름을 방해하지 않는다.

### JSON-LD Schema 자동 생성

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "다이어트 보조제 부작용이 있나요?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "일부 보조제는 소화 불량, 두근거림이 나타날 수 있습니다..."
    }
  }]
}
```

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "다이어트 보조제 추천 2026 TOP 5",
  "author": { "@type": "Person", "name": "{blog_persona}" },
  "datePublished": "{publish_date}",
  "dateModified": "{modify_date}"
}
```

### AI 글쓰기 AEO 프롬프트 지시

```
AEO 최적화를 위해 글 하단에 FAQ 아코디언 섹션을 추가하세요:
1. 핵심 질문 3개 도출 (독자가 가장 궁금한 것)
2. 각 질문에 80~120자(2~3문장) 명확한 답변 작성 (한국어 기준)
3. <details><summary> 태그로 접힌 상태 배치
4. 숫자, 통계, 연구 결과 최소 2개 인용
5. JSON-LD FAQPage + Article Schema 자동 생성 (후처리)
```

### GEO 기술 규칙 (AEO에 통합 적용)

```
AI 인용 최적화 텍스트 패턴 (본문 내 자연 배치):
  - "결론적으로, {주제}은 {핵심 내용}입니다."
  - "핵심 요약: {3가지 이내 불릿포인트}"
  - 1-3-5 법칙: 1문장 핵심답변, 3개 근거, 5개 실행 단계

구조화 데이터 (Schema.org — 후처리 자동 생성):
  - Article Schema: 작성자, 날짜, 출판사 명시
  - FAQPage Schema: Q&A 구조화 (FAQ 아코디언과 1:1 매핑)
  - HowTo Schema: 단계별 가이드에 적용
  - Product Schema: 제품 리뷰에 적용
```

---

## 전략 6: REO 전략 (Reputation Engine Optimization) — Layer 4 (블로그 단위)

> **⚠️ REO는 글 1편이 아닌 블로그 전체에 적용되는 장기 브랜드 전략이다.**
> 블로그 등급(S/A/B/C/D) 평가 시 REO 지표를 반영하며, 개별 글 검수에서는 REO를 채점하지 않는다.

### 개념
**REO**: 평판 신호를 쌓아 AI 모델이 내 블로그를 신뢰할 수 있는 출처로 인식하게 하는 전략.
E-E-A-T 신호는 글 하나가 아닌 블로그 전체의 누적 평판으로 구축된다.

### E-E-A-T 블로그 단위 평가 지표

```
Experience (경험) — 블로그 전체:
  - 직접 경험 서술이 포함된 글 비율
  - 사진/영상 원본 콘텐츠 비율
  - 일관된 주제 카테고리 집중도

Expertise (전문성) — 블로그 전체:
  - 전문 용어 사용 일관성
  - 참고 문헌/출처 명시 비율
  - 카테고리 내 글 수 (깊이)

Authoritativeness (권위성) — 블로그 전체:
  - 외부 백링크 수 및 품질
  - 인용/언급 빈도
  - 블로그 운영 기간

Trustworthiness (신뢰성) — 블로그 전체:
  - 게시 날짜 / 수정 날짜 표시 비율
  - 작성자 정보 일관성
  - 오류/편향 신고 이력 (없을수록 높음)
```

### REO와 블로그 등급 연동

```
블로그 등급 산정 시 REO 반영:
  Revenue Score (키워드 기반) + REO Score (E-E-A-T 누적) = 블로그 종합 등급

REO Score는 월 1회 자동 재평가:
  - 지난 30일 발행 글의 E-E-A-T 신호 집계
  - 외부 백링크 변동 추적
  - 카테고리 집중도 변화 감지
```

---

## 엔진 1: 배분 엔진 (Distribution Engine)

### 역할
탐색된 키워드를 등록된 복수의 블로그에 최적화된 날짜와 시간으로 자동 배분하는 시스템.
블로그 등급, 키워드 등급, **Intent 유형**, 하루 쿼터, 날짜/시간 분산 규칙을 모두 고려한다.

---

### Intent Priority Score (IPS) — 배분 우선순위 가중치

> **핵심 원칙**: 같은 KeywordGrade라도 Intent에 따라 CPC 잠재력이 다르다.
> AD형 S급 키워드와 TREND형 S급 키워드를 동일하게 S급 블로그에 70% 배정하면 수익이 비효율적.
> Intent별 "수익 기여 가중치(IPS)"를 적용하여 **고수익 Intent일수록 고등급 블로그에 집중**시킨다.

```
Intent Priority Score (IPS) — 배분 시 정렬 가중치

| Intent   | IPS | 근거                           | 적합 블로그 등급 |
|----------|-----|-------------------------------|----------------|
| AD       | 1.0 | 구매 직전 → CPC 최고            | S > A          |
| COMPARE  | 0.9 | 비교 후 구매 → CPC 매우 높음     | S > A          |
| REVIEW   | 0.7 | 구매 판단 참고 → CPC 높음        | A > S          |
| CRITIC   | 0.5 | 신중한 탐색 → CPC 중간           | A > B          |
| INFO     | 0.4 | 정보 수집 → CPC 중간, 트래픽 높음 | B > A          |
| TREND    | 0.2 | 트렌드 탐색 → CPC 낮음, 트래픽용  | B > NEW        |

적용 공식:
  배분 우선순위 = KeywordGrade 순위 × IPS
  → 같은 S급 키워드라도 AD형(IPS 1.0)이 TREND형(IPS 0.2)보다 먼저 S급 블로그에 배정
```

---

### Intent × BlogGrade 배분 적합도 매트릭스 ★

> 기존 KeywordGrade × BlogGrade 매트릭스(PRD.md 4-3-1)와 **교차 적용**.
> KeywordGrade 매트릭스로 1차 후보군을 걸러낸 뒤, Intent 적합도로 2차 정렬.

```
          S급 블로그    A급 블로그    B급 블로그    NEW 블로그
AD        ★★★ 최적    ★★ 양호      ★ 가능       ✗ 부적합
COMPARE   ★★★ 최적    ★★ 양호      ★ 가능       ✗ 부적합
REVIEW    ★★ 양호     ★★★ 최적     ★ 가능       ✗ 부적합
CRITIC    ★ 가능      ★★★ 최적     ★★ 양호      ✗ 부적합
INFO      ★ 가능      ★★ 양호      ★★★ 최적     ★ 가능
TREND     ✗ 부적합    ★ 가능       ★★★ 최적     ★★ 양호

설계 근거:
- AD/COMPARE: 구매 의도가 높아 고CPC 광고 배정이 안정된 S급에서 수익 극대화
- REVIEW: 신뢰 기반 콘텐츠 → A급(성장 중)에서 E-E-A-T 신호 강화에 최적
- CRITIC: 비판적 관점 → 일정 신뢰도가 필요하나 S급까지는 불필요 → A급 최적
- INFO: 트래픽 유입형 → B급 블로그의 트래픽 확보(session_score↑)에 최적
- TREND: 시의성 높고 수명 짧음 → B/NEW급 블로그 실적 씨앗으로 활용
- S급 블로그에 TREND 배정 금지: 저CPC 콘텐츠로 카테고리 일관성 훼손 방지
- NEW 블로그에 AD/COMPARE/REVIEW/CRITIC 배정 금지: 신뢰도 부족으로 전환율 낮음
```

---

### 작동 원리 (개선된 6단계)

```
Step 1: 입력 데이터 정렬 ★ Intent 반영
  - 키워드: (KeywordGrade 순위 × IPS) 내림차순
    예: S급+AD(IPS 1.0) → S급+COMPARE(0.9) → S급+REVIEW(0.7) → A급+AD(1.0) → ...
  - 블로그: 등급 내림차순 + 하루 쿼터 여유분 내림차순

Step 2: 카테고리 필터 + 경고 제외
  - cluster.adCategory == blog.primaryAdCategory 인 블로그만 후보군
  - blog_grade == 'warning' → 즉시 제거

Step 3: 등급 매트릭스 적용 (1차 필터)
  - KeywordGrade × BlogGrade 비율표(PRD.md 4-3-1) 기준 허용 비율 0% → 제거
  - 쿼터 한도 체크 → 초과 시 제거

Step 4: Intent 적합도 적용 (2차 정렬) ★ 신규
  - 1차 필터 통과한 후보 블로그를 Intent 적합도 매트릭스 기준으로 재정렬
  - ★★★ 최적 → ★★ 양호 → ★ 가능 순
  - ✗ 부적합은 후보에서 제거
    (예: TREND 키워드 → S급 블로그 후보군에서 제거)
    (예: AD 키워드 → NEW 블로그 후보군에서 제거)

Step 5: 날짜 + 시간 배분
  - 동일 키워드: 블로그별 최소 3일 간격
  - 동일 블로그: 하루 최대 쿼터(daily_quota) 초과 불가
  - 같은 날 여러 블로그: 60~120분 랜덤 간격
  - 쿼터 초과 시: 다음 가용 날짜로 자동 밀기

Step 6: 최종 선택 + 기록
  - 남은 후보 중 1위 선택 (Intent 적합도 동점이면 blog_score 내림차순)
  - 배정 기록: blog_id, keyword_id, intent_type, scheduled_date, matchReason
```

---

### 배분 알고리즘

```typescript
// Intent Priority Score
const INTENT_PRIORITY: Record<IntentType, number> = {
  AD: 1.0, COMPARE: 0.9, REVIEW: 0.7,
  CRITIC: 0.5, INFO: 0.4, TREND: 0.2
}

// Intent × BlogGrade 적합도 (3=최적, 2=양호, 1=가능, 0=부적합)
const INTENT_BLOG_FIT: Record<IntentType, Record<BlogGrade, number>> = {
  AD:      { S: 3, A: 2, B: 1, NEW: 0 },
  COMPARE: { S: 3, A: 2, B: 1, NEW: 0 },
  REVIEW:  { S: 2, A: 3, B: 1, NEW: 0 },
  CRITIC:  { S: 1, A: 3, B: 2, NEW: 0 },
  INFO:    { S: 1, A: 2, B: 3, NEW: 1 },
  TREND:   { S: 0, A: 1, B: 3, NEW: 2 },
}

interface DistributionResult {
  assignments: Array<{
    blogId: string
    keywordId: string
    intentType: IntentType        // ★ Intent 기록 추가
    intentFitScore: number        // ★ 적합도 점수 기록
    scheduledDate: Date
    scheduledTime: string
    matchReason: string
  }>
  unassigned: string[]
  warnings: string[]
}

function runDistributionEngine(
  keywords: KeywordWithScore[],
  blogs: BlogWithGrade[],
  dateRange: DateRange
): DistributionResult {
  // Step 1: Intent 반영 우선순위 정렬
  const sorted = keywords.sort((a, b) => {
    const priorityA = gradeToNumber(a.grade) * INTENT_PRIORITY[a.intentType]
    const priorityB = gradeToNumber(b.grade) * INTENT_PRIORITY[b.intentType]
    return priorityB - priorityA
  })

  const assignments = []

  for (const keyword of sorted) {
    // Step 2: 카테고리 + 경고 필터
    let eligible = blogs
      .filter(b => b.primaryAdCategory === keyword.adCategory)
      .filter(b => b.grade !== 'warning')

    // Step 3: KeywordGrade × BlogGrade 매트릭스 (1차)
    eligible = eligible
      .filter(b => getMatrixRatio(keyword.grade, b.grade) > 0)
      .filter(b => hasQuotaAvailable(b, keyword.grade, assignments))

    // Step 4: Intent 적합도 (2차) ★
    eligible = eligible
      .filter(b => INTENT_BLOG_FIT[keyword.intentType][b.grade] > 0)  // 부적합 제거
      .sort((a, b) => {
        const fitDiff = INTENT_BLOG_FIT[keyword.intentType][b.grade]
                      - INTENT_BLOG_FIT[keyword.intentType][a.grade]
        if (fitDiff !== 0) return fitDiff  // 적합도 우선
        return b.blogScore - a.blogScore   // 동점이면 blog_score
      })

    if (eligible.length === 0) {
      unassigned.push(keyword.id)
      continue
    }

    // Step 5~6: 날짜/시간 배분 + 기록
    const blog = eligible[0]
    const date = findNextAvailableDate(blog, dateRange, assignments)
    const time = assignRandomTime(blog, date, assignments)

    assignments.push({
      blogId: blog.id,
      keywordId: keyword.id,
      intentType: keyword.intentType,
      intentFitScore: INTENT_BLOG_FIT[keyword.intentType][blog.grade],
      scheduledDate: date,
      scheduledTime: time,
      matchReason: `${keyword.grade}급 키워드(${keyword.intentType}) → ${blog.grade}급 블로그(적합도 ${INTENT_BLOG_FIT[keyword.intentType][blog.grade]})`
    })
  }

  return { assignments, unassigned, warnings }
}
```

### 구현 위치
`lib/monetize/engines/distribution-engine.ts`

---

## 엔진 2: 품질 검수 엔진 (Quality Checker)

### 역할
AI가 작성한 글을 키워드 유형에 따라 다른 채점표로 점수화하여 자동 발행(45점+) 또는 보류(45점 미만)를 결정하는 시스템.

> **키워드 유형별 검수 체계 분리:**
> - 골드/시즌 키워드 → **검수 A** (3축 균형 검수)
> - 이벤트 키워드 → **검수 B** (이벤트 고유 + 공통 기술 검수)
> - 공통: 50점 만점, 45점 이상 자동 발행

### 검수 A — 골드/시즌 키워드 (3축 균형 채점표)

> 적용 대상: `keyword_type = 'gold' | 'seasonal'`

```
총점: 50점 만점 → 45점 이상 자동 발행

[축1] 발견 최적화 (0~17점)
  SEO 기본 (10점):
    메타태그 완성도:     3점  제목 35자+키워드(2), 메타설명 120~160자(1)
    키워드 밀도:         3점  1~2% 범위(3), 이탈(0)
    구조 최적화:         2점  H2 2개+(1), H3 포함(1)
    링크/이미지:         2점  내부링크 2개+(1), 이미지 alt(1)
  AI 검색 최적화 (7점):
    FAQ 아코디언:        3점  <details> 태그 FAQ 3개 이상(2), 답변 80~120자(1)
    JSON-LD Schema:     2점  FAQPage(1) + Article(1) Schema 포함
    숫자/통계 인용:      2점  구체적 수치 2개 이상 포함

[축2] 설득 품질 (0~18점)
  PASONA 구조 (8점):
    6요소 모두 포함:     5점  1개 누락시 -1점
    Intent별 가중치 준수: 3점  AD: O 30%+, INFO: So 35%+ 등
  Intent 정합성 (5점):
    선택 Intent 목적 달성: 5점  글 내용이 Intent에 부합하는가
  가독성 (5점):
    평균 문장 길이:      2점  40자 이내
    단락 당 줄 수:       2점  5줄 이내
    리스트/불릿 포함:    1점

[축3] 수익 전환 (0~15점)
  광고 섹션 (8점):
    ad_section 태그:     4점  google_ad_section_start/end 정확 배치
    고CPC 키워드 밀집:   2점  ad_section 내부에 광고 카테고리 키워드 집중
    광고 비율 적정:      2점  광고 섹션 비율 < 30% (네이버 저품질 방지)
  전환 유도 (7점):
    CTA 포함:           3점  Action 섹션에 명확한 행동 유도 존재
    내부 링크 동선:      2점  관련 글/서비스 연결
    독창성:             2점  중복률 0~20%(2), 20~40%(1), 40%+(0)

합계: 17 + 18 + 15 = 50점 → 45점 이상 자동 발행
```

### 검수 B — 이벤트 키워드 (이벤트 고유 + 공통 기술)

> 적용 대상: `keyword_type = 'event'`
> 이벤트 키워드는 D-Day 기반 글쓰기 로직이 다르므로 별도 채점표.

```
총점: 50점 만점 → 45점 이상 자동 발행

[이벤트 고유 항목] (0~35점)
  Intent 목적 달성:      8점  해당 Intent(AD/REVIEW/INFO 등) 목적을 콘텐츠가 충족하는가
  PASONA 비중 준수:      7점  Intent별 가중치(AD: O 30%, A 20% 등)가 실제 반영되었는가
  필수 포함 요소 완비:    7점  D-Day 시점별 필수 요소 (D-45: 예매 링크, D+1: 후기 등)
  금지 요소 미포함:       7점  논란 인물, 허위 정보, 과대 광고 등 블랙리스트
  페르소나 톤앤매너:      6점  블로그 AI 캐릭터 설정과 어조 일치 여부

[공통 기술 항목] (0~15점)
  SEO 준수:              5점  메타태그+키워드(2), 키워드밀도 1~2%(2), H2/H3 구조(1)
  AI 검색 최적화:        5점  FAQ 아코디언(2), 핵심답변 80~120자(2), Schema 마크업(1)
  문맥광고 코드 준수:     5점  ad_section 태그 정확 배치(2), 고CPC 밀집(2), 광고비율 < 30%(1)

합계: 35 + 15 = 50점 → 45점 이상 자동 발행
```

### 자동 검수 프로세스

```typescript
async function runQualityCheck(
  postContent: string,
  keyword: string,
  intent: IntentType,
  keywordType: KeywordType
): Promise<QualityScore> {
  if (keywordType === 'event') {
    return runEventCheck(postContent, keyword, intent)  // 검수 B
  }
  return runStandardCheck(postContent, keyword, intent)  // 검수 A
}

// 검수 A — 골드/시즌
async function runStandardCheck(postContent: string, keyword: string, intent: IntentType): Promise<QualityScore> {
  const discoveryScore = await checkDiscovery(postContent, keyword)    // 축1: 발견 (0~17)
  const persuasionScore = await checkPersuasion(postContent, intent)   // 축2: 설득 (0~18)
  const conversionScore = await checkConversion(postContent, intent)   // 축3: 수익 (0~15)
  const total = discoveryScore + persuasionScore + conversionScore

  return {
    discoveryScore,
    persuasionScore,
    conversionScore,
    totalScore: total,
    autoPublish: total >= AUTO_PUBLISH_THRESHOLD,
    reviewReason: total < AUTO_PUBLISH_THRESHOLD
      ? generateReviewReason(discoveryScore, persuasionScore, conversionScore)
      : null
  }
}

// 검수 B — 이벤트
async function runEventCheck(postContent: string, keyword: string, intent: IntentType): Promise<QualityScore> {
  const eventScore = await checkEventSpecific(postContent, keyword, intent)  // 이벤트 고유 (0~35)
  const techScore = await checkCommonTech(postContent, keyword)              // 공통 기술 (0~15)
  const total = eventScore + techScore

  return {
    eventScore,
    techScore,
    totalScore: total,
    autoPublish: total >= AUTO_PUBLISH_THRESHOLD,
    reviewReason: total < AUTO_PUBLISH_THRESHOLD
      ? generateEventReviewReason(eventScore, techScore)
      : null
  }
}
```

### 구현 위치
`lib/monetize/engines/quality-checker.ts` (Strategy 패턴 — 키워드 유형별 분기)
`lib/monetize/engines/checkers/standard-checker.ts` (검수 A)
`lib/monetize/engines/checkers/event-checker.ts` (검수 B)

---

## 엔진 3: 키워드 탐색 엔진 (Keyword Discovery Engine)

### 역할
3가지 탐색 모드로 수익성 높은 키워드를 자동 발굴하는 시스템.

### 모드 1: 골드 키워드 탐색

```
입력: 검색어 (사용자 입력)
프로세스:
  1. [1순위] 네이버 광고 API: 연관 키워드 + 월간 검색량 (PC+모바일) + 경쟁도 수집
  2. [2순위] Google KWP: CPC 단가 수집 (애드센스 수익 핵심 — Revenue Score 40% 가중치)
  3. [3순위] 네이버 DataLab: 2년치 트렌드 지수 + YoY 성장률 (계절성 보너스 산출)
  4. Revenue Score 계산 → 등급 부여 (S/A/B/C/D)
  5. 하위 키워드 확장 (롱테일 생성) — Intent별 클러스터 분화
출력: Revenue Score 내림차순 키워드 목록 + Intent 태깅
```

### 모드 2: 이벤트 키워드 탐색 (씨앗 키워드 → 클러스터 분화)

> **핵심 원칙:** 이벤트 1개 → 씨앗 키워드 1~3개 → Intent별 클러스터 8~12편 자동 생성
> D-Day 기준 발행 타이밍을 미리 계산하여 검색량 피크를 선점한다.

```
입력: 날짜 범위 (사용자 선택)
프로세스:
  1. 이벤트 소스 크롤링 (매일 06:00 자동 실행):
     - 인터파크 / YES24 / 멜론티켓: RSS or 크롤링 (콘서트, 전시회)
     - 네이버 뉴스 API: 내한공연, 경기 예정 뉴스
     - Google Trends API: 급상승 검색어
     - 각 스포츠 연맹 공식 사이트: 경기 일정
  2. [1순위] 네이버 광고 API: 씨앗 키워드 검색량 + 경쟁도 검증
  3. [2순위] Google KWP: CPC 단가 확인 (이벤트 관련 CPC 범위 파악)
  4. [3순위] 네이버 DataLab: 전년 동기 검색 트렌드 + 피크 시점 확인
  5. Intent별 클러스터 자동 분화 (AI 프롬프트 사용)
  6. D-Day 기준 발행 스케줄 자동 계산
  7. Revenue Score 계산 (이벤트 특수 보정 적용)
  8. expires_at 설정 (이벤트 종료일 기준)
출력: D-Day 기준 Intent별 클러스터 + 발행 스케줄 + 수익화 방법
```

#### 이벤트 D-Day 기준 클러스터별 발행 타이밍

| 시점 | 클러스터 | Intent | PASONA 핵심 | 수익화 |
|------|---------|--------|-------------|--------|
| D-90 | 루머/예고 | TREND | P + O | AdSense |
| D-60 | 공연 정보 | INFO | P + So | AdSense |
| D-45 | 티켓 예매 | AD | O + N + A | 예매 제휴링크 |
| D-30 | 좌석 비교 | COMPARE | So + N | 제휴링크 |
| D-7 | 준비물/MD | AD | O + N + A | 쿠팡파트너스 |
| D-1 | 당일 정보 | INFO | P + So | AdSense |
| D+1 | 공연 후기 | REVIEW | O (장단점) | 쿠팡파트너스 |
| D+7 | 감성 에세이 | TREND | P + O | AdSense |

> 씨앗 키워드 1개 → 최소 **8~12편**의 글이 검색결과를 다각도로 점유

#### 이벤트 씨앗 키워드 → Intent 클러스터 변환 예시

```
이벤트명: "BTS 월드투어 서울 공연"

[씨앗 키워드]
  "BTS 공연", "BTS 서울 콘서트"

[AD 클러스터] — D-45, D-7
  "BTS 서울 공연 티켓 예매 방법"
  "BTS 공연 공식 MD 추천"

[INFO 클러스터] — D-60, D-1
  "BTS 서울 공연 일정 장소 총정리"
  "BTS 콘서트 좌석 배치 교통 안내"

[COMPARE 클러스터] — D-30
  "BTS 공연 R석 vs S석 비교 어느게 나을까"

[REVIEW 클러스터] — D+1
  "BTS 서울 공연 후기 솔직 실제 관람 경험"

[TREND 클러스터] — D-90, D+7
  "BTS 월드투어 서울 개최 이유 배경"
  "BTS 공연 다녀온 후 감동 에세이"
```

#### 논란 인물 자동 블랙리스트

```
네이버 뉴스에서 "논란", "사건", "불매" 키워드 감지 시:
  → 해당 인물/이벤트 자동으로 REJECT 리스트에 추가
  → 이미 예약된 글 즉시 일시 정지
  → 담당자 알림 발송
```

### 모드 3: 시즌 키워드 탐색

```
입력: 목표 월 (1~12)
프로세스:
  1. 내부 연간 이벤트 캘린더 조회 (ANNUAL_EVENTS)
  2. 해당 월 반복 키워드 추출
  3. 과거 성과 데이터 조회 (전년도 Revenue Score)
  4. 검색 피크 시즌 예측
출력: 시즌 키워드 목록 + 최적 발행 타이밍

ANNUAL_EVENTS 캘린더:
  1월: 신년, 설날 준비, 수능 결과
  2월: 설날, 발렌타인, 입시 원서
  3월: 졸업/입학, 봄나들이
  4월: 벚꽃, 봄 캠핑, 취업 시즌
  5월: 어린이날, 어버이날, 가정의 달
  6월: 여름 준비, 장마 대비
  7~8월: 여름 휴가, 에어컨, 피서지
  9월: 추석 준비, 가을 여행
  10월: 단풍, 할로윈, 김장 준비
  11월: 수능, 블랙프라이데이
  12월: 크리스마스, 연말 정산, 겨울 여행
```

### 이벤트 키워드 3중 품질 검수 구조

```
[1단계] 이벤트 입장 전 필터 (키워드 달력 등록 시점)
  - 페르소나 적합성 AI 판단: PASS / HOLD / REJECT
  - 블랙리스트 (논란/사건/불매 인물) 자동 체크
  - 수익화 연결 가능성 검토

[2단계] 글 생성 시 Intent 강제 주입 (4-Layer 적용)
  - Layer 1: PASONA × Intent (변경 불가) — A 단계: AD→Agitation, INFO→Affinity
  - Layer 2: SEO + AEO/GEO (글 구조 오버레이)
  - Layer 3: 문맥광고 (후처리 삽입)
  - 페르소나 톤 (표현 방식만 적용)
  - 충돌 시 우선순위: Intent > PASONA > 페르소나

[3단계] 글 생성 후 검수 B (발행 직전) — 50점 만점
  [이벤트 고유] (35점)
  - Intent 목적 달성 여부 (8점)
  - PASONA 비중 준수 여부 (7점)
  - 필수 포함 요소 완비 여부 (7점)
  - 금지 요소 미포함 여부 (7점)
  - 페르소나 톤앤매너 일치도 (6점)
  [공통 기술] (15점)
  - SEO 준수 (5점)
  - AI 검색 최적화 (5점)
  - 문맥광고 코드 준수 (5점)
  → 45점 이상: 자동 발행 / 44점 이하: 수동 검토 대기열
```

### 구현 위치
`app/api/monetize/keywords/gold/route.ts`
`app/api/monetize/keywords/events/route.ts`
`app/api/monetize/keywords/seasonal/route.ts`
`lib/monetize/apis/naver-ad-api.ts`
`lib/monetize/apis/event-api.ts`
`lib/monetize/engines/event-cluster-engine.ts`

---

## 엔진 4: AI 글쓰기 엔진 (AI Writing Engine) — 4-Layer 적용

### 역할
pg_cron 트리거 또는 수동 실행 시 4-Layer 전략 모델을 순차 적용하여
완성된 블로그 글을 자동 생성하는 시스템.

### 작동 순서 (4-Layer 적용)

```
1. 스케줄된 포스트 정보 로드
   (keyword, blog, intent, ad_category)
   ↓
2. 클러스터 내 연관 키워드 조회
   (참고 자료로 활용)
   ↓
3. [Layer 1] Claude API — 아웃라인 + 본문 생성
   - 1차: 아웃라인 생성 (claude-sonnet-4-6)
   - 2차: PASONA × Intent별 가중치 적용 본문 생성
     S등급 → claude-opus-4-6 / 나머지 → claude-sonnet-4-6
   - A 단계: AD/CRITIC → Agitation / INFO/REVIEW → Affinity
   ↓
4. [Layer 2] 프롬프트 내 SEO 지시 + 후처리 AEO
   - SEO: 메타태그, 키워드 밀도, 내부 링크, H2/H3 구조
   - AEO: 글 하단 FAQ 아코디언(<details>) 3개 자동 생성
   - 답변 길이: 한국어 기준 80~120자(2~3문장)
   ↓
5. [Layer 3] 후처리 — 문맥광고 삽입
   - google_ad_section_start/end 태그 자동 삽입 (So~N 영역)
   - 키워드 밀도 자동 조정
   - 이미지 alt 태그 자동 생성
   ↓
6. [자동 생성] JSON-LD Schema
   - FAQPage Schema (FAQ 아코디언과 1:1 매핑)
   - Article Schema (작성자, 날짜)
   - HowTo/Product Schema (글 유형에 따라)
   ↓
7. 품질 검수 엔진 실행
   keyword_type → 검수 A(골드/시즌) 또는 검수 B(이벤트) 자동 분기
   총점 계산 → 자동 발행 or 보류 결정
   ↓
8. 결과 저장 (scheduled_posts + post_quality_scores)
```

> **Layer 4(REO)는 글쓰기 파이프라인에 포함되지 않는다.**
> REO는 블로그 전체 단위 평판으로, 월 1회 블로그 등급 재평가 시 반영한다.

### 구현 위치
`lib/monetize/engines/ai-writer.ts`
`lib/monetize/apis/claude-api.ts`

---

## 전략 통합 매트릭스 (4-Layer 기반)

| 파이프라인 단계 | 적용 Layer/엔진 | 핵심 출력 |
|----------------|----------------|-----------|
| 키워드 탐색 | Revenue Score 전략 + 키워드 탐색 엔진 | 등급화된 키워드 목록 |
| 클러스터링 | Intent 분류 전략 | 8~12개 연관 키워드 클러스터 |
| 배분 | 배분 엔진 | 블로그별 날짜+시간 스케줄 |
| AI 글쓰기 | **L1** PASONA×Intent + **L2** SEO+AEO/GEO | PASONA 본문 + FAQ 아코디언 |
| 후처리 | **L3** 문맥광고 삽입 + JSON-LD Schema 생성 | 광고 태그 + Schema 완성 |
| 검수 | 검수 A(골드/시즌) 또는 검수 B(이벤트) | 자동 발행 or 보류 결정 |
| 발행 | pg_cron | 자동 발행 완료 |
| 등급 평가 (월별) | **L4** REO/E-E-A-T 블로그 단위 평가 | 블로그 등급 갱신 |

---

## 글 구조 표준 (Article Structure Standard)

> 모든 자동 생성 글은 아래 구조를 따른다. PASONA 본문과 AEO FAQ를 분리 배치하여 전략 충돌을 방지한다.

```
┌─────────────────────────────────────────────┐
│  H1: 제목 (키워드 포함, 35자 이내)           │
├─────────────────────────────────────────────┤
│                                             │
│  [PASONA 본문 — Layer 1]                    │
│  ┌─────────────────────────────────────┐    │
│  │ P: 문제 제기                         │    │
│  │ A: 공감 확대 (Agitation/Affinity)    │    │
│  │ So: 해결책 ← ad_section_start       │    │
│  │ O: 제안    ← 쿠팡파트너스 자동 삽입  │    │
│  │ N: 범위 제한 ← ad_section_end        │    │
│  │ A: 행동 유도 (CTA)                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Layer 3: 문맥광고 영역 — So~N에 자동 삽입] │
│  <!-- google_ad_section_start -->           │
│  <!-- google_ad_section_end -->             │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  [FAQ 아코디언 — Layer 2 AEO 전용]          │
│  H2: 자주 묻는 질문                          │
│  <details><summary>Q1</summary>A1</details> │
│  <details><summary>Q2</summary>A2</details> │
│  <details><summary>Q3</summary>A3</details> │
│  (답변: 80~120자, 숫자/통계 포함)             │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  [JSON-LD Schema — <head> 또는 본문 하단]    │
│  FAQPage Schema (FAQ와 1:1 매핑)            │
│  Article Schema (작성자, 날짜, 출판사)       │
│  HowTo/Product Schema (글 유형별)           │
│                                             │
└─────────────────────────────────────────────┘
```

> **광고 섹션(Layer 3)은 So~N 영역에만 삽입.** P, A(공감), A(행동유도) 영역은 광고 태그 제외.
> **FAQ 아코디언은 본문과 완전 분리.** PASONA 설득 흐름을 방해하지 않으면서 AI 검색 채택률을 높인다.
> **JSON-LD Schema는 숨김 콘텐츠가 아님.** 구글이 권장하는 100% 합법적 구조화 데이터.

---

## Neurion 확장 전략 연동 (v2.0.0 추가)

> 아래 4가지 전략은 `09-neurion-features-spec.md`에 상세 명세되어 있습니다.
> 본 파일의 코어 파이프라인과 연동되는 지점만 기록합니다.

| Neurion 기능 | 연동 파이프라인 단계 | 전략 영향 |
|-------------|---------------------|-----------|
| **#15 다국어 자동 발행** | 키워드 탐색 + AI 글쓰기 + 배분 | 언어별 데이터소스 전환, AI 직접 작성, 타임존 pg_cron 분기 |
| **#4 수익화 가이드** | 대시보드 (파이프라인 외) | Revenue Score × 블로그 유형 역산 공식 활용 |
| **#10 SNS 자동 배포** | 발행 이후 (파이프라인 확장) | 발행 완료 글 → SNS 포맷 변환 → 플랫폼 API 호출 |
| **#13 쿠팡파트너스** | AI 글쓰기 — PASONA O(Offer) | 키워드 의도(AD/REVIEW) 일치 상품 추천 + 제휴 링크 삽입 |

### 다국어 발행과 배분 엔진 연동 포인트

```
배분 엔진 실행 시:
  blog.language === 'ko' → pg_cron: UTC 21:00 (KST 06:00)
  blog.language === 'en' → pg_cron: UTC 14:00 (EST 09:00)
  blog.language === 'ja' → pg_cron: UTC 21:00 (JST 06:00)

키워드 탐색 엔진 실행 시:
  language === 'ko' → 1순위: 네이버 광고 API → 2순위: Google KWP → 3순위: DataLab
  language === 'en' → 1순위: Google KWP → 2순위: Google Trends
  language === 'ja' → 1순위: Google KWP (JP) → 2순위: Yahoo Japan API
```
