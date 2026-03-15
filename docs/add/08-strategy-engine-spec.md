# 수익화 로켓 전략 정의 & 엔진 작동 원리

> 작성일: 2026-03-15 | 버전: 1.1.0
> 수익화 로켓에 적용되는 6대 전략과 4대 엔진의 상세 명세
> **Neurion 확장 기능 (다국어/SNS/쿠팡/수익화가이드):** `09-neurion-features-spec.md` 참조

---

## 전체 전략 맵

```
[키워드 탐색] ──────────── Revenue Score 전략
     ↓
[키워드 클러스터링] ──────── 클러스터링 × Intent 전략
     ↓
[AI 글쓰기] ─────────────── PASONA 전략
     ↓                       SEO 전략
     ↓                       AEO 전략
     ↓                       GEO(REO) 전략
[검수 & 발행] ───────────── 품질 검수 엔진
     ↓
[배분 & 스케줄] ─────────── 배분 엔진
```

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

## 전략 3: PASONA 전략 (AI 자동 글쓰기 프레임워크)

### 개념
Problem → Agitation → Solution → Offer → Narrow → Action 구조에
Intent별 가중치를 다르게 적용해 맥락 최적화된 글을 자동 생성한다.

### PASONA 구조 × Intent별 가중치

| PASONA 요소 | AD형 | REVIEW형 | INFO형 | CRITIC형 | COMPARE형 |
|-------------|------|----------|--------|----------|-----------|
| Problem(문제 제기) | 20% | 15% | 30% | 25% | 20% |
| Agitation(공감 확대) | 15% | 10% | 15% | 20% | 10% |
| Solution(해결책) | 20% | 25% | 35% | 30% | 25% |
| Offer(제안) | 30% | 20% | 5% | 5% | 20% |
| Narrow(범위 제한) | 10% | 15% | 10% | 15% | 15% |
| Action(행동 유도) | 20% | 15% | 5% | 5% | 10% |

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

[AEO 요구사항]
- FAQ 섹션 1개 이상 (Q&A 형식)
- 핵심 답변: 40~60자 이내 명확한 1문장
- 숫자/통계 포함 (신뢰도 향상)

[GEO 요구사항]
- 전문가적 어조 유지 (E-E-A-T 신호)
- 구체적 경험/데이터 인용
- "결론적으로" 형식의 요약 단락 포함

[광고 섹션 타겟팅]
고수익 광고 유도를 위해:
<!-- google_ad_section_start -->
{ad_category} 관련 핵심 내용 (Offer 파트)
<!-- google_ad_section_end -->
태그로 고CPC 섹션 감싸기

[출력 형식]
마크다운 형식으로 완성된 블로그 글 작성
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

## 전략 4: SEO 전략

### 개념
검색 엔진(특히 네이버/구글)에서 상위 노출을 위한 온페이지 최적화 전략.
AI 글쓰기 출력물에 자동 적용된다.

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

## 전략 5: AEO 전략 (Answer Engine Optimization)

### 개념
AI 검색 엔진(ChatGPT, Perplexity, 네이버 AI 검색)에서 답변으로 채택될 확률을 높이는 전략.
구조화된 Q&A + 명확한 단문 답변 + Schema.org 마크업이 핵심.

### AEO 구현 요소

```
[핵심 답변 블록]
각 주요 질문에 40~60자의 명확한 1문장 답변 배치
예: "다이어트 보조제는 가르시니아, 카르니틴, CLA가 가장 효과적입니다."

[FAQ 구조화 데이터]
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "다이어트 보조제 부작용이 있나요?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "일부 보조제는 소화 불량, 두근거림이 나타날 수 있으며..."
    }
  }]
}

[숫자/통계 포함]
- "임상 연구에서 12주 복용 시 평균 3.2kg 감소"
- "전체 응답자의 78%가 효과 있다고 응답"
- 구체적 수치로 AI 인용 가능성 대폭 향상
```

### AI 글쓰기 AEO 프롬프트 지시

```
AEO 최적화를 위해 다음을 포함하세요:
1. 핵심 질문 3개 도출 (독자가 가장 궁금한 것)
2. 각 질문에 40~60자 이내 명확한 답변 작성
3. FAQ 섹션 마지막에 배치 (H2 "자주 묻는 질문")
4. 숫자, 통계, 연구 결과 최소 2개 인용
```

---

## 전략 6: GEO/REO 전략 (Generative & Reputation Engine Optimization)

### 개념
**GEO**: AI 생성 검색(ChatGPT, Gemini, Claude)에서 내 블로그가 소스로 인용되도록 최적화
**REO**: 평판 신호를 쌓아 AI 모델이 내 블로그를 신뢰할 수 있는 출처로 인식하게 하는 전략

### E-E-A-T 신호 강화

```
Experience (경험):
  - "직접 3개월 사용해본 결과..."
  - "제가 실제로 구매해서 테스트한 결과..."
  - 개인 경험 서술 1회 이상

Expertise (전문성):
  - 전문 용어 적절히 사용
  - 참고 문헌/출처 명시
  - 관련 자격/경력 언급 (있을 경우)

Authoritativeness (권위성):
  - 외부 신뢰 소스 링크 (정부, 학술, 공신력 있는 매체)
  - 다른 전문가 의견 인용

Trustworthiness (신뢰성):
  - 게시 날짜 명시
  - 수정 날짜 표시 (갱신 신호)
  - 작성자 정보 표시
```

### GEO 기술 규칙 (AI 인용 최적화)

```
구조화 데이터 (Schema.org):
  - Article Schema: 작성자, 날짜, 출판사 명시
  - FAQPage Schema: Q&A 구조화
  - HowTo Schema: 단계별 가이드에 적용
  - Product Schema: 제품 리뷰에 적용

AI 인용 최적화 텍스트 패턴:
  - "결론적으로, {주제}은 {핵심 내용}입니다."
  - "핵심 요약: {3가지 이내 불릿포인트}"
  - "전문가 의견: {인용}"

REO 1-3-5 법칙:
  - 1개: 핵심 단문 답변 (40자 이내)
  - 3개: 주요 이유/근거
  - 5개: 구체적 실행 단계
```

---

## 엔진 1: 배분 엔진 (Distribution Engine)

### 역할
탐색된 키워드를 등록된 복수의 블로그에 최적화된 날짜와 시간으로 자동 배분하는 시스템.
블로그 등급, 키워드 등급, 하루 쿼터, 날짜/시간 분산 규칙을 모두 고려한다.

### 작동 원리

```
Step 1: 입력 데이터 정렬
  - 키워드: Revenue Score 내림차순 (S등급부터 처리)
  - 블로그: 등급 내림차순 + 하루 쿼터 여유분 내림차순

Step 2: 등급 매칭 (Grade Matching)
  - S등급 키워드 → S등급 블로그 우선, 없으면 A등급
  - A등급 키워드 → A/B등급 블로그
  - B등급 키워드 → B/C등급 블로그
  - C등급 키워드 → C/D등급 블로그 (신규 블로그 훈련용)

Step 3: 날짜 배분 (Date Differentiation)
  - 동일 키워드: 블로그별 최소 3일 간격
  - 동일 블로그: 하루 최대 쿼터(daily_quota) 초과 불가
  - 쿼터 초과 시: 다음 가용 날짜로 자동 밀기

Step 4: 시간 배분 (Time Differentiation)
  - 블로그별 고유 발행 시간 지정 (기본값: 새벽 6시)
  - 같은 날 여러 블로그 발행 시 1~2시간 사이의 간격으로 랜덤하게 분산
  - 시간대 예시: 06:00 → 07:10 → 08:35 → 10:20 → 12:05
  - 랜덤 간격: 60분 ~ 120분 사이에서 무작위 결정 (패턴 감지 방지)

Step 5: 결과 생성
  - scheduled_posts 레코드 생성 (blog_id + keyword_id + date + time)
  - pg_cron 트리거 등록 대기 (확정 후 등록)
```

### 배분 알고리즘

```typescript
interface DistributionResult {
  assignments: Array<{
    blogId: string
    keywordId: string
    scheduledDate: Date
    scheduledTime: string
    matchReason: string    // 배정 근거 로그
  }>
  unassigned: string[]   // 배정 실패 키워드 ID
  warnings: string[]     // 쿼터 초과, 등급 불일치 경고
}

function runDistributionEngine(
  keywords: KeywordWithScore[],
  blogs: BlogWithGrade[],
  dateRange: DateRange
): DistributionResult {
  const sorted = sortByRevenueScore(keywords)
  const assignments = []

  for (const keyword of sorted) {
    const eligible = blogs
      .filter(b => isGradeMatch(keyword.grade, b.grade))
      .filter(b => hasQuotaAvailable(b, targetDate, assignments))
      .sort((a, b) => gradeToNumber(b.grade) - gradeToNumber(a.grade))

    if (eligible.length === 0) {
      unassigned.push(keyword.id)
      continue
    }

    const blog = eligible[0]
    const date = findNextAvailableDate(blog, dateRange, assignments)
    const time = assignRandomTime(blog, date, assignments)  // 1~2시간 랜덤 간격

    assignments.push({ blogId: blog.id, keywordId: keyword.id, scheduledDate: date, scheduledTime: time })
  }

  return { assignments, unassigned, warnings }
}
```

### 구현 위치
`lib/monetize/engines/distribution-engine.ts`

---

## 엔진 2: 품질 검수 엔진 (Quality Checker)

### 역할
AI가 작성한 글을 자동으로 3단계 점수화하여 자동 발행(45점+) 또는 보류(45점 미만)를 결정하는 시스템.

### 3단계 검수 점수 체계

```
총점: 50점 만점 → 45점 이상 자동 발행

[1단계] SEO 점수 (0~20점)
  메타태그 완성도:  5점
    - 제목 35자 이내 + 키워드 포함: 3점
    - 메타 디스크립션 120~160자: 2점
  키워드 밀도:      5점
    - 1~2% 범위: 5점 / 범위 이탈: 0점
  구조 최적화:      5점
    - H2 2개 이상: 2점
    - H3 포함: 1점
    - 글자수 1500자+: 2점
  링크:             5점
    - 내부 링크 2개+: 3점
    - 이미지 alt 태그: 2점

[2단계] 품질 점수 (0~15점)
  PASONA 구조:      6점
    - 6요소 모두 포함: 6점 / 1개 누락시: -1점
  가독성:           5점
    - 평균 문장 길이 40자 이내: 2점
    - 단락 당 5줄 이내: 2점
    - 리스트/불릿 포함: 1점
  독창성:           4점
    - 중복률 0~20%: 4점 / 20~40%: 2점 / 40%+: 0점

[3단계] 수익화 점수 (0~15점)
  광고 섹션:        6점
    - google_ad_section 태그 적용: 4점
    - 고CPC 카테고리 키워드 밀집: 2점
  Intent 정합성:    5점
    - 선택된 Intent와 콘텐츠 일치: 5점 / 불일치: 0점
  AEO 구조:         4점
    - FAQ 섹션 포함: 2점
    - 핵심 답변 블록 40~60자: 2점
```

### 자동 검수 프로세스

```typescript
async function runQualityCheck(postContent: string, keyword: string, intent: IntentType): Promise<QualityScore> {
  const seoScore = await checkSEO(postContent, keyword)
  const qualityScore = await checkQuality(postContent)
  const revenueScore = await checkRevenue(postContent, intent)
  const total = seoScore + qualityScore + revenueScore

  return {
    seoScore,
    qualityScore,
    revenueScore,
    totalScore: total,
    autoPublish: total >= AUTO_PUBLISH_THRESHOLD,
    reviewReason: total < AUTO_PUBLISH_THRESHOLD
      ? generateReviewReason(seoScore, qualityScore, revenueScore)
      : null
  }
}
```

### 구현 위치
`lib/monetize/engines/quality-checker.ts`

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

[2단계] 글 생성 시 Intent 강제 주입
  - LAYER 1: Intent Directive (변경 불가)
  - LAYER 2: PASONA 비중 (변경 불가)
  - LAYER 3: 페르소나 톤 (표현 방식만 적용)
  - 충돌 시 우선순위: Intent > PASONA > 페르소나

[3단계] 글 생성 후 Intent 검수 (발행 직전)
  - Intent 목적 달성 여부 (10점)
  - PASONA 비중 준수 여부 (10점)
  - 필수 포함 요소 완비 여부 (10점)
  - 금지 요소 미포함 여부 (10점)
  - 페르소나 톤앤매너 일치도 (10점)
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

## 엔진 4: AI 글쓰기 엔진 (AI Writing Engine)

### 역할
pg_cron 트리거 또는 수동 실행 시 키워드 + Intent + PASONA + SEO/AEO/GEO를
통합하여 완성된 블로그 글을 자동 생성하는 시스템.

### 작동 순서

```
1. 스케줄된 포스트 정보 로드
   (keyword, blog, intent, ad_category)
   ↓
2. 클러스터 내 연관 키워드 조회
   (참고 자료로 활용)
   ↓
3. Claude API 호출 (1차: 아웃라인 생성)
   - 모델: claude-sonnet-4-6
   - 프롬프트: 아웃라인 생성 전용
   ↓
4. Claude API 호출 (2차: 본문 생성)
   - 모델: S등급 → claude-opus-4-6 / 나머지 → claude-sonnet-4-6
   - 프롬프트: PASONA × SEO/AEO/GEO 통합 프롬프트
   ↓
5. 후처리 (Post-processing)
   - 키워드 밀도 자동 조정
   - google_ad_section 태그 자동 삽입
   - Schema.org JSON-LD 자동 생성
   - 이미지 alt 태그 자동 생성
   ↓
6. 품질 검수 엔진 실행
   (총점 계산 → 자동 발행 or 보류 결정)
   ↓
7. 결과 저장 (scheduled_posts + post_quality_scores)
```

### 구현 위치
`lib/monetize/engines/ai-writer.ts`
`lib/monetize/apis/claude-api.ts`

---

## 전략 통합 매트릭스

| 파이프라인 단계 | 적용 전략/엔진 | 핵심 출력 |
|----------------|---------------|-----------|
| 키워드 탐색 | Revenue Score 전략 + 키워드 탐색 엔진 | 등급화된 키워드 목록 |
| 클러스터링 | Intent 분류 전략 | 8~12개 연관 키워드 클러스터 |
| 배분 | 배분 엔진 | 블로그별 날짜+시간 스케줄 |
| AI 글쓰기 | PASONA + SEO + AEO + GEO/REO + AI 글쓰기 엔진 | 완성된 블로그 글 |
| 검수 | 품질 검수 엔진 | 자동 발행 or 보류 결정 |
| 발행 | pg_cron | 자동 발행 완료 |

---

## Neurion 확장 전략 연동 (v1.1.0 추가)

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
