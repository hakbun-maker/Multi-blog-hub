# 수익화 로켓 화면 목록

> 작성일: 2026-03-15 | 버전: 1.0.0
> /screen-spec 입력 파일

---

## 화면 간 이동 경로

```
/monetize (기본 탭: 수익대시보드)
├── ?tab=dashboard   → 수익대시보드
├── ?tab=keywords    → 키워드탐색기
├── ?tab=scheduler   → 스케줄러
└── ?tab=writing     → 글작성&대기
         ↓ (수정 선택)
/editor/[post-id]    → 기존 에디터
```

---

## 화면 1: 수익대시보드

- **ID**: screen-01
- **경로**: /monetize?tab=dashboard
- **기능**: 수익화 로켓 파이프라인 현황 모니터링, 수익 분석

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| RocketStatusCard | 파이프라인 현황 4분할 카드 | 상단 전체 |
| RevenueSummaryCard | 이번달/지난달/예상 수익 | 상단 우측 |
| RevenueLineChart | 실제+예상 수익 트렌드 그래프 | 중단 좌측 |
| BlogGradeTable | 블로그 등급 + 수익 표 | 중단 우측 |
| MultiDimensionChart | 블로그별/광고별/언어별/유형별 분석 | 하단 전체 |
| **RevenueGuidePanel** | **수익화 가이드 아코디언 (기능 5)** | **최상단 버튼 → 슬라이드 다운 (기본 접힘)** |

### 상태 변수
```typescript
interface DashboardState {
  dateRange: { start: Date; end: Date };
  selectedDimension: 'blog' | 'ad_category' | 'language' | 'blog_type';
  revenueData: RevenueAnalytics[];
  blogs: BlogWithGrade[];
  pipelineStatus: PipelineCount;
  // 기능 5
  revenueGuideOpen: boolean;
  revenueGuideTargetAmount: number;
  revenueGuideResult: RevenueGuideResult | null;
}
```

### RevenueGuidePanel 상세 (기능 5)

```typescript
interface RevenueGuideResult {
  targetMonthlyRevenue: number    // 목표 월수익 (원)
  requiredBlogs: number           // 필요 블로그 수
  blogComposition: {
    type: string                  // 블로그 유형
    persona: string               // 페르소나
    count: number                 // 필요 수량
    dailyPosts: number            // 일일 발행 목표
    adFocus: string               // 집중 광고 카테고리
  }[]
  totalDailyPosts: number         // 전체 일일 발행 수 (자동)
  estimatedMonthsToTarget: number // 예상 달성 기간 (개월)
  keywordStrategyNotes: string    // 키워드 전략 요약
}

// MD 다운로드 함수 시그니처
// - 계산 결과 하단에 고정된 [↓ MD 파일로 저장] 버튼 클릭 시 실행
// - 결과가 없으면 버튼 disabled
// - 파일명: revenue-guide-{targetAmount}-{YYYYMMDD}.md
function downloadRevenueGuideAsMd(result: RevenueGuideResult): void

// MD 파일 출력 내용 예시:
// # 수익화 전략 가이드 — 월 1,000,000원 목표
// 생성일: 2026-03-16
//
// ## 목표 요약
// - 목표 월수익: 1,000,000원
// - 필요 블로그 수: 3개
// - 일일 자동 발행 수: 6개
//
// ## 블로그 구성
// | 블로그 | 유형 | 페르소나 | 일일 발행 | 집중 광고 카테고리 |
// ...
//
// ## 키워드 전략
// ...
//
// ## 예상 달성 기간
// 약 3개월 (수익 안정화 기준)
```

### API 엔드포인트
```
GET /api/monetize/dashboard
  → pipelineStatus, revenueSummary, revenueTimeSeries, blogGrades
GET /api/monetize/analytics?dimension=blog&startDate=...&endDate=...
  → multiDimensionData
POST /api/monetize/revenue-guide
  → { targetAmount: number } → RevenueGuideResult
```

---

## 화면 2: 키워드탐색기

- **ID**: screen-02
- **경로**: /monetize?tab=keywords
- **기능**: 3가지 유형의 키워드 탐색 + Revenue Score 확인 + 달력 등록

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| KeywordTypeSelector | 골드/이벤트/시즌 탭 선택 | 상단 |
| GoldKeywordPanel | 검색어 입력 + 결과 목록 | 메인 (골드 탭) |
| EventKeywordPanel | 날짜 범위 + 이벤트 목록 | 메인 (이벤트 탭) |
| SeasonKeywordPanel | 계절/월 선택 + 시즌 키워드 | 메인 (시즌 탭) |
| KeywordResultCard | 개별 키워드 카드 | 결과 리스트 |
| RevenueScoreBar | Revenue Score 시각화 | 키워드 카드 내부 |
| KeywordDetailModal | 키워드 상세 + 달력 등록 | 모달 |

### 골드 키워드 탐색 패널

```typescript
interface GoldKeywordSearch {
  searchQuery: string;
  filters: {
    minRevenueScore: number;    // 기본값: 60
    maxCompetition: number;     // 기본값: 0.7
    minSearchVolume: number;    // 기본값: 1000
    intentTypes: IntentType[];  // 필터
  };
  sortBy: 'revenue_score' | 'search_volume' | 'cpc';
  results: KeywordWithScore[];
}
```

### 이벤트 키워드 탐색 패널

```typescript
interface EventKeywordSearch {
  dateRange: { start: Date; end: Date };
  eventSources: ('ticketlink' | 'interpark' | 'culture_portal')[];
  results: EventKeyword[];
  // EventKeyword: keyword + event_name + event_date + venue + expected_cpc
}
```

### 시즌 키워드 탐색 패널

```typescript
interface SeasonKeywordSearch {
  targetMonth: number;         // 1~12
  categoryFilter: string[];   // 명절, 입시, 여행, 날씨 등
  results: SeasonKeyword[];
  // SeasonKeyword: keyword + peak_months + yoy_trend + avg_revenue_score
}
```

### API 엔드포인트
```
GET /api/keywords/gold?q=...&minScore=60
  → keywords[] with revenue_score
GET /api/keywords/events?startDate=...&endDate=...
  → eventKeywords[]
GET /api/keywords/seasonal?month=3
  → seasonalKeywords[]
POST /api/keywords/register
  → { keyword_id, target_date }
```

---

## 화면 3: 스케줄러

- **ID**: screen-03
- **경로**: /monetize?tab=scheduler
- **기능**: 키워드 달력 확인/수정, 배분 엔진 실행, 스케줄 확정

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| SchedulerCalendar | 월간 키워드 달력 | 메인 좌측 2/3 |
| DistributionEnginePanel | 자동 배분 설정 + 실행 | 메인 우측 1/3 |
| KeywordScheduleCard | 날짜별 키워드 카드 | 달력 셀 내부 |
| BlogDistributionPreview | 배분 결과 프리뷰 테이블 | 하단 패널 |
| ScheduleConfirmModal | 스케줄 확정 전 검토 모달 | 모달 |

### 달력 컴포넌트 데이터

```typescript
interface SchedulerCalendarData {
  year: number;
  month: number;
  entries: ScheduleEntry[];  // date + blog + keyword + time + status
}

interface ScheduleEntry {
  id: string;
  keyword: string;
  keywordGrade: Grade;
  blogName: string;
  blogGrade: Grade;
  scheduledDate: Date;
  scheduledTime: string;
  status: 'pending' | 'confirmed' | 'writing' | 'done';
}
```

### 배분 엔진 패널

```typescript
interface DistributionEngineConfig {
  targetDateRange: { start: Date; end: Date };
  selectedBlogs: string[];         // blog_id[]
  rulesConfig: {
    gradeMatching: boolean;        // 등급 매칭 여부
    timeDifferentiation: boolean;  // 시간 차별화
    dateDifferentiation: boolean;  // 날짜 분산
  };
  quotaOverride?: Record<string, number>;  // 블로그별 쿼터 오버라이드
}
```

### API 엔드포인트
```
GET /api/scheduler/calendar?year=2026&month=3
  → scheduleEntries[]
PUT /api/scheduler/reassign
  → { entry_id, new_blog_id, new_date, new_time }
POST /api/scheduler/distribute
  → { config: DistributionEngineConfig } → preview: ScheduleEntry[]
POST /api/scheduler/confirm
  → { entries: ScheduleEntry[] } → { success, pg_cron_ids }
```

---

## 화면 4: 글작성&대기

- **ID**: screen-04
- **경로**: /monetize?tab=writing
- **기능**: AI 글쓰기 현황 모니터링, 보류 글 검토 및 승인

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| PipelineStatusBoard | Kanban 파이프라인 현황 | 상단 |
| ReviewQueueList | 보류 글 목록 | 하단 좌측 |
| QualityScoreReport | 선택된 글 검수 리포트 | 하단 우측 |
| PostActionButtons | 승인/수정/거절 버튼 | 리포트 하단 |
| WritingProgressCard | 현재 작성 중인 글 진행률 | 파이프라인 내부 |

### 파이프라인 상태 카운트

```typescript
interface PipelineStatus {
  pending: number;           // 대기 중 (스케줄 확정됨, 아직 작성 전)
  writing: number;           // AI 작성 중
  reviewing: number;         // 검수 중
  autoPublished: number;     // 자동 발행 완료 (이번 달)
  reviewQueue: number;       // 보류 대기 (사용자 검토 필요)
  published: number;         // 사용자 승인 발행 완료
}
```

### 검수 리포트 상세

```typescript
interface QualityScoreReport {
  postId: string;
  keyword: string;
  blog: string;
  totalScore: number;        // 0~50
  autoPublishThreshold: 45;
  breakdown: {
    seo: {
      score: number;         // 0~20
      details: {
        metaTag: boolean;
        keywordDensity: number;
        internalLinks: number;
        imageAlt: boolean;
      }
    };
    quality: {
      score: number;         // 0~15
      details: {
        wordCount: number;
        pasonaStructure: boolean;
        readabilityScore: number;
      }
    };
    revenue: {
      score: number;         // 0~15
      details: {
        adSectionTargeting: boolean;
        intentMatch: number;
        aeoStructure: boolean;
      }
    };
  };
  reviewReason: string;      // 45점 미만인 경우 사유
  contentPreview: string;    // 글 앞부분 미리보기
}
```

### API 엔드포인트
```
GET /api/writing/pipeline
  → pipelineStatus counts
GET /api/writing/review-queue
  → reviewQueue: PostWithScore[]
GET /api/writing/report/[post-id]
  → QualityScoreReport
POST /api/writing/approve/[post-id]
  → { success, published_url }
POST /api/writing/reject/[post-id]
  → { success, keyword_returned_to_pool: boolean }
```

---

---

## 화면 5: 블로그 설정 — 언어/지역 탭 (기능 4)

- **ID**: screen-05
- **경로**: /blogs/[id]/settings?tab=language
- **기능**: 블로그별 작성 언어 설정

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| BlogSettingsTabNav | 설정 탭 네비게이션 | 상단 |
| LanguageSelector | 언어 선택 (ko/en/ja) | 메인 |
| DataSourcePreview | 선택 언어의 데이터소스 미리보기 | 언어 선택 하단 |
| WriteStyleInput | 글쓰기 스타일 힌트 입력 | 하단 |

```typescript
interface LanguageConfig {
  language: 'ko' | 'en' | 'ja'
  writeStyle: string
  // 언어별 데이터소스 자동 매핑 (읽기 전용 표시)
  dataSources: {
    primary: string    // 예: ko → "네이버 광고 API"
    secondary: string  // 예: ko → "Google KWP"
    tertiary: string   // 예: ko → "네이버 DataLab"
  }
}
```

### API 엔드포인트
```
GET /api/blogs/[id]/settings/language
PUT /api/blogs/[id]/settings/language
  → { language, writeStyle }
```

---

## 화면 6: 블로그 설정 — SNS 자동화 탭 (기능 6)

- **ID**: screen-06
- **경로**: /blogs/[id]/settings?tab=sns
- **기능**: SNS 플랫폼 연결, 포맷 프롬프트 설정, 이미지 생성 도구 선택

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| BlogSettingsTabNav | 설정 탭 네비게이션 | 상단 |
| PlatformToggleGroup | 플랫폼별 ON/OFF + 토큰 입력 | 상단 |
| SNSFormatPromptInput | 플랫폼별 포맷 프롬프트 텍스트에어리어 | 중단 |
| ImageGenToggle | 이미지 생성 도구 선택 + 잠금 | 하단 |

### 플랫폼 연결 데이터

```typescript
interface PlatformConnection {
  platform: 'instagram' | 'twitter' | 'threads'
  enabled: boolean
  credentials: Record<string, string>  // 서버에서 마스킹 처리
  formatPrompt: string
  lastTestAt?: Date
  status: 'connected' | 'error' | 'not_configured'
}
```

### API 엔드포인트
```
GET /api/blogs/[id]/settings/sns
PUT /api/blogs/[id]/settings/sns
  → { platforms: PlatformConnection[], imageGen: ImageGenConfig }
POST /api/blogs/[id]/settings/sns/test/[platform]
  → { success, message }  ← 연결 테스트
```

---

## 화면 7: 블로그 설정 — 수익화 연동 탭 (기능 7)

- **ID**: screen-07
- **경로**: /blogs/[id]/settings?tab=monetize
- **기능**: 쿠팡파트너스 파트너 ID 등록, 자동 삽입 설정

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| BlogSettingsTabNav | 설정 탭 네비게이션 | 상단 |
| CoupangPartnerInput | 파트너 ID 입력 + 저장 | 상단 |
| AffiliateAutoInsertToggle | PASONA O섹션 자동 삽입 ON/OFF | 중단 |
| AffiliateStatsCard | 제휴 클릭/예상 수익 통계 | 하단 |

### API 엔드포인트
```
GET /api/blogs/[id]/settings/monetize
PUT /api/blogs/[id]/settings/monetize
  → { partnerId, autoInsert, maxProductsPerPost }
GET /api/blogs/[id]/affiliate-stats
  → { totalClicks, estimatedRevenue, topProducts }
```

---

## 공통 컴포넌트

| 컴포넌트 | 역할 | 재사용 위치 |
|---------|------|------------|
| GradeBadge | S/A/B/C/D 등급 배지 | 전체 |
| StatusBadge | 상태 태그 (대기/완료/보류) | 전체 |
| RevenueAmount | 금액 포맷팅 표시 | 대시보드, 리포트 |
| MonetizeTabNav | 4탭 네비게이션 | 최상단 고정 |
| LoadingRocket | 로딩 스피너 (로켓 테마) | 전체 |
| BlogSettingsTabNav | 블로그 설정 4탭 (기능 4/6/7) | 블로그 설정 페이지 |

---

## 라우팅 구조

```
app/
└── (dashboard)/
    ├── monetize/
    │   ├── page.tsx          ← 메인 (탭 라우팅)
    │   ├── layout.tsx        ← MonetizeTabNav 포함
    │   └── components/
    │       ├── dashboard/    ← 수익대시보드 컴포넌트
    │       │   └── RevenueGuidePanel.tsx  ← 기능 5
    │       ├── keywords/     ← 키워드탐색기 컴포넌트
    │       ├── scheduler/    ← 스케줄러 컴포넌트
    │       └── writing/      ← 글작성&대기 컴포넌트
    └── blogs/
        └── [id]/
            └── settings/
                ├── page.tsx          ← 설정 탭 라우팅
                └── components/
                    ├── BlogSettingsTabNav.tsx
                    ├── language/     ← 기능 4: 언어/지역 탭
                    ├── sns/          ← 기능 6: SNS 자동화 탭
                    │   ├── PlatformToggleGroup.tsx
                    │   ├── SNSFormatPromptInput.tsx
                    │   └── ImageGenToggle.tsx
                    └── monetize/     ← 기능 7: 수익화 연동 탭
                        ├── CoupangPartnerInput.tsx
                        └── AffiliateAutoInsertToggle.tsx
```
