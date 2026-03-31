# 수익화 로켓 2차 갭 분석 & 보완 TODO

> 생성일: 2026-04-01
> 기준: `06-screens.md`, `03-user-flow.md`, `04-database-design.md` 대비 실제 코드베이스 검증
> 선행 완료: `tasks_2.md` 30/30 태스크 전부 완료

---

## 1. 4탭 점검 결과 요약

| 화면 | ID | 완성도 | 잔여 갭 |
|------|-----|--------|---------|
| 수익대시보드 | screen-01 | **95%** | MultiDimensionChart 미구현 |
| 키워드탐색기 | screen-02 | **100%** | — |
| 스케줄러 | screen-03 | **100%** | — |
| 글작성&대기 | screen-04 | **100%** | — |
| 수익화 글 수정 에디터 | screen-04-1 | **85%** | PasonaSectionMarker, FeatureGate 미적용 |
| 블로그 설정 3탭 | screen-05/06/07 | **100%** | tasks_2.md에서 완료 |
| 설정 — 요금제 | screen-08 | **100%** | — |
| 설정 — API 키 관리 | screen-09 | **100%** | tasks_2.md에서 완료 |

---

## 2. 화면별 상세 갭 분석

### 2-1. 수익대시보드 (screen-01)

`06-screens.md`에서 ❌로 표시된 **RevenueGuidePanel**은 이미 `page.tsx`에 연결 완료.
MD 다운로드 기능(`handleDownloadMD`)도 구현되어 있음.

| 컴포넌트 | 스펙 상태 | 실제 상태 | 비고 |
|---------|----------|----------|------|
| RocketStatusCard | ✅ | ✅ | |
| RevenueSummaryCard | ✅ | ✅ | |
| RevenueLineChart | ✅ | ✅ | |
| BlogGradeTable | ✅ | ✅ | |
| **MultiDimensionChart** | **✅** | **❌** | **컴포넌트 파일 미존재** |
| RevenueGuidePanel | ❌ (스펙 기록) | ✅ (실제) | page.tsx에 연결됨 + MD 다운 |

**갭 상세: MultiDimensionChart**
- 스펙 정의: 블로그별/광고 카테고리별/언어별/블로그 유형별 4차원 분석 차트
- 상태 변수: `selectedDimension: 'blog' | 'ad_category' | 'language' | 'blog_type'`
- 데이터 소스: `GET /api/monetize/analytics?dimension=blog&startDate=...&endDate=...`
- 위치: 대시보드 하단 전체 너비

### 2-2. 키워드탐색기 (screen-02) — ✅ 완료

구현 완료 항목:
- KeywordTypeSelector (골드/이벤트/시즌 탭)
- GoldKeywordPanel, EventKeywordPanel, SeasonKeywordPanel
- KeywordResultCard + RevenueScoreBar
- KeywordDetailModal + 달력 등록
- 백엔드 API: gold, events, seasonal, register 모두 실구현

### 2-3. 스케줄러 (screen-03) — ✅ 완료

구현 완료 항목:
- SchedulerCalendar (월간 달력)
- DistributionEnginePanel (8단계 배분 알고리즘)
- KeywordScheduleCard, BlogDistributionPreview
- ScheduleConfirmModal + pg_cron 등록
- 백엔드 API: calendar, reassign, distribute, confirm 모두 실구현

### 2-4. 글작성&대기 (screen-04) — ✅ 완료

구현 완료 항목:
- PipelineStatusBoard (Kanban)
- ReviewQueueList + QualityScoreReport (검수 A/B 자동 전환)
- PostActionButtons (승인/수정/거절)
- "수정" 클릭 → `/editor/[post-id]?from=review` 라우팅
- 백엔드 API: pipeline, review-queue, report, approve, reject 모두 실구현

### 2-5. 수익화 글 수정 에디터 (screen-04-1) — 85% 완료

`06-screens.md`에서 대부분 ❌였지만, 실제로는 핵심 기능이 모두 연결되어 있음.

| 항목 | 스펙 상태 | 실제 상태 | 비고 |
|------|----------|----------|------|
| `?from=review` 감지 | ❌ | ✅ | `searchParams.get('from') === 'review'` |
| edit-context API fetch | ❌ | ✅ | `GET /api/writing/edit-context/{id}` 호출 |
| MonetizeEditorHeader | ❌ | ✅ | 키워드(유형+등급)+블로그 표시 |
| 2/3+1/3 그리드 레이아웃 | ❌ | ✅ | `grid grid-cols-3` 적용 |
| QualityScoreSidebar | ❌ | ✅ | MonetizeEditorSidebar 내부 |
| AIImproveSuggestion | ❌ | ✅ | MonetizeEditorSidebar 내부 |
| SEOChecklist | ❌ | ✅ | MonetizeEditorSidebar 내부 |
| MonetizeEditorActions | ❌ | ✅ | 임시저장/재검수/승인/거절 4버튼 |
| ai-improve API | ✅ | ✅ | `POST /api/writing/ai-improve/{id}` |
| re-score API | — | ✅ | `POST /api/monetize/writing/re-score/{id}` |
| **PasonaSectionMarker** | **❌** | **❌** | **미구현 — 에디터 본문 H2에 PASONA 배지 표시** |
| **FeatureGate 래핑** | **❌** | **❌** | **Growth 미달 시 사이드패널 잠금 없음** |

---

## 3. 잔여 갭 목록

### GAP-01: MultiDimensionChart 미구현 (screen-01)

- **우선순위**: 중
- **복잡도**: M-L
- **설명**: 대시보드 하단에 4차원 분석 차트 없음
- **스펙 요구사항**:
  - 드롭다운으로 차원 선택: blog / ad_category / language / blog_type
  - 선택 차원별로 수익 분포 막대 또는 파이 차트 렌더링
  - 기간 필터(`dateRange`) 연동
- **필요 작업**:
  1. `components/monetize/dashboard/MultiDimensionChart.tsx` 생성
  2. recharts 활용 (프로젝트에 이미 의존성 존재)
  3. `GET /api/monetize/analytics?dimension=...` API 호출 연결
  4. `app/(dashboard)/monetize/page.tsx`에서 대시보드 탭 하단에 배치
- **데이터 소스**: `revenue_analytics` 테이블 (`ad_category`, `language`, `blog_type` 컬럼)

### GAP-02: PasonaSectionMarker 미구현 (screen-04-1)

- **우선순위**: 낮
- **복잡도**: M
- **설명**: 에디터 본문의 H2 태그를 분석하여 `[P]`, `[A]`, `[S]`, `[O]`, `[N]`, `[A]` 배지를 좌측에 표시
- **스펙 요구사항**:
  - content_draft의 H2 태그 패턴 매칭: `## [P] ...`, `## [A] ...` 등
  - 각 섹션 옆에 색상 배지 (P=빨강, A=주황, S=파랑, O=초록, N=보라, A=분홍)
  - TipTap 에디터와 연동 필요
- **필요 작업**:
  1. `components/monetize/editor/PasonaSectionMarker.tsx` 생성
  2. TipTap Extension 또는 decoration 방식으로 H2 옆에 배지 렌더링
  3. `?from=review` 모드일 때만 활성화
- **참고**: 이 기능은 시각적 보조이며 핵심 파이프라인에 영향 없음

### GAP-03: Editor Review Sidebar FeatureGate 미적용 (screen-04-1)

- **우선순위**: 높
- **복잡도**: S
- **설명**: Growth 미달 플랜 사용자가 `/editor/[id]?from=review`에 접근할 때 사이드패널이 잠기지 않음
- **스펙 요구사항**:
  - 사이드패널 전체를 `FeatureGate(auto_writing_pipeline, growth)`로 래핑
  - 미달 시: 에디터 본문은 정상 표시, 사이드패널 → `UpgradeModal` 유도
  - 백엔드 API(`edit-context`, `re-score`, `ai-improve`)에서도 `isFeatureEnabled` 체크
- **필요 작업**:
  1. `app/(dashboard)/editor/[id]/page.tsx`에서 사이드패널 영역을 `FeatureGate` 래핑
  2. `usePlanContext()` + `isAtLeast('growth')` 체크 추가
  3. 백엔드 3개 API에 플랜 체크 미들웨어 적용 확인

### GAP-04: API 경로 불일치 (구조적 개선)

- **우선순위**: 낮
- **복잡도**: S
- **설명**: Writing API가 두 가지 경로 구조로 분산되어 있음
  - `/api/writing/edit-context/`, `/api/writing/ai-improve/` — `monetize` prefix 없음
  - `/api/monetize/writing/pipeline/`, `/api/monetize/writing/approve/` 등 — `monetize` prefix 있음
- **영향**: 기능에는 문제 없으나, 코드 일관성과 유지보수성 저하
- **옵션**:
  - A) `/api/writing/` 쪽을 `/api/monetize/writing/`으로 이동 (rewrite 필요)
  - B) 그대로 두고 문서화 (현실적)

---

## 4. TODO 실행 순서

> 의존성과 중요도 기준 정렬

### Phase A: 접근 제어 (우선)

| # | 태스크 | 파일 | 복잡도 |
|---|--------|------|--------|
| A-1 | Editor review sidebar FeatureGate 래핑 | `editor/[id]/page.tsx` | S |
| A-2 | 백엔드 API 플랜 체크 확인 (edit-context, re-score, ai-improve) | `api/writing/`, `api/monetize/writing/` | S |

### Phase B: 대시보드 완성

| # | 태스크 | 파일 | 복잡도 |
|---|--------|------|--------|
| B-1 | MultiDimensionChart 컴포넌트 생성 | `components/monetize/dashboard/MultiDimensionChart.tsx` | M |
| B-2 | 4차원 드롭다운 + recharts 차트 구현 | 위 파일 | M |
| B-3 | monetize page에 MultiDimensionChart 배치 | `monetize/page.tsx` | S |
| B-4 | analytics API 연동 + dateRange 필터 | 위 파일 | S |

### Phase C: 에디터 개선 (선택)

| # | 태스크 | 파일 | 복잡도 |
|---|--------|------|--------|
| C-1 | PasonaSectionMarker 컴포넌트 생성 | `components/monetize/editor/PasonaSectionMarker.tsx` | M |
| C-2 | TipTap extension/decoration 연동 | 위 파일 + `PostEditor.tsx` | M |
| C-3 | review 모드에서만 활성화 로직 | `editor/[id]/page.tsx` | S |

### Phase D: 정리 (선택)

| # | 태스크 | 파일 | 복잡도 |
|---|--------|------|--------|
| D-1 | API 경로 정리 또는 문서화 | `api/writing/` ↔ `api/monetize/writing/` | S |

---

## 5. 06-screens.md 상태 업데이트 제안

`tasks_2.md` 완료 이후 실제 코드베이스가 스펙 기록보다 훨씬 앞서 있음.
아래 항목의 스펙 상태를 ❌ → ✅로 업데이트 권장:

| 화면 | 항목 | 기존 스펙 상태 | 실제 상태 |
|------|------|-------------|----------|
| screen-01 | RevenueGuidePanel | ❌ 미연결 | ✅ page.tsx에 연결 + MD 다운로드 |
| screen-04-1 | ?from=review 감지 | ❌ | ✅ searchParams 읽음 |
| screen-04-1 | edit-context API | ❌ | ✅ fetch 연결 |
| screen-04-1 | MonetizeEditorHeader | ❌ | ✅ 연결됨 |
| screen-04-1 | 2/3+1/3 그리드 | ❌ | ✅ grid-cols-3 |
| screen-04-1 | QualityScoreSidebar | ❌ | ✅ MonetizeEditorSidebar 내부 |
| screen-04-1 | AIImproveSuggestion | ❌ | ✅ MonetizeEditorSidebar 내부 |
| screen-04-1 | SEOChecklist | ❌ | ✅ MonetizeEditorSidebar 내부 |
| screen-04-1 | MonetizeEditorActions | ❌ | ✅ 연결됨 |
| screen-05 | language 탭 | ❌ | ✅ 7탭 정의됨 + 컴포넌트 연결 |
| screen-06 | sns 탭 | ❌ | ✅ SNSSettingsPanel 연결 |
| screen-07 | monetize 탭 | ❌ | ✅ AffiliateSettingsPanel 연결 |
| screen-09 | 탭명 변경 | ❌ | ✅ "API 키 관리" |
| screen-09 | 4카테고리 분리 | ❌ | ✅ TEXT/IMAGE/KEYWORD/MONETIZE |
| screen-09 | 9개 provider | ❌ | ✅ 전부 정의됨 |
| screen-09 | ApiGuideAccordion | ❌ | ✅ 존재 + 연결됨 |
| 공통 | ConsentManagementSection | ❌ | ✅ settings에 연결됨 |

---

## 6. 결론

**4개 메인 탭(대시보드/키워드/스케줄러/글작성)은 사실상 완성 상태.**

잔여 작업은 3건:
1. **GAP-03 (FeatureGate)** — 보안/요금제 필수. 즉시 적용 권장 (30분)
2. **GAP-01 (MultiDimensionChart)** — 대시보드 완성도를 위해 필요 (2~3시간)
3. **GAP-02 (PasonaSectionMarker)** — 시각적 보조, 후순위 가능 (2시간)

총 예상 작업량: **4~6시간**
