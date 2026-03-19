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
- **AI Writing**: Claude / GPT-4o / Gemini (사용자 API 키 선택 연결)
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
| Google Imagen 3 | SNS용 이미지 생성 (iPhone 16 Warm Real Photo) | 토글 ON 시만 호출, 사용자 API 키 |
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
│  AI 글쓰기 엔진 (4-Layer 전략 적용)                       │
│  ├── L1: PASONA × Intent (글의 뼈대)                     │
│  ├── L2: SEO + AEO/GEO (발견 최적화 + FAQ 아코디언)     │
│  └── L3: 문맥광고 (광고 섹션 후처리 삽입)               │
│         ↓                                               │
│  검수 엔진 (키워드 유형별 분기)                           │
│  ├── 검수 A(골드/시즌): 발견17+설득18+수익15=50점        │
│  ├── 검수 B(이벤트): 이벤트35+공통기술15=50점            │
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
4. [L1] PASONA 구조 × Intent별 가중치 적용
   ├── AD형: 문제제기(20%) + Offer(30%) + CTA(20%), A=Agitation
   ├── REVIEW형: 솔직 평가(40%) + 비교(20%), A=Affinity
   └── INFO형: 정보 구조화(50%) + FAQ(20%), A=Affinity
   ↓
5. [L2] SEO + AEO/GEO 발견 최적화
   ├── SEO: 메타 태그, 내부 링크, 이미지 alt, 키워드 밀도
   └── AEO: 글 하단 FAQ 아코디언(<details>), 답변 80~120자, JSON-LD Schema
   ↓
6. [L3] 문맥광고 후처리 (ad_section 태그 So~N 영역 삽입)
   ↓
7. 품질 검수 (키워드 유형별 자동 분기)
   ├── 골드/시즌 → 검수 A: 발견(17) + 설득(18) + 수익(15)
   └── 이벤트 → 검수 B: 이벤트 고유(35) + 공통 기술(15)
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
  └── discovery_score + persuasion_score + conversion_score (검수 A)
  └── event_score + tech_score (검수 B)
  └── total_score (합산 45점 기준)

revenue_analytics
  └── blog_id → blogs
  └── date + estimated_revenue + actual_revenue
  └── ad_category + language + blog_type
```

---

## 4. 보안 요구사항

### API 키 관리
- **플랫폼 키** (OAuth App 등 무료): `.env.local` (Vercel Environment Variables)에 저장
- **사용자 키** (AI, 키워드, 이미지 등 유료): `blog_settings` JSONB에 AES-256 암호화 저장
- 클라이언트 사이드에서 외부 API 직접 호출 금지
- Next.js API Routes를 통한 서버사이드 호출만 허용
- 사용자 API 키는 서버에서만 복호화, 클라이언트에는 "연결됨/미연결" 상태만 노출

### 접근 제어
- `/monetize` 경로는 인증된 사용자만 접근 (기존 Supabase Auth 활용)
- RLS(Row Level Security) 정책: user_id 기반 데이터 격리

### 동의서 시스템 (Consent Management)
- **DB**: `user_consents` + `consent_versions` 테이블 (상세: `docs/동의서/00-동의서-수집구조-가이드.md`)
- **계층형 동의**: 회원가입 시 필수 2종(tos, privacy) + 기능 사용 시 Just-in-Time 동의 8종
- **동의 이력 보관**: agreed_at, ip_address, user_agent, method 기록 → 3년 보관 (전자상거래법)
- **동의 체크 미들웨어**: 기능별 API Route에서 `hasValidConsent(userId, consentType)` 사전 확인
- **약관 개정 대응**: consent_versions 버전 비교 → 미동의 시 재동의 모달 강제 표시
- **동의 철회 연쇄 처리**: 철회 시 관련 데이터(API 키, OAuth 토큰 등) 자동 삭제 + 기능 중단

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

### AI 글쓰기 API (사용자 선택)
```
지원 공급자: Claude (Anthropic) / GPT (OpenAI) / Gemini (Google)
기본 모델: claude-sonnet-4-6 / gpt-4o / gemini-2.0-flash
S등급: claude-opus-4-6 / gpt-4o / gemini-2.0-pro
Max tokens: 4,096 / 글
Temperature: 0.7
인증: 사용자가 설정에서 공급자 선택 + API Key 입력 → blog_settings.ai_settings (암호화)
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
