# 수익화 로켓 TRD (기술 요구사항 명세)

> 작성일: 2026-03-15 | 버전: 1.0.0

---

## 1. 기술 스택

### 프론트엔드
- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript
- **UI Library**: Radix UI + shadcn/ui 패턴
- **State Management**: Zustand 5
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts 2.13 (수익 그래프, 키워드 분포)
- **Animation**: Framer Motion
- **Date Handling**: date-fns
- **Form Validation**: Zod

### 백엔드 (Next.js API Routes)
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (기존 활용)
- **Scheduler**: Supabase pg_cron (자동 발행 트리거)
- **AI Writing**: Claude API (claude-opus-4-6 / claude-sonnet-4-6)
- **Cache**: Supabase Edge Functions (API 응답 캐싱)

### 외부 API (키워드 탐색기)

| API | 목적 | 갱신 주기 |
|-----|------|-----------|
| 네이버 광고 API | 검색량 + CPC 수집 (ko 1순위) | 일 1회 |
| Google Keyword Planner | 글로벌 검색량 + CPC (en/ja 1순위, ko 2순위) | 일 1회 |
| 네이버 DataLab API | 트렌드 지수 0~100 (ko 3순위) | 실시간 |
| Google Trends (비공식) | 급상승 키워드 감지 | 시간 1회 |
| 티켓링크/인터파크 API | 이벤트·공연 키워드 | 일 1회 |
| 문화체육관광부 공공API | 계절·행사 키워드 | 주 1회 |
| 한국관광공사 API | 지역 관광 이벤트 | 주 1회 |

### 외부 API (Neurion 확장 — Phase 3~4)

| API | 목적 | 비고 |
|-----|------|------|
| Instagram Graph API | Reels/Feed 자동 발행 | Meta Developer App 필요 |
| Twitter API v2 | X(Twitter) 자동 포스팅 | Elevated Access 필요 |
| Threads API (Meta Graph) | Threads 자동 발행 | Meta Developer App 공유 |
| DALL-E 3 (OpenAI) | SNS용 이미지 생성 (선택) | 토글 ON 시만 호출 |
| Ideogram API | SNS용 이미지 생성 대안 (선택) | 토글 ON 시만 호출 |
| 쿠팡파트너스 API | 상품 검색 + 제휴 링크 생성 | 파트너 ID 설정 필요 |

### 인프라
- **Hosting**: Vercel (기존)
- **Database**: Supabase (기존)
- **Cron Jobs**: Supabase pg_cron (새벽 6시 자동 발행)
- **Secrets**: Vercel Environment Variables

---

## 2. 아키텍처

### 전체 시스템 구조

```
[사용자 개입 지점]
    ↓ (키워드 달력 확인 & 보류글 승인)

[수익화 로켓 파이프라인]
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  키워드 탐색기                                           │
│  ├── 골드 키워드 엔진 (네이버 광고 API + DataLab)        │
│  ├── 이벤트 키워드 엔진 (티켓링크, 공공API)              │
│  └── 시즌 키워드 엔진 (연간 이벤트 캘린더)               │
│         ↓                                               │
│  배분 엔진                                               │
│  ├── 블로그 등급별 키워드 배정                           │
│  ├── 날짜·시간 차별화 스케줄링                           │
│  └── 하루 제안 글 수 쿼터 관리                           │
│         ↓                                               │
│  AI 글쓰기 엔진                                          │
│  ├── 키워드 클러스터링 × Intent 분류                     │
│  ├── PASONA × SEO/AEO/GEO 작성                          │
│  └── REO 평판 최적화 삽입                                │
│         ↓                                               │
│  검수 엔진 (3단계)                                       │
│  ├── 45점 이상 → 자동 발행                               │
│  └── 45점 미만 → 대기 큐 (사용자 검토)                  │
│         ↓                                               │
│  자동 발행 (pg_cron - 새벽 6시)                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 배분 엔진 로직

```typescript
interface DistributionEngine {
  // 입력
  keywords: KeywordWithScore[];       // Revenue Score 기반 정렬
  blogs: BlogWithGrade[];             // S/A/B/C/D 등급
  targetDate: DateRange;              // 배분 대상 기간

  // 배분 규칙
  rules: {
    gradeMatching: boolean;           // S등급 키워드 → S/A등급 블로그
    dailyQuotaPerBlog: number;        // 블로그별 하루 최대 글 수
    timeDifferentiation: boolean;     // 블로그별 발행 시간 차별화
    dateDifferentiation: boolean;     // 동일 키워드 날짜 분산
  };

  // 출력
  schedule: ScheduleEntry[];          // blog_id + keyword_id + date + time
}
```

### AI 글쓰기 파이프라인

```
1. 키워드 입력
   ↓
2. Intent 분류 (AD/REVIEW/INFO/CRITIC/COMPARE/TREND)
   ↓
3. 클러스터 생성 (Seed → 8~12개 관련 키워드)
   ↓
4. PASONA 구조 × Intent별 가중치 적용
   ├── AD형: 문제제기(20%) + Offer(30%) + CTA(20%)
   ├── REVIEW형: 솔직 평가(40%) + 비교(20%)
   └── INFO형: 정보 구조화(50%) + FAQ(20%)
   ↓
5. SEO/AEO/GEO 요소 삽입
   ├── SEO: 메타 태그, 내부 링크, 이미지 alt
   ├── AEO: FAQ 구조화 데이터, 40~60자 답변 블록
   └── GEO: E-E-A-T 신호, Schema.org 마크업
   ↓
6. 고CPC 섹션 타겟팅 (AdSense section start/end 태그)
   ↓
7. 3단계 검수 (SEO점수 + 품질점수 + 수익화점수)
   ↓
8. 45점 이상: 자동 발행 큐 / 미만: 보류 큐
```

---

## 3. 데이터 모델 (핵심 엔티티)

```
blogs (기존)
  └── blog_grade (S/A/B/C/D)
  └── daily_quota (하루 최대 글 수)
  └── primary_ad_category (고CPC 광고 카테고리)
  └── language (ko/en/ja — 기능 4)

blog_settings (Neurion 확장 — JSONB)
  └── blog_id → blogs
  └── sns_settings: { instagram, twitter, threads, imageGen }
  └── coupang_settings: { partnerId, autoInsert }
  └── language_settings: { language, writeStyle }

sns_posts (기능 6)
  └── post_id → scheduled_posts
  └── platform (instagram/twitter/threads)
  └── content + image_url + status + published_at

affiliate_clicks (기능 7)
  └── post_id → scheduled_posts
  └── product_name + affiliate_url + clicks + revenue

keywords
  └── revenue_score (Revenue Score 0~100)
  └── keyword_grade (S/A/B/C/D)
  └── keyword_type (gold/event/seasonal)
  └── intent_type (AD/REVIEW/INFO/CRITIC/COMPARE/TREND)

keyword_clusters
  └── seed_keyword_id → keywords
  └── cluster_keywords (JSON array)

scheduled_posts
  └── blog_id → blogs
  └── keyword_id → keywords
  └── scheduled_date + scheduled_time
  └── status (pending/writing/review/published/failed)

post_quality_scores
  └── post_id → scheduled_posts
  └── seo_score + quality_score + revenue_score
  └── total_score (합산 45점 기준)

revenue_analytics
  └── blog_id → blogs
  └── date + estimated_revenue + actual_revenue
  └── ad_category + language + blog_type
```

---

## 4. 보안 요구사항

### API 키 관리
- 모든 외부 API 키는 Vercel Environment Variables에 저장
- 클라이언트 사이드에서 외부 API 직접 호출 금지
- Next.js API Routes를 통한 서버사이드 호출만 허용

### 접근 제어
- `/monetize` 경로는 인증된 사용자만 접근 (기존 Supabase Auth 활용)
- RLS(Row Level Security) 정책: user_id 기반 데이터 격리

---

## 5. 성능 요구사항

| 항목 | 목표값 |
|------|--------|
| 키워드 탐색 응답 | < 3초 (API 캐싱 활용) |
| 배분 엔진 연산 | < 5초 (100개 키워드 기준) |
| AI 글쓰기 | < 60초 / 글 |
| 대시보드 로딩 | < 1초 (TanStack Query 캐싱) |
| pg_cron 발행 정확도 | ±5분 이내 |

---

## 6. 외부 API 연동 명세

### 네이버 광고 API
```
Endpoint: https://api.naver.com/keywordstool
Auth: X-API-KEY header
Rate Limit: 1,000 req/day
캐싱: 24시간
```

### DataLab API
```
Endpoint: https://openapi.naver.com/v1/datalab/search
Auth: X-Naver-Client-Id + X-Naver-Client-Secret
Rate Limit: 1,000 req/day
데이터: 트렌드 지수 (최근 1년)
```

### Claude API (AI 글쓰기)
```
Model: claude-sonnet-4-6 (기본) / claude-opus-4-6 (S등급 키워드)
Max tokens: 4,096 / 글
Temperature: 0.7
```

---

## 7. pg_cron 스케줄 설정

```sql
-- 새벽 6시 자동 발행 (KST = UTC+9)
SELECT cron.schedule(
  'auto-publish-rocket',
  '0 21 * * *',  -- UTC 21:00 = KST 06:00
  $$
    SELECT trigger_auto_publish();
  $$
);

-- 매시간 급상승 키워드 체크
SELECT cron.schedule(
  'trending-keyword-check',
  '0 * * * *',
  $$
    SELECT check_trending_keywords();
  $$
);

-- [기능 4] 영어 블로그 발행 (EST = UTC-5, 오전 9시)
SELECT cron.schedule(
  'auto-publish-en',
  '0 14 * * *',  -- UTC 14:00 = EST 09:00
  $$
    SELECT trigger_auto_publish_by_language('en');
  $$
);

-- [기능 4] 일본어 블로그 발행 (JST = UTC+9, 새벽 6시 = KST 동일)
SELECT cron.schedule(
  'auto-publish-ja',
  '0 21 * * *',  -- UTC 21:00 = JST 06:00
  $$
    SELECT trigger_auto_publish_by_language('ja');
  $$
);

-- [기능 6] SNS 자동 배포 (발행 1시간 후)
SELECT cron.schedule(
  'sns-auto-distribute',
  '30 * * * *',  -- 매 시간 30분에 실행
  $$
    SELECT trigger_sns_distribution();
  $$
);
```

---

## 8. 개발 환경

```
Node.js: 18.x+
Package Manager: npm
Test: Vitest (unit) + Playwright (e2e)
API Mock: MSW (개발/테스트)
Linting: ESLint + Prettier (기존 설정)
```
