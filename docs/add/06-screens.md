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
└── ?tab=writing     → 글작성&대기 (Growth+)
         ↓ (수정 선택)
/editor/[post-id]?from=review → 수익화 글 수정 에디터 (Growth+)
  ├── 메인: 기존 에디터 (PostEditor)
  └── 사이드패널: 검수 리포트 + AI 개선 + SEO 체크리스트
       └── FeatureGate(auto_writing_pipeline, growth) 로 잠금
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
| QualityScoreReport | 선택된 글 검수 리포트 (검수 A/B 자동 전환) | 하단 우측 |
| PostActionButtons | 승인/수정/거절 버튼 → "수정" 클릭 시 `/editor/[post-id]?from=review` (화면 4-1)로 이동 | 리포트 하단 |
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

> 키워드 유형에 따라 **검수 A**(골드/시즌) 또는 **검수 B**(이벤트) 자동 전환

```typescript
// 검수 A — 골드/시즌 키워드 (3축 균형)
interface StandardScoreReport {
  postId: string;
  keyword: string;
  blog: string;
  checkType: 'standard';
  totalScore: number;        // 0~50
  autoPublishThreshold: 45;
  breakdown: {
    discovery: {
      score: number;         // 0~17
      details: {
        seoBasic: number;    // 0~10: 메타태그, 키워드밀도, 구조, 링크
        aiSearchOpt: number; // 0~7: FAQ 아코디언, JSON-LD, 숫자/통계
      }
    };
    persuasion: {
      score: number;         // 0~18
      details: {
        pasonaStructure: number;  // 0~8: 6요소 포함 + Intent별 가중치
        intentMatch: number;      // 0~5: Intent 목적 달성도
        readability: number;      // 0~5: 문장길이, 단락, 리스트
      }
    };
    conversion: {
      score: number;         // 0~15
      details: {
        adSection: number;   // 0~8: 태그 배치, CPC 밀집, 비율 적정
        ctaAndLinks: number; // 0~7: CTA, 내부링크, 독창성
      }
    };
  };
  reviewReason: string;
  contentPreview: string;
}

// 검수 B — 이벤트 키워드 (이벤트 고유 + 공통 기술)
interface EventScoreReport {
  postId: string;
  keyword: string;
  blog: string;
  checkType: 'event';
  totalScore: number;        // 0~50
  autoPublishThreshold: 45;
  breakdown: {
    eventSpecific: {
      score: number;         // 0~35
      details: {
        intentAchievement: number;   // 0~8
        pasonaWeightMatch: number;   // 0~7
        requiredElements: number;    // 0~7
        forbiddenElements: number;   // 0~7
        personaTone: number;         // 0~6
      }
    };
    commonTech: {
      score: number;         // 0~15
      details: {
        seo: number;         // 0~5
        aiSearchOpt: number; // 0~5
        adCode: number;      // 0~5
      }
    };
  };
  reviewReason: string;
  contentPreview: string;
}

type QualityScoreReport = StandardScoreReport | EventScoreReport;
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

## 화면 4-1: 수익화 글 수정 에디터

- **ID**: screen-04-1
- **경로**: `/editor/[post-id]?from=review`
- **기능**: 보류(review_queue) 글 검수 리포트 확인 + 수정 + 재검수 요청
- **진입 조건**: 화면 4 (글작성&대기) ReviewQueueList에서 "수정" 클릭 시 진입

### 플랜 권한 게이팅

> ⚠️ **Growth 이상 전용 화면** — 이 화면은 수익화 파이프라인의 일부이므로
> `auto_writing_pipeline` 기능키로 접근 제어한다.

| 항목 | 내용 |
|------|------|
| **feature_key** | `auto_writing_pipeline` |
| **최소 플랜** | Growth (월 99,000원) |
| **프론트엔드** | `FeatureGate` 래퍼 — `?from=review` 감지 시 사이드패널 영역을 `FeatureGate`로 감싸기 |
| **백엔드** | API 라우트에서 `getUserPlanContext()` → `isFeatureEnabled(ctx, 'auto_writing_pipeline')` 체크 |
| **미달 시 동작** | `/editor/[post-id]`는 범용 에디터로 정상 표시, `?from=review` 사이드패널만 잠금 → UpgradeModal 표시 |
| **API 거부** | 미달 플랜에서 재검수/AI개선 API 호출 시 `403 { error: 'plan_required', minPlan: 'growth' }` 반환 |

**접근 제어 흐름:**

```
사용자가 /editor/[post-id]?from=review 접근
  │
  ├─ Growth/Scale → 전체 기능 표시 (검수 사이드패널 + PASONA 마커 + 재검수 버튼)
  │
  └─ Lite/Basic/Pro → 범용 에디터만 표시
       └─ 사이드패널 영역: FeatureGate(mode='replace')
            → "자동 글쓰기 파이프라인은 Growth 플랜부터 사용할 수 있어요."
            → [업그레이드] 버튼 → UpgradeModal
```

### 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  ← 검수 대기로 돌아가기          [임시저장]  [재검수 요청]        │
├──────────────────────────────────────┬──────────────────────────┤
│  (A) 메인 에디터 영역 (2/3)          │  (B) 검수 사이드패널 (1/3)│
│                                      │  ┌────────────────────┐  │
│  MonetizeEditorHeader                │  │ QualityScoreSidebar│  │
│  ┌─────────────────────────────┐     │  │  총점/보류사유/축별 │  │
│  │ 키워드: "무선 이어폰 추천"   │     │  │  점수 breakdown    │  │
│  │ (골드/S) · 테크리뷰 블로그 (A)│    │  └────────────────────┘  │
│  └─────────────────────────────┘     │  ┌────────────────────┐  │
│                                      │  │ AIImproveSuggestion│  │
│  제목 입력                           │  │  [PASONA 보강하기]  │  │
│                                      │  │  [SEO 최적화하기]   │  │
│  PostEditor (TipTap WYSIWYG)         │  │  [CTA 강화하기]     │  │
│  ┌─────────────────────────────┐     │  └────────────────────┘  │
│  │ [P] 문제 제기 ─────────     │     │  ┌────────────────────┐  │
│  │ [A] 감정 공감 ─────────     │     │  │ SEOChecklist       │  │
│  │ [S] 해결책 제시 ────────    │     │  │  ☑ 메타 타이틀     │  │
│  │ [O] 제안/오퍼 🏷️ 광고존 ── │     │  │  ☑ H2 키워드 포함  │  │
│  │ [N] 범위 한정 ─────────     │     │  │  ☐ FAQ 아코디언    │  │
│  │ [A] 행동 유도 (CTA) ───     │     │  │  ☑ JSON-LD        │  │
│  └─────────────────────────────┘     │  └────────────────────┘  │
│                                      │                          │
│  [태그] [SEOMetaForm]                │                          │
└──────────────────────────────────────┴──────────────────────────┘
```

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 | 신규/기존 |
|---------|------|------|----------|
| **MonetizeEditorHeader** | 키워드(유형+등급) + 블로그(등급) 컨텍스트 표시 | 에디터 상단 | 신규 |
| **PasonaSectionMarker** | 본문 H2 태그를 분석하여 P-A-S-O-N-A 구분 배지 표시 | 에디터 본문 좌측 | 신규 |
| **QualityScoreSidebar** | 검수 점수 breakdown + 보류 사유 + 축별 시각 바 | 우측 사이드패널 상단 | 신규 |
| **AIImproveSuggestion** | 부족 항목별 AI 부분 개선 버튼 (클릭→해당 섹션 재생성) | 우측 사이드패널 중단 | 신규 |
| **SEOChecklist** | SEO/AEO 항목 실시간 체크리스트 | 우측 사이드패널 하단 | 신규 |
| **ReReviewButton** | "재검수 요청" → status를 pending으로 변경 + 수정 내용 저장 | 에디터 헤더 우측 | 신규 |
| PostEditor | TipTap WYSIWYG 에디터 (기존 그대로) | 메인 에디터 영역 | 기존 |
| SEOMetaForm | SEO 메타 타이틀/설명 입력 | 에디터 하단 | 기존 |
| FeatureGate | 플랜 미달 시 사이드패널 잠금 | 사이드패널 래퍼 | 기존 |
| UpgradeModal | 업그레이드 안내 다이얼로그 | 모달 | 기존 |

### 상태 변수

```typescript
interface MonetizeEditorState {
  // 기존 에디터 상태
  post: ScheduledPost | null;
  title: string;
  htmlContent: string;
  seoMeta: { title: string; description: string };
  saveStatus: 'idle' | 'saving' | 'saved';

  // 수익화 전용 상태 (from=review 일 때만 로드)
  qualityReport: QualityScoreReport | null;
  keyword: {
    keyword: string;
    type: 'gold' | 'season' | 'event';
    grade: Grade;
    intent: string;
  } | null;
  blog: {
    name: string;
    grade: Grade;
    persona: string;
  } | null;

  // AI 개선 상태
  improvingSection: 'pasona' | 'seo' | 'cta' | null;

  // SEO 체크리스트 (실시간 계산)
  seoChecklist: {
    metaTitle: boolean;       // 메타 타이틀 존재 + 30자 이내
    metaDescription: boolean; // 메타 설명 존재 + 120자 이내
    h2KeywordMatch: boolean;  // H2에 키워드 포함
    faqAccordion: boolean;    // FAQ 아코디언 존재
    jsonLd: boolean;          // JSON-LD 구조화 데이터
    imageAlt: boolean;        // 이미지 alt 태그
    internalLinks: boolean;   // 내부 링크 1개 이상
  };
}
```

### 진입/퇴장 흐름

```
[화면 4: 글작성&대기]
  ReviewQueueList → "수정" 클릭
    │
    ▼
[화면 4-1: /editor/{post-id}?from=review]
  1) GET /api/writing/edit-context/{post-id} → 포스트+검수+키워드+블로그 로드
  2) 사용자 수정 작업 (자동저장 3초 디바운스)
  3) "재검수 요청" 클릭
    │
    ▼
  POST /api/writing/re-review/{post-id}
    → status: review_queue → pending (수정 내용 반영)
    → 파이프라인 재진입: pending → writing(AI 재생성) → reviewing → ...
    │
    ▼
[화면 4: 글작성&대기] 로 리다이렉트
```

### API 엔드포인트

```
GET /api/writing/edit-context/[post-id]
  → { post, qualityReport, keyword, blog }
  ← 권한 체크: auto_writing_pipeline 필수
  ← 소유권 체크: 해당 post가 사용자 블로그 소속인지 검증

POST /api/writing/re-review/[post-id]
  → { content_draft, seo_meta }
  ← 권한 체크: auto_writing_pipeline 필수
  ← 상태 체크: status === 'review_queue'인 글만 허용
  ← 응답: { success, new_status: 'pending' }

POST /api/writing/ai-improve/[post-id]
  → { target: 'pasona' | 'seo' | 'cta' }
  ← 권한 체크: auto_writing_pipeline 필수
  ← 응답: { improved_html_section, improved_score_estimate }
```

### 구현 시 주의사항

> 1. **`/editor/[post-id]` 페이지는 하나** — `?from=review` 유무로 수익화 사이드패널 표시 분기
> 2. **사이드패널 전체를 `FeatureGate`로 감싼다** — 에디터 본문은 항상 접근 가능, 수익화 기능만 잠금
> 3. **API 3개 모두 서버 사이드 `isFeatureEnabled` 체크 필수** — 프론트 우회 방지
> 4. **PASONA 마커는 content_draft의 H2 태그 패턴 매칭으로 표시** — `## [P]`, `## [A]` 등
> 5. **재검수 시 content_draft만 업데이트** — 새로운 post_quality_scores 행은 reviewing 단계에서 AI가 재채점

---

## 화면 5: 블로그 설정 — 언어/지역 탭 (기능 4)

- **ID**: screen-05
- **경로**: /blogs/[id]/settings?tab=language
- **기능**: 블로그별 작성 언어 설정

### 플랜 권한 게이팅

> ⚠️ **Growth 이상 전용 화면** — `multilingual` 기능키로 접근 제어.
> ko(기본값)는 모든 플랜에서 사용 가능. **ko 이외의 언어 선택 시** Growth+ 필요.

| 항목 | 내용 |
|------|------|
| **feature_key** | `multilingual` |
| **최소 플랜** | Growth (월 99,000원) |
| **프론트엔드** | `FeatureGate` 래퍼 — ko 이외 언어 옵션에 잠금 표시 |
| **백엔드** | `PUT /api/blogs/[id]/settings/language`에서 `isFeatureEnabled(ctx, 'multilingual')` 체크 |
| **미달 시 동작** | ko 이외 언어 선택 불가 → UpgradeModal 표시 |

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| BlogSettingsTabNav | 설정 탭 네비게이션 | 상단 |
| LanguageSelector | 언어 선택 (6개 언어) — ko 이외는 Growth+ 잠금 | 메인 |
| DataSourcePreview | 선택 언어의 데이터소스 자동 매핑 미리보기 (읽기 전용, 런타임 계산) | 언어 선택 하단 |
| WriteStyleInput | 글쓰기 스타일 힌트 입력 | 하단 |
| AffiliateDefaultNotice | 언어 변경 시 기본 제휴 플랫폼 안내 (ko→쿠팡, 그 외→Amazon) | 하단 |

### 지원 언어 (6개)

| 코드 | 언어 | 지역 | 키워드 1순위 | 트렌드 | 제휴 기본값 | 발행 시간 | AdSense CPC |
|------|------|------|------------|-------|-----------|----------|------------|
| `ko` | 한국어 | 한국 | 네이버 광고 API | 네이버 DataLab | 쿠팡 | KST 06:00 | 중간 |
| `en` | English | 미국/글로벌 | Google KWP | Google Trends | Amazon | PST 09:00 | 높음 |
| `ja` | 日本語 | 일본 | Google KWP (JP) | Google Trends | Amazon JP | JST 06:00 | 높음 |
| `de` | Deutsch | 독일/DACH | Google KWP (DE) | Google Trends | Amazon DE | CET 07:00 | 매우 높음 |
| `pt_br` | Português | 브라질 | Google KWP (BR) | Google Trends | Amazon BR | BRT 08:00 | 중간 |
| `es` | Español | 스페인/LATAM | Google KWP (ES) | Google Trends | Amazon ES | CET 08:00 | 중~높음 |

> **dataSources는 DB에 저장하지 않음** — `getDataSourceConfig(language)` 함수에서 런타임 계산.
> DataSourcePreview는 이 함수의 결과를 읽기 전용으로 표시할 뿐.

```typescript
type BlogLanguage = 'ko' | 'en' | 'ja' | 'de' | 'pt_br' | 'es'

interface LanguageConfig {
  language: BlogLanguage
  writeStyle: string
}

// DataSourcePreview에 표시되는 런타임 계산 결과 (DB 미저장)
interface DataSourceDisplay {
  primary: string     // 예: ko → "네이버 광고 API", de → "Google KWP (DE)"
  secondary: string   // 예: ko → "Google KWP", de → "—"
  trend: string       // 예: ko → "네이버 DataLab", de → "Google Trends"
  affiliate: string   // 예: ko → "쿠팡파트너스", de → "Amazon DE"
  timezone: string    // 예: ko → "Asia/Seoul (KST 06:00)"
}
```

### API 엔드포인트
```
GET /api/blogs/[id]/settings/language
PUT /api/blogs/[id]/settings/language
  → { language, writeStyle }
  ← 권한 체크: language !== 'ko' 인 경우 isFeatureEnabled(ctx, 'multilingual') 필수
  ← 미달 시 403 { error: 'plan_required', minPlan: 'growth' }
```

---

## 화면 6: 블로그 설정 — SNS 자동화 탭 (기능 6)

- **ID**: screen-06
- **경로**: /blogs/[id]/settings?tab=sns
- **기능**: SNS 플랫폼 연결, 포맷 프롬프트 설정, 이미지 생성 설정

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| BlogSettingsTabNav | 설정 탭 네비게이션 | 상단 |
| PlatformToggleGroup | 플랫폼별 ON/OFF + OAuth 연결 버튼 | 상단 |
| SNSFormatPromptInput | PASONA 기반 플랫폼별 시스템 프롬프트 (기본/직접편집) | 중단 |
| ImageGenToggle | 이미지 생성 ON/OFF + 스타일 설정 (API 키는 화면 9에서 등록) | 하단 |
| **ApiKeyStatusBadge** | **Imagen API 키 연결 상태 표시 → 미등록 시 "설정 > API 키 관리에서 등록" 링크** | **ImageGenToggle 내부** |

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
- **기능**: 쿠팡파트너스 / Amazon Associates 자동 삽입 설정, 제휴 통계

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| BlogSettingsTabNav | 설정 탭 네비게이션 | 상단 |
| **ApiKeyStatusBadge** (×2) | **쿠팡파트너스 + Amazon Associates 연결 상태 표시 → 미등록 시 "설정 > API 키 관리에서 등록" 링크** | **상단** |
| AffiliateProviderSelector | 제휴 플랫폼 선택 (쿠팡/Amazon/둘 다) — 블로그 언어 ko→쿠팡 기본, en/ja→Amazon 기본 | 상단 하단 |
| AffiliateAutoInsertToggle | PASONA O섹션 자동 삽입 ON/OFF (파트너 ID 등록 시에만 활성화) | 중단 |
| AffiliateStatsCard | 제휴 클릭/예상 수익 통계 (쿠팡+Amazon 합산) | 하단 |

> **참고**: 쿠팡파트너스 ID / Amazon Associates Tag 입력은 `/settings?tab=api-keys` (화면 9)에서 일괄 관리.
> 이 화면에서는 연결 상태 확인 + 자동 삽입 설정만 담당.
> 블로그 언어가 ko인 경우 쿠팡 기본, en/ja인 경우 Amazon 기본 (둘 다 활성화 가능).

### API 엔드포인트
```
GET /api/blogs/[id]/settings/monetize
PUT /api/blogs/[id]/settings/monetize
  → { autoInsert, maxProductsPerPost, affiliateProvider: 'coupang' | 'amazon' | 'both' }
GET /api/blogs/[id]/affiliate-stats
  → { totalClicks, estimatedRevenue, topProducts, byProvider: { coupang, amazon } }
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
| **FeatureGate** | **기능 잠금 래퍼 (overlay/replace 모드)** | **플랜 미달 페이지** |
| **UpgradeModal** | **업그레이드 안내 다이얼로그** | **잠금 기능 클릭 시** |
| **PlanSettingsTab** | **설정 > 요금제 탭 (5개 플랜 비교 + 선택)** | **설정 페이지** |
| **ApiKeyStatusBadge** | **특정 API 키 등록 상태 표시 (✅등록/❌미등록 + 이동 링크)** | **screen-06, screen-07 (쿠팡+Amazon)** |
| **ApiGuideAccordion** | **접히는 API 발급 가이드 (단계별 설명 + 발급처 링크 + 비용)** | **screen-09 (API 키 관리)** |
| **ConsentGate** | **동의 여부 확인 래퍼 — 미동의 시 동의 모달/패널 표시 후 콜백 실행** | **API 키 등록, 수익화 로켓, SNS/AdSense/블로그 연동, 제휴마케팅** |
| **ConsentCheckbox** | **회원가입 시 약관 동의 체크박스 그룹 (전체동의 토글 + 개별 체크 + 전문보기)** | **회원가입 페이지** |
| **ConsentReAgreementModal** | **약관 개정 시 재동의 모달 (변경 요약 + 전문보기 + 동의 버튼)** | **로그인 후 진입 시** |
| **ConsentInlinePanel** | **기능 사용 시점 인라인 동의 패널 (요약 + 아코디언 전문 + 동의 버튼)** | **API 키 등록, 제휴마케팅 설정** |
| **ConsentManagementSection** | **설정 > 동의 관리 — 동의 현황 + 개별 철회 버튼** | **설정 페이지** |

---

## 화면 8: 설정 — 요금제 탭 (구현 완료)

- **ID**: screen-08
- **경로**: /settings?tab=plan
- **기능**: 5단계 요금제 비교 + 선택 + 변경

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| PlanSettingsTab | 요금제 탭 전체 | 메인 |
| PlanCard (×5) | 플랜별 카드 (이름, 가격, 블로그 한도, 기능 목록) | 카드 그리드 |
| BillingToggle | 월간/연간 토글 | 상단 가운데 |
| **PlanUpgradeConsentStep** | **업그레이드 시 묶음 동의 스텝 — "전체 동의" 토글 + bundled 동의 개별 체크 + "상세 보기" + deferred 동의 안내 문구. 미수집 bundled 동의 0건이면 자동 스킵.** | **업그레이드 클릭 시 모달/스텝** |

### 상태 변수
```typescript
interface PlanSettingsState {
  plans: PlanData[]           // /api/plans에서 fetch
  currentPlanId: PlanId       // 현재 사용자 플랜
  annual: boolean             // 월간/연간 토글
  changing: string | null     // 변경 중인 플랜 ID
  // 묶음 동의 스텝
  consentStep: {
    isOpen: boolean                    // 동의 스텝 표시 여부
    targetPlanId: PlanId | null        // 업그레이드 대상 플랜
    bundledConsents: ConsentType[]     // 묶음 수집 대상 (미동의 항목만)
    deferredConsents: ConsentType[]    // "연결 시 별도 동의" 안내용
    checkedConsents: Set<ConsentType>  // 체크된 동의 항목
    allChecked: boolean               // 전체 동의 토글 상태
  }
}
```

### API 엔드포인트
```
GET /api/plans → 전체 플랜 + 기능 + 할인 정책
GET /api/user/plan → 내 플랜 컨텍스트
PATCH /api/user/plan → { planId, billingCycle } → 플랜 변경
```

---

## 화면 9: 설정 — API 키 관리 탭 (기존 ai-keys 탭 확장)

- **ID**: screen-09
- **경로**: /settings?tab=api-keys
- **기능**: 블로거가 사용할 **모든 외부 API 키를 한 곳에서** 등록·관리 + 접히는 발급 가이드
- **기존**: `/settings?tab=ai-keys` (AI 키 4종만) → 확장하여 키워드·쿠팡까지 통합

### 레이아웃 구조

```
┌──────────────────────────────────────────────────────────────┐
│  설정  [계정] [API 키 관리] [알림] [스니펫] [요금제]           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📝 AI 글쓰기 API                                            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Claude    sk-ant-...4f2a   ✅ 활성  [테스트] [삭제]   │    │
│  │ OpenAI    미등록            ──       [+ 등록]         │    │
│  │ Gemini    미등록            ──       [+ 등록]         │    │
│  │ ▶ 발급 가이드 (접히는 아코디언)                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  🖼️ 이미지 생성 API                                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Google Imagen 3   AIza...8x2q   ✅ 활성  [테스트]     │    │
│  │ ▶ 발급 가이드 (접히는 아코디언)                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  🔍 키워드 탐색 API                                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 네이버 광고 API      ✅ 등록됨   [테스트] [수정]       │    │
│  │ 네이버 검색 API      ❌ 미등록   [+ 등록]             │    │
│  │ Google Keyword Planner  ❌ 미등록   [+ 등록]          │    │
│  │ ▶ 발급 가이드 (접히는 아코디언)                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  💰 수익화 연동                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 쿠팡파트너스 ID     AF12...     ✅ 등록됨  [수정]      │    │
│  │ Amazon Associates   미등록       ──       [+ 등록]     │    │
│  │ ▶ 발급 가이드 (접히는 아코디언)                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 컴포넌트 목록

| 컴포넌트 | 역할 | 위치 |
|---------|------|------|
| **ApiKeysTab** | 탭 전체 컨테이너 (4개 섹션 구성) | 메인 |
| **ApiKeySection** | 카테고리별 카드 (제목 + 키 목록 + 가이드 아코디언) | 반복 |
| **ApiKeyRow** | 개별 키: 마스킹 표시 + 활성/비활성 + 테스트 + 삭제 | 섹션 내부 |
| **ApiKeyRegisterForm** | 키 등록 폼: provider 선택 + 키 입력 (password) + 저장 | 모달/인라인 |
| **ApiKeyTestButton** | 연결 테스트 (실제 API 호출) → 성공/실패 표시 | 키 행 우측 |
| **ApiGuideAccordion** | **접히는 발급 가이드 (카테고리별)** | 각 섹션 하단 |

### ApiGuideAccordion 상세 — 접히는 가이드 콘텐츠

> 각 카테고리 하단에 `<details>` 또는 Accordion 컴포넌트로 접힌 상태 기본.
> 펼치면 단계별 발급 가이드 + 비용 + 주의사항 표시.

```typescript
interface ApiGuideContent {
  title: string;           // "Claude API 키 발급 방법"
  steps: string[];         // 단계별 가이드
  signupUrl: string;       // 발급처 링크
  cost: string;            // 비용 안내
  rateLimit?: string;      // 호출 제한 (있는 경우)
  warnings?: string[];     // 주의사항
  estimatedTime: string;   // 예상 소요 시간
}
```

**카테고리별 가이드 내용:**

#### (1) AI 글쓰기 API 가이드

| 공급자 | 접힌 제목 | 펼친 내용 |
|-------|----------|----------|
| Claude | "Anthropic API 키 발급 방법" | 1. console.anthropic.com 가입 → 2. API Keys 메뉴 → 3. Create Key → 4. 결제 수단 등록 · 비용: Sonnet $3/$15 per 1M tokens · 글 1편 약 $0.03~0.05 |
| OpenAI | "OpenAI API 키 발급 방법" | 1. platform.openai.com 가입 → 2. API Keys → 3. Create new secret key → 4. 결제 수단 등록 · 비용: GPT-4o $2.50/$10 per 1M tokens · 글 1편 약 $0.02~0.04 |
| Gemini | "Google Gemini API 키 발급 방법" | 1. aistudio.google.com 접속 → 2. Get API key → 3. Create API key · 비용: Flash $0.10/$0.40 per 1M tokens · 글 1편 약 $0.005~0.01 · 무료 티어 있음 |

#### (2) 이미지 생성 API 가이드

| 공급자 | 접힌 제목 | 펼친 내용 |
|-------|----------|----------|
| Imagen 3 | "Google Imagen 3 API 키 발급 방법" | 1. Google Cloud Console 프로젝트 생성 → 2. 결제 계정 연결 → 3. Vertex AI API 활성화 → 4. Credentials → API Key 생성 · 비용: 약 $0.04/장 · 무료 크레딧 $300 (90일) 활용 가능 |

#### (3) 키워드 탐색 API 가이드

| 공급자 | 접힌 제목 | 펼친 내용 |
|-------|----------|----------|
| 네이버 광고 | "네이버 광고 API 키 발급 방법" | 1. searchad.naver.com 가입 → 2. 도구 → API 사용 관리 → 3. 라이선스 발급 요청 → 4. 승인 후 Key+Secret 확인 · 무료 · 일 100,000회 |
| 네이버 검색 | "네이버 검색 API 키 발급 방법" | 1. developers.naver.com 로그인 → 2. 앱 등록 → 3. 사용 API: "검색" 선택 → 4. Client ID+Secret 확인 · 무료 · 일 25,000회 |
| Google KWP | "Google Keyword Planner API 발급 방법" | 1. ads.google.com 계정 생성 → 2. 도구 → API 센터 → 3. 개발자 토큰 신청 · 무료 · 프로덕션 승인 2~4주 소요 |

#### (4) 수익화 연동 가이드

| 공급자 | 접힌 제목 | 펼친 내용 |
|-------|----------|----------|
| 쿠팡파트너스 | "쿠팡파트너스 가입 및 ID 확인 방법" | 1. partners.coupang.com 가입 → 2. 가입 승인 대기 → 3. 파트너 ID 확인 (대시보드) · 수익: 구매금액 3% 수수료 · 통장 등록 필요 |
| Amazon Associates | "Amazon Associates 가입 및 Tag 확인 방법" | 1. affiliate-program.amazon.com 가입 (또는 각국 도메인: amazon.co.jp 등) → 2. 계정 정보 입력 + 웹사이트 등록 → 3. 180일 내 3건 판매 달성 시 정식 승인 → 4. Associates Tag (Tracking ID) 확인 (예: myblog-20) · 수익: 카테고리별 1~10% 수수료 (전자제품 ~4%, 패션 ~10%) · ⚠️ 180일 내 3건 미달성 시 계정 비활성화 → 재가입 가능 · 국가별 별도 가입 필요 (US/JP/UK 등) |

### 상태 변수

```typescript
interface ApiKeysTabState {
  // 등록된 키 목록 (기존 ai_api_keys 테이블 확장)
  keys: ApiKeyEntry[];

  // 등록 폼 상태
  registerForm: {
    isOpen: boolean;
    category: 'ai' | 'image' | 'keyword' | 'monetize';
    provider: string;
    apiKey: string;
    apiSecret?: string;     // 네이버 API처럼 Key+Secret 쌍인 경우
    saving: boolean;
  };

  // 테스트 상태
  testingId: string | null;
  testResult: { success: boolean; message: string } | null;

  // 가이드 아코디언 열림 상태
  openGuides: Set<string>;  // 열린 가이드 ID
}

interface ApiKeyEntry {
  id: string;
  category: 'ai' | 'image' | 'keyword' | 'monetize';
  provider: string;        // 'claude' | 'openai' | 'gemini' | 'imagen' | 'naver_ad' | 'naver_search' | 'google_kwp' | 'coupang' | 'amazon'
  maskedKey: string;        // "sk-ant-...4f2a"
  isActive: boolean;
  hasSecret: boolean;       // Key+Secret 쌍 여부
  createdAt: string;
}
```

### API 엔드포인트

```
GET /api/ai-keys
  → ApiKeyEntry[]  (기존 — 확장: 모든 카테고리 키 반환)

POST /api/ai-keys
  → { provider, apiKey, apiSecret? }  (기존 — 확장: 새 provider 타입 지원)

PATCH /api/ai-keys/[id]
  → { is_active }  (기존 — 그대로)

DELETE /api/ai-keys/[id]
  → (기존 — 그대로)

POST /api/ai-keys/[id]/test
  → { success, message }  (기존 — 확장: 새 provider 테스트 로직)
```

### DB 확장 (ai_api_keys 테이블)

```sql
-- 기존 CHECK 제약조건 확장
ALTER TABLE ai_api_keys DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;
ALTER TABLE ai_api_keys ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (provider IN (
    'claude', 'openai', 'gemini',              -- AI 글쓰기
    'imagen',                                   -- 이미지 생성
    'naver_ad', 'naver_search', 'google_kwp',   -- 키워드 탐색
    'coupang', 'amazon'                         -- 수익화
  ));

-- Secret이 필요한 provider용 컬럼 추가
ALTER TABLE ai_api_keys ADD COLUMN encrypted_secret TEXT;
-- 네이버 광고 API, 네이버 검색 API는 Key + Secret 쌍
```

### 구현 시 주의사항

> 1. **기존 ai-keys 탭 확장** — 새 라우트 아님. 탭 이름만 "AI API 키" → "API 키 관리"로 변경
> 2. **모든 키는 user 레벨** — blog_settings가 아닌 ai_api_keys 테이블에 user_id 기준 저장
> 3. **블로그 설정에서는 연결 상태만 표시** — screen-06(SNS), screen-07(수익화)에서는 ApiKeyStatusBadge로 "등록됨/미등록" 표시 + 이 화면으로 이동 링크
> 4. **가이드 콘텐츠는 하드코딩 OK** — 발급 절차는 자주 바뀌지 않으므로 컴포넌트 내 상수로 관리
> 5. **테스트 엔드포인트 확장** — 네이버/Google KWP/쿠팡/Amazon 각각의 API 호출로 키 유효성 검증

---

## 라우팅 구조

```
app/
└── (dashboard)/
    ├── settings/
    │   └── page.tsx          ← 설정 탭 (API 키 관리 + 요금제 탭 포함)
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
