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

### 지원 언어 및 특성

| 언어 | 주요 검색엔진 | 1순위 키워드 소스 | CPC 특성 | 코어타임 |
|------|------------|----------------|---------|---------|
| 한국어 🇰🇷 | 네이버 + 구글 | 네이버 광고 API | 중간~높음 | 06:00 KST |
| English 🇺🇸 | Google | Google KWP (글로벌) | 높음 | 09:00 PST |
| 日本語 🇯🇵 | Yahoo! Japan + 구글 | Google KWP JP | 높음 | 07:00 JST |
| 繁體中文 🇹🇼 | Google TW | Google KWP TW | 중간 | 09:00 CST |
| ภาษาไทย 🇹🇭 | Google | Google KWP TH | 낮음~중간 | 08:00 ICT |

### 설정 구조 (블로그 설정 > 언어/지역 탭)

```
[언어/지역 설정]

작성 언어:   [한국어 ▼]  (한국어 / English / 日本語 / 繁體中文 / ภาษาไทย)
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
    seoTarget: "yahoo_japan",
    minWordCount: 1500,
    model: 'claude-sonnet-4-6',
  },
}
```

### 키워드 발굴 언어별 데이터 소스 자동 매핑

```typescript
function getDataSourceConfig(language: string): DataSourceConfig {
  return {
    ko: {
      primary: 'naver_ads',       // 1순위: 검색량 + 경쟁도
      secondary: 'google_kwp',    // 2순위: CPC (애드센스 수익 핵심)
      trend: 'naver_datalab',     // 3순위: 계절성
      timezone: 'Asia/Seoul',
      corePublishHour: 6,
    },
    en: {
      primary: 'google_kwp',      // 1순위: 구글 전용 (네이버 없음)
      secondary: null,
      trend: 'google_trends',
      timezone: 'America/Los_Angeles',
      corePublishHour: 9,
    },
    ja: {
      primary: 'google_kwp',      // JP 지역 설정
      secondary: 'yahoo_japan',
      trend: 'google_trends',
      timezone: 'Asia/Tokyo',
      corePublishHour: 7,
    },
  }[language] ?? getDataSourceConfig('ko')
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

> "블로그 글 발행 완료 → 인스타그램 / X / 쓰레드 자동 변환 → 예약 발행"
> 각 플랫폼마다 글쓰기 형식이 다르므로, **플랫폼별 포맷 프롬프트를 사용자가 직접 정의**한다.
> 이미지 생성은 선택 토글이며, 한번 설정 후 수정할 때까지 고정된다.

### 지원 플랫폼

| 플랫폼 | 포맷 특성 | 자동화 방식 |
|--------|---------|------------|
| 인스타그램 | 이미지 + 캡션(최대 2,200자) + 해시태그 | AI 캡션 + 이미지 선택 생성 |
| X (트위터) | 280자 스레드 (3~5개 트윗) | AI 스레드 분해 |
| 쓰레드 | 500자 이내 게시물 (스레드 연결 가능) | AI 요약 게시 + 보충 스레드 |

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
  ↑ 한번 설정 후 고정 (재변경은 설정 화면에서만 가능)

  [ON 선택 시 표시]
  이미지 생성 엔진: ○ DALL-E 3  ○ Ideogram  ○ Flux
  이미지 비율:
    인스타그램: [1:1 정방형] (고정)
    X / 쓰레드: [16:9 가로형] (고정)
  이미지 스타일 프롬프트:
  ┌────────────────────────────────────┐
  │ 깔끔한 인포그래픽 스타일. 한국어   │
  │ 텍스트 포함, 밝은 색상 배경.       │
  └────────────────────────────────────┘

─────────────────────────────────────────
플랫폼별 글쓰기 포맷 프롬프트
─────────────────────────────────────────

[인스타그램 포맷 프롬프트]
┌────────────────────────────────────────┐
│ 이 블로그 글을 인스타그램 캡션으로     │
│ 변환해줘.                             │
│ - 첫 줄: 궁금증 유발 후킹 문장         │
│ - 이모지 5~8개 적절히 사용             │
│ - 핵심 정보 3줄 요약                  │
│ - 마지막: 해시태그 10~15개            │
│ - 전체 1,000자 이내                   │
└────────────────────────────────────────┘
[기본 프롬프트 사용 ▼] [직접 편집]

[X (트위터) 포맷 프롬프트]
┌────────────────────────────────────────┐
│ 이 글을 3~5개 스레드 트윗으로 만들어줘│
│ - 첫 트윗: 가장 임팩트 있는 한 줄     │
│ - 중간: 핵심 내용 요약 (각 270자 이내) │
│ - 마지막: 블로그 링크 + "자세히 읽기" │
└────────────────────────────────────────┘

[쓰레드 포맷 프롬프트]
┌────────────────────────────────────────┐
│ 이 글의 핵심을 쓰레드 게시물로 만들어줘│
│ - 메인 게시물: 핵심 메시지 300자 이내  │
│ - 보충 쓰레드 2~3개: 세부 내용 분해   │
│ - 마지막 쓰레드: 블로그 링크 유도      │
└────────────────────────────────────────┘

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
  1. 사용자 정의 포맷 프롬프트 로드
  2. Claude API: 블로그 글 → 캡션 변환
  3. [이미지 ON 시] 이미지 생성 API: 1:1 이미지 생성
  4. Instagram Graph API: 예약 발행

X (트위터):
  1. 포맷 프롬프트 로드
  2. Claude API: 글 → 3~5개 스레드 분해
  3. Twitter API v2: 스레드 예약 발행

쓰레드:
  1. 포맷 프롬프트 로드
  2. Claude API: 글 → 메인 + 보충 스레드
  3. Threads API (Meta Graph API): 예약 발행
```

### 데이터 구조

```typescript
// blogs 테이블 settings JSONB 내 SNS 설정
interface BlogSNSSettings {
  imageGeneration: {
    enabled: boolean          // 이미지 자동 생성 ON/OFF (고정값)
    engine: 'dalle3' | 'ideogram' | 'flux'
    stylePrompt: string       // 이미지 스타일 프롬프트
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
lib/monetize/apis/image-gen-api.ts           — 이미지 생성 (DALL-E 3 / Ideogram)
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

| API | 목적 | 인증 |
|-----|------|------|
| Instagram Graph API | 인스타그램 발행 | Meta Developer App |
| Twitter API v2 | X 스레드 발행 | OAuth 2.0 |
| Threads API (Meta Graph API) | 쓰레드 발행 | Meta Developer App |
| DALL-E 3 / Ideogram API | 이미지 생성 | OpenAI API Key / Ideogram Key |
| 쿠팡파트너스 API | 상품 검색 + 링크 생성 | 쿠팡파트너스 가입 필요 |
| Google KWP (JP/TW/TH) | 다국어 키워드 CPC | Google Ads API (기존) |

---

## 미결정 사항

- [ ] #15 영어 블로그 도메인 전략 (기존 .kr 서브경로 vs 별도 .com 도메인)
- [ ] #15 일본어 야후재팬 API 접근 방식 (공식 API 없어 크롤링 검토)
- [ ] #10 인스타그램 비즈니스 계정 연동 필수 여부 (개인 계정 API 제한)
- [ ] #10 이미지 생성 엔진 최종 선택 (DALL-E 3 vs Ideogram vs Flux)
- [ ] #13 영어 블로그 Amazon Associates 연동 구현 시점
- [ ] #4 수익 예측 기준 데이터 (초기 성과 데이터 없을 때 업계 평균값 사용)
- [ ] #4 MD 다운로드 시 영어/일본어 블로그 전략 포함 여부
