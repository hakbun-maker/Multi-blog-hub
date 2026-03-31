# 수익화 로켓 2차 갭 분석 & 보완 TODO

> 생성일: 2026-04-01
> 기준: `06-screens.md`, `03-user-flow.md`, `04-database-design.md`, `08-strategy-engine-spec.md` 대비 실제 코드베이스 검증
> 선행 완료: `tasks_2.md` 30/30 태스크 전부 완료

---

## 1. 4탭 점검 결과 요약

| 화면 | ID | 완성도 | 잔여 갭 |
|------|-----|--------|---------|
| 수익대시보드 | screen-01 | ~~95%~~ **100%** | ~~MultiDimensionChart 미구현~~ ✅ GAP-01 완료 |
| 키워드탐색기 | screen-02 | ~~100%~~ **60%** | 자동화 파이프라인 미구현, 달력등록 버그 |
| 스케줄러 | screen-03 | ~~100%~~ **75%** | 배분엔진 스텁, 스케줄 시간 계산 미구현 |
| 글작성&대기 | screen-04 | **100%** | — |
| 수익화 글 수정 에디터 | screen-04-1 | ~~85%~~ **100%** | ~~PasonaSectionMarker, FeatureGate 미적용~~ ✅ GAP-02,03 완료 |
| 블로그 설정 3탭 | screen-05/06/07 | **100%** | tasks_2.md에서 완료 |
| 설정 — 요금제 | screen-08 | **100%** | — |
| 설정 — API 키 관리 | screen-09 | **95%** | 이벤트 소스 API 키 등록 미지원 |

---

## 2. 화면별 상세 갭 분석

### 2-1. 수익대시보드 (screen-01) — ✅ 완료

`06-screens.md`에서 ❌로 표시된 **RevenueGuidePanel**은 이미 `page.tsx`에 연결 완료.
MD 다운로드 기능(`handleDownloadMD`)도 구현되어 있음.

| 컴포넌트 | 스펙 상태 | 실제 상태 | 비고 |
|---------|----------|----------|------|
| RocketStatusCard | ✅ | ✅ | |
| RevenueSummaryCard | ✅ | ✅ | |
| RevenueLineChart | ✅ | ✅ | |
| BlogGradeTable | ✅ | ✅ | |
| MultiDimensionChart | ✅ | ✅ | ✅ GAP-01 완료 |
| RevenueGuidePanel | ❌ (스펙 기록) | ✅ (실제) | page.tsx에 연결됨 + MD 다운 |

### 2-2. 키워드탐색기 (screen-02) — ⚠️ UI 완성, 자동화 미구현

**UI 구현 완료 항목:**
- KeywordTypeSelector (골드/이벤트/시즌 탭)
- GoldKeywordPanel, EventKeywordPanel, SeasonKeywordPanel
- KeywordResultCard + RevenueScoreBar
- KeywordDetailModal + 달력 등록
- 백엔드 API: gold, events, seasonal, register 모두 실구현

**⚠️ 자동화 파이프라인 미구현 (핵심 갭):**

| 항목 | 스펙 요구 | 실제 상태 | 비고 |
|------|----------|----------|------|
| 자동 키워드 발견 크론 | 매일 06:00 KST 자동 실행 | **❌** | 사용자 수동 검색만 가능 |
| 키워드 → DB 자동 저장 | 발견 즉시 keywords 테이블에 저장 | **❌** | API 응답만 UI에 표시 |
| 자동 스코어링 → 배분 → 스케줄 | 발견 → 점수 → 배분 → 달력 자동 등록 | **❌** | 전체 파이프라인 수동 |
| 이벤트 소스 API (인터파크/YES24/멜론) | 공연/경기 정보 크롤링 | **❌** | Naver News만 부분 구현 |
| Google Trends API | 급상승 트렌드 검색 | **❌** | 미구현 |
| KeywordResultCard 달력 등록 | blogId + scheduledDate + scheduledTime 전송 | **❌ 버그** | keywordId만 전송 → 400 에러 |
| 이벤트 키워드 스코어링 | API 실데이터 기반 점수 | **❌** | monthlySearchVolume=5000 하드코딩 |

### 2-3. 스케줄러 (screen-03) — ⚠️ UI 완성, 엔진 스텁

**UI 구현 완료 항목:**
- SchedulerCalendar (월간 달력)
- DistributionEnginePanel (8단계 배분 알고리즘)
- KeywordScheduleCard, BlogDistributionPreview
- ScheduleConfirmModal + pg_cron 등록
- 백엔드 API: calendar, reassign, distribute, confirm 모두 실구현

**⚠️ 배분 엔진 스텁 (핵심 갭):**

| 함수 | 스펙 요구 | 실제 상태 | 비고 |
|------|----------|----------|------|
| `quotaCheck()` | 월간 할당량 체크 (scheduled_posts 조회) | **스텁** | `return true` 고정 |
| `dailyLimitCheck()` | 일일 한도 체크 (당일 예약 건수 조회) | **스텁** | `postsScheduledToday` 미조회 → 항상 0 |
| `calculateScheduleTime()` | 60~120분 랜덤 간격으로 시간 배정 | **스텁** | 항상 내일 09:00 고정 |
| 이벤트 클러스터 엔진 | D-Day 기반 자동 스케줄 | **❌** | `event-cluster-engine.ts` 미존재 |

### 2-4. 글작성&대기 (screen-04) — ✅ 완료

구현 완료 항목:
- PipelineStatusBoard (Kanban)
- ReviewQueueList + QualityScoreReport (검수 A/B 자동 전환)
- PostActionButtons (승인/수정/거절)
- "수정" 클릭 → `/editor/[post-id]?from=review` 라우팅
- 백엔드 API: pipeline, review-queue, report, approve, reject 모두 실구현

### 2-5. 수익화 글 수정 에디터 (screen-04-1) — ✅ 완료

`06-screens.md`에서 대부분 ❌였지만, 실제로는 핵심 기능이 모두 연결되어 있음.
GAP-02 (PasonaSectionMarker), GAP-03 (FeatureGate) 모두 2차 보완에서 완료.

| 항목 | 실제 상태 | 비고 |
|------|----------|------|
| `?from=review` 감지 | ✅ | `searchParams.get('from') === 'review'` |
| edit-context API fetch | ✅ | `GET /api/writing/edit-context/{id}` 호출 |
| MonetizeEditorHeader | ✅ | 키워드(유형+등급)+블로그 표시 |
| 2/3+1/3 그리드 레이아웃 | ✅ | `grid grid-cols-3` 적용 |
| QualityScoreSidebar | ✅ | MonetizeEditorSidebar 내부 |
| AIImproveSuggestion | ✅ | MonetizeEditorSidebar 내부 |
| SEOChecklist | ✅ | MonetizeEditorSidebar 내부 |
| MonetizeEditorActions | ✅ | 임시저장/재검수/승인/거절 4버튼 |
| PasonaSectionMarker | ✅ | ✅ GAP-02 완료 |
| FeatureGate 래핑 | ✅ | ✅ GAP-03 완료 |

---

## 3. 잔여 갭 목록

### GAP-01: MultiDimensionChart 미구현 (screen-01) — ✅ 완료

> 2차 보완 Phase B에서 구현 완료. `components/monetize/dashboard/MultiDimensionChart.tsx` 생성 및 대시보드 배치.

### GAP-02: PasonaSectionMarker 미구현 (screen-04-1) — ✅ 완료

> 2차 보완 Phase C에서 구현 완료. `components/monetize/editor/PasonaSectionMarker.tsx` 생성 및 에디터 배치.

### GAP-03: Editor Review Sidebar FeatureGate 미적용 (screen-04-1) — ✅ 완료

> 2차 보완 Phase A에서 구현 완료. 사이드패널 FeatureGate 래핑 + 백엔드 3개 API 플랜 체크 추가.

### GAP-04: API 경로 불일치 (구조적 개선) — 보류

- **우선순위**: 낮
- **설명**: Writing API가 두 가지 경로 구조로 분산 (`/api/writing/` vs `/api/monetize/writing/`)
- **결정**: 그대로 두고 문서화 (기능에 영향 없음)

---

### GAP-05: KeywordResultCard 달력 등록 버그 (screen-02)

- **우선순위**: 높
- **복잡도**: M
- **설명**: "달력 등록" 버튼이 `keywordId`만 전송하여 항상 400 에러 발생
- **현재 코드**: `body: JSON.stringify({ keywordId: keyword.id })` — blogId, scheduledDate, scheduledTime 누락
- **API 요구**: `{ keywordId, blogId, scheduledDate, scheduledTime }` 필수
- **필요 작업**:
  1. `KeywordResultCard.tsx`에 블로그 선택 드롭다운 추가
  2. 날짜/시간 선택 UI 추가 (또는 자동 추천)
  3. register API 호출 시 모든 필수 파라미터 전송
- **파일**: `components/monetize/keywords/KeywordResultCard.tsx`

### GAP-06: 배분 엔진 스텁 실구현 (screen-03)

- **우선순위**: 높
- **복잡도**: M
- **설명**: `distribution-engine.ts`의 핵심 함수 3개가 스텁 상태
- **상세**:
  - `quotaCheck()`: `return true` 고정 → `scheduled_posts` 테이블에서 월간 건수 조회 필요
  - `dailyLimitCheck()`: `postsScheduledToday` 미조회 → `scheduled_posts`에서 당일 건수 조회 필요
  - `calculateScheduleTime()`: 항상 내일 09:00 → 60~120분 랜덤 간격 + 블로그별 시간대 분산
- **필요 작업**:
  1. `quotaCheck()`: Supabase 쿼리로 월간 `scheduled_posts` 카운트
  2. `dailyLimitCheck()`: Supabase 쿼리로 당일 예약 건수 조회
  3. `calculateScheduleTime()`: 랜덤 간격 알고리즘 구현 (09:00~18:00, 60~120분 간격)
- **파일**: `lib/monetize/engines/distribution-engine.ts`

### GAP-07: 이벤트 키워드 스코어링 하드코딩 제거 (screen-02)

- **우선순위**: 중
- **복잡도**: S
- **설명**: 이벤트 키워드 스코어링 시 `monthlySearchVolume=5000`, `cpcEstimate=1500`, `trendIndex=75` 하드코딩
- **현재 코드** (`app/api/monetize/keywords/events/route.ts`):
  ```ts
  scoreKeywords(eventKeywords.map(ek => ({
    monthlySearchVolume: 5000,  // 하드코딩!
    cpcEstimate: 1500,          // 하드코딩!
    trendIndex: 75,             // 하드코딩!
  })))
  ```
- **필요 작업**:
  1. Naver Ad API로 이벤트 키워드 검색량/CPC 실데이터 조회
  2. Naver DataLab API로 트렌드 지수 실데이터 조회
  3. 조회 실패 시에만 기본값 사용 (fallback)
- **파일**: `app/api/monetize/keywords/events/route.ts`

### GAP-08: 키워드 자동 발견 크론 미구현 (핵심 자동화)

- **우선순위**: 최고
- **복잡도**: L
- **설명**: 키워드 발견이 100% 수동 — 사용자가 UI에서 직접 검색해야 함
- **스펙 요구**: 매일 06:00 KST(UTC 21:00)에 자동으로:
  1. 골드 키워드: 사용자 블로그 카테고리 기반 고수익 키워드 자동 발견
  2. 이벤트 키워드: 공연/경기/페스티벌 관련 키워드 자동 크롤링
  3. 시즌 키워드: 계절/명절 관련 키워드 자동 추출
  4. 발견된 키워드 → `keywords` 테이블에 자동 저장
- **필요 작업**:
  1. `app/api/cron/keyword-discover/route.ts` 크론 라우트 생성
  2. `lib/monetize/pipeline/keyword-discover.ts` 자동 발견 파이프라인 구현
  3. `vercel.json`에 크론 등록 (KST 06:00 = UTC 21:00, 기존 monetize-publish와 시간 분리)
  4. 블로그 카테고리 → 관련 시드 키워드 매핑 로직
  5. 발견된 키워드 중복 체크 (이미 존재하면 스킵)
- **파일**:
  - 생성: `app/api/cron/keyword-discover/route.ts`
  - 생성: `lib/monetize/pipeline/keyword-discover.ts`
  - 수정: `vercel.json`

### GAP-09: 이벤트 소스 API 통합 (screen-02)

- **우선순위**: 높
- **복잡도**: L
- **설명**: 스펙에 정의된 외부 이벤트 소스 API가 미구현
- **현재 상태**: Naver News API만 부분 구현 (하드코딩 쿼리 `'콘서트 공연 페스티벌'`)
- **스펙 요구 소스**:
  - 인터파크 티켓 (공연/콘서트)
  - YES24 티켓 (공연)
  - 멜론 티켓 (음악 공연)
  - Google Trends API (급상승 검색어)
  - 스포츠 일정 (KBO, K리그 등)
- **필요 작업**:
  1. `lib/monetize/apis/event-api.ts` 생성 — 다중 소스 통합 인터페이스
  2. 각 소스별 크롤러/API 클라이언트 구현
  3. 이벤트 → 키워드 변환 로직 (이벤트명 → 검색 키워드 추출)
  4. 중복 이벤트 필터링 + 논란 키워드 블랙리스트 적용
- **파일**: 생성 `lib/monetize/apis/event-api.ts`

### GAP-10: 이벤트 클러스터 엔진 미구현 (screen-03)

- **우선순위**: 중
- **복잡도**: M
- **설명**: D-Day 기반 이벤트 키워드 자동 스케줄 엔진 미존재
- **스펙 요구** (`08-strategy-engine-spec.md`):
  - D-30일 전: 사전 정보성 글
  - D-14일 전: 비교/추천 글
  - D-7일 전: 실시간 정보 글
  - D-Day: 실시간 리뷰/후기 글
- **필요 작업**:
  1. `lib/monetize/engines/event-cluster-engine.ts` 생성
  2. 이벤트 날짜(D-Day) 기준 시점별 글감 자동 생성
  3. intent 타입 자동 매핑 (정보 → 비교 → 긴급 → 후기)
  4. 기존 `cluster-engine.ts`와 통합
- **파일**: 생성 `lib/monetize/engines/event-cluster-engine.ts`

### GAP-11: 이벤트 API 키 설정 UI 미지원 (screen-09)

- **우선순위**: 중
- **복잡도**: S
- **설명**: 설정 > API 키 관리에 이벤트 소스 관련 프로바이더 없음
- **현재 상태**: TEXT(3개), IMAGE(1개), KEYWORD(3개), MONETIZE(1개) = 총 8개
- **필요 추가**: EVENT 카테고리
  - `google_trends` — Google Trends API Key
  - `interpark` — 인터파크 API Key (필요 시)
- **필요 작업**:
  1. `app/(dashboard)/settings/page.tsx`에 EVENT_PROVIDERS 카테고리 추가
  2. `lib/constants/api-guide-contents.ts`에 가이드 콘텐츠 추가
- **파일**: `app/(dashboard)/settings/page.tsx`, `lib/constants/api-guide-contents.ts`

### GAP-12: 자동 파이프라인 연결 미구현 (핵심 자동화)

- **우선순위**: 최고
- **복잡도**: L
- **설명**: OUTPUT 파이프라인(글쓰기→검수→발행)만 자동화, INPUT 파이프라인(키워드발견→배분→스케줄)은 전체 수동
- **현재 자동화 범위**:
  ```
  scheduled_posts(pending, 오늘) → AI 글쓰기 → 품질 검사 → 자동발행/검수대기
  ↑ 여기부터만 자동 (monetize-publish 크론)
  ```
- **스펙 요구 전체 자동화**:
  ```
  키워드 자동 발견 → 스코어링 → 클러스터링 → 블로그 배분 → 달력 등록 → scheduled_posts 생성
  → AI 글쓰기 → 품질 검사 → 자동발행/검수대기
  ```
- **필요 작업**:
  1. `keyword-discover.ts`에서 발견 후 자동 스코어링 연결
  2. 스코어링 후 `cluster-engine.ts` 호출하여 인텐트 분류
  3. 클러스터링 후 `distribution-engine.ts` 호출하여 블로그 배분
  4. 배분 결과를 `scheduled_posts` + `blog_keyword_assignments` 테이블에 자동 등록
  5. 이벤트 키워드는 `event-cluster-engine.ts`로 D-Day 기반 스케줄
- **파일**: `lib/monetize/pipeline/keyword-discover.ts` (GAP-08과 통합)

---

## 4. TODO 실행 순서

> 의존성과 중요도 기준 정렬

### Phase A: 접근 제어 (우선) — ✅ 완료

| # | 태스크 | 상태 |
|---|--------|------|
| A-1 | Editor review sidebar FeatureGate 래핑 | ✅ |
| A-2 | 백엔드 API 플랜 체크 확인 | ✅ |

### Phase B: 대시보드 완성 — ✅ 완료

| # | 태스크 | 상태 |
|---|--------|------|
| B-1~4 | MultiDimensionChart 구현 + 배치 | ✅ |

### Phase C: 에디터 개선 — ✅ 완료

| # | 태스크 | 상태 |
|---|--------|------|
| C-1~3 | PasonaSectionMarker 구현 + 배치 | ✅ |

### Phase D: 정리 — 보류

| # | 태스크 | 상태 |
|---|--------|------|
| D-1 | API 경로 정리 또는 문서화 | 보류 |

---

### Phase E: 기반 수정 (버그 + 스텁 실구현) — 병렬 가능

| # | 태스크 | 파일 | 담당 | 복잡도 |
|---|--------|------|------|--------|
| E-1 | KeywordResultCard 달력 등록 버그 수정 (GAP-05) | `components/monetize/keywords/KeywordResultCard.tsx` | frontend | M |
| E-2 | 배분 엔진 quotaCheck/dailyLimitCheck/calculateScheduleTime 실구현 (GAP-06) | `lib/monetize/engines/distribution-engine.ts` | backend | M |
| E-3 | 이벤트 키워드 스코어링 하드코딩 제거 (GAP-07) | `app/api/monetize/keywords/events/route.ts` | backend | S |

### Phase F: 자동 발견 크론 + 이벤트 API (의존: E-2, E-3) — 일부 병렬

| # | 태스크 | 파일 | 담당 | 복잡도 |
|---|--------|------|------|--------|
| F-1 | keyword-discover 크론 라우트 + vercel.json (GAP-08) | `app/api/cron/keyword-discover/route.ts`, `vercel.json` | backend | L |
| F-2 | event-api.ts 이벤트 소스 통합 (GAP-09) | `lib/monetize/apis/event-api.ts` | backend | L |
| F-3 | event-cluster-engine.ts D-Day 스케줄 (GAP-10) | `lib/monetize/engines/event-cluster-engine.ts` | backend | M |
| F-4 | 이벤트 API 키 설정 UI (GAP-11) | `app/(dashboard)/settings/page.tsx` | frontend | S |

### Phase G: 자동 파이프라인 통합 (의존: F-1, F-2, F-3)

| # | 태스크 | 파일 | 담당 | 복잡도 |
|---|--------|------|------|--------|
| G-1 | 전체 파이프라인 연결: 발견→스코어→클러스터→배분→스케줄 (GAP-12) | `lib/monetize/pipeline/keyword-discover.ts` | backend | L |

---

## 5. 06-screens.md 상태 업데이트 제안

`tasks_2.md` 완료 이후 실제 코드베이스가 스펙 기록보다 훨씬 앞서 있음.
아래 항목의 스펙 상태를 ❌ → ✅로 업데이트 권장:

| 화면 | 항목 | 기존 스펙 상태 | 실제 상태 |
|------|------|-------------|----------|
| screen-01 | RevenueGuidePanel | ❌ 미연결 | ✅ page.tsx에 연결 + MD 다운로드 |
| screen-01 | MultiDimensionChart | ❌ | ✅ GAP-01 완료 |
| screen-04-1 | ?from=review 감지 | ❌ | ✅ searchParams 읽음 |
| screen-04-1 | edit-context API | ❌ | ✅ fetch 연결 |
| screen-04-1 | MonetizeEditorHeader | ❌ | ✅ 연결됨 |
| screen-04-1 | 2/3+1/3 그리드 | ❌ | ✅ grid-cols-3 |
| screen-04-1 | QualityScoreSidebar | ❌ | ✅ MonetizeEditorSidebar 내부 |
| screen-04-1 | AIImproveSuggestion | ❌ | ✅ MonetizeEditorSidebar 내부 |
| screen-04-1 | SEOChecklist | ❌ | ✅ MonetizeEditorSidebar 내부 |
| screen-04-1 | MonetizeEditorActions | ❌ | ✅ 연결됨 |
| screen-04-1 | PasonaSectionMarker | ❌ | ✅ GAP-02 완료 |
| screen-04-1 | FeatureGate 래핑 | ❌ | ✅ GAP-03 완료 |
| screen-05 | language 탭 | ❌ | ✅ 7탭 정의됨 + 컴포넌트 연결 |
| screen-06 | sns 탭 | ❌ | ✅ SNSSettingsPanel 연결 |
| screen-07 | monetize 탭 | ❌ | ✅ AffiliateSettingsPanel 연결 |
| screen-09 | 탭명 변경 | ❌ | ✅ "API 키 관리" |
| screen-09 | 4카테고리 분리 | ❌ | ✅ TEXT/IMAGE/KEYWORD/MONETIZE |
| screen-09 | 9개 provider | ❌ | ✅ 전부 정의됨 |
| screen-09 | ApiGuideAccordion | ❌ | ✅ 존재 + 연결됨 |
| 공통 | ConsentManagementSection | ❌ | ✅ settings에 연결됨 |

---

## 6. 파이프라인 현황 다이어그램

### 현재 상태 (OUTPUT만 자동화)
```
사용자가 수동으로 키워드 검색 → 수동 선택 → 수동 달력 등록 (❌ 버그)
                                                    ↓
                              scheduled_posts (pending, 오늘)
                                                    ↓
                    [자동] AI 글쓰기 → 품질 검사 → 자동발행/검수대기
```

### 목표 상태 (전체 자동화)
```
[06:00 KST 자동 크론]
├── 골드 키워드 발견 (Naver Ad + Google KWP)
├── 이벤트 키워드 발견 (인터파크/YES24/멜론/Google Trends)
└── 시즌 키워드 발견 (연간 캘린더)
          ↓
    Revenue Score 자동 산정
          ↓
    클러스터링 (인텐트 분류)
          ↓
    배분 엔진 (블로그 매칭 + 일일 한도 + 월간 쿼터)
          ↓
    달력 자동 등록 → scheduled_posts 생성
          ↓
[06:00 KST 자동 크론 — monetize-publish]
    AI 글쓰기 → 품질 검사 → 자동발행 (≥45점) / 검수대기 (<45점)
```

---

## 7. 결론

**UI 레벨 완성도: ~95%** — 화면 구성과 컴포넌트는 대부분 완성.
**자동화 파이프라인 완성도: ~40%** — OUTPUT(글쓰기→발행)만 자동화, INPUT(키워드→스케줄)은 전체 수동.

### 완료된 작업 (Phase A~C):
1. ✅ GAP-01 (MultiDimensionChart) — 대시보드 차트 구현
2. ✅ GAP-02 (PasonaSectionMarker) — 에디터 PASONA 마커
3. ✅ GAP-03 (FeatureGate) — 접근 제어 + 백엔드 플랜 체크

### 잔여 작업 (Phase E~G):
1. **GAP-05 (KeywordResultCard 버그)** — 달력 등록 400 에러 수정
2. **GAP-06 (배분 엔진 스텁)** — quotaCheck/dailyLimitCheck/calculateScheduleTime 실구현
3. **GAP-07 (이벤트 스코어링 하드코딩)** — 실데이터 기반으로 전환
4. **GAP-08 (키워드 자동 발견 크론)** — 핵심 자동화, 매일 06:00 자동 실행
5. **GAP-09 (이벤트 소스 API)** — 인터파크/YES24/멜론/Google Trends 통합
6. **GAP-10 (이벤트 클러스터 엔진)** — D-Day 기반 자동 스케줄
7. **GAP-11 (이벤트 API 키 UI)** — 설정 화면에 EVENT 카테고리 추가
8. **GAP-12 (자동 파이프라인 통합)** — 전체 INPUT 파이프라인 자동화 연결
