# Multi Blog Hub 화면 목록

> 버전: 1.0 | 날짜: 2026-03-04
> /screen-spec 의 입력 파일

---

## 화면 목록

### screen-01: 로그인
- **ID**: screen-01
- **경로**: /login
- **설명**: 이메일/소셜 로그인
- **컴포넌트**: LoginForm, SocialLoginButtons, ForgotPasswordLink
- **다음 화면**: screen-02 (로그인 성공 시)

### screen-02: 회원가입
- **ID**: screen-02
- **경로**: /signup
- **설명**: 신규 계정 생성
- **컴포넌트**: SignupForm, SocialSignupButtons, TermsCheckbox
- **다음 화면**: screen-03 (가입 성공 시)

### screen-03: 대시보드
- **ID**: screen-03
- **경로**: /dashboard
- **설명**: 전체 현황 한 눈에 보기 (통계, 최신글, 수익)
- **컴포넌트**:
  - StatSummaryBar (전체 통계 요약)
  - BlogStatGrid (블로그별 통계 카드)
  - RecentPostsList (최신 발행글 목록)
  - RevenueOverview (예상 수익 현황 - 총 수익 + 광고별 기여)
  - QuickActionButtons (글 작성, 스케줄 추가)
- **다음 화면**: 각 섹션 클릭 → 해당 화면

### screen-04: 블로그 목록
- **ID**: screen-04
- **경로**: /blogs
- **설명**: 전체 블로그 관리 목록
- **컴포넌트**:
  - BlogListHeader (총 블로그 수, 신규 생성 버튼)
  - BlogCardGrid (블로그 카드 목록)
  - BlogCard (이름, 도메인, 최근 글 수, 방문자 수, 빠른 작성)
- **다음 화면**: screen-05 (블로그 카드 클릭), screen-06 (신규 생성)

### screen-05: 블로그 상세
- **ID**: screen-05
- **경로**: /blogs/:id
- **설명**: 특정 블로그의 글 목록, 통계, 메모
- **컴포넌트**:
  - BlogHeader (블로그 이름, 도메인, 설정 버튼)
  - TabNav (발행글 | 통계 | 메모)
  - PostsTab: PostTable (제목, 상태, 발행일, 조회수, 편집/삭제)
  - StatsTab: BlogStatCharts (방문자, 조회수 차트)
  - MemoTab: SnippetList (스니펫 목록, 추가/편집)
- **다음 화면**: screen-07 (설정 클릭), screen-09 (글 편집)

### screen-06: 블로그 생성
- **ID**: screen-06
- **경로**: /blogs/new
- **설명**: 새 블로그 추가 (이름, 도메인, 기본 설정)
- **컴포넌트**:
  - BlogCreateForm
    - 블로그 이름 입력
    - 도메인 방식 선택 (커스텀 도메인 / 서브도메인)
    - 도메인 입력/연결
    - AI 캐릭터 기본 설정 (톤 선택)
    - AI 공급자 선택
  - DomainConnectionGuide (도메인 연결 가이드)
- **다음 화면**: screen-05 (생성 완료)

### screen-07: 블로그 설정
- **ID**: screen-07
- **경로**: /blogs/:id/settings
- **설명**: 블로그 상세 설정 (도메인, AI, 광고, 크로스링크)
- **컴포넌트**:
  - SettingsTabNav (기본정보 | AI 캐릭터 | 광고 | 크로스링킹)
  - BasicInfoTab: 이름, 도메인 수정, 설명
  - AICharacterTab: 캐릭터 이름, 톤, 스타일, 페르소나 상세 설정
  - AdsTab: AdSense 코드 입력, 광고 위치별 설정
  - CrossLinkTab: 연결할 블로그 선택, 자동링크 설정
- **다음 화면**: screen-05 (저장 후)

### screen-08: 글 작성/에디터
- **ID**: screen-08
- **경로**: /editor/new
- **설명**: AI 생성 모드 + 직접 작성 모드
- **컴포넌트**:
  - EditorModeTab (AI 생성 | 직접 작성)
  - **AI 생성 모드**:
    - KeywordInput (키워드 입력)
    - RelatedKeywordPanel (연관 키워드 + 형태소 제안)
    - BlogMultiSelect (발행 블로그 체크박스)
    - ImageCountSelect (이미지 수 슬라이더)
    - AIGenerateButton + LoadingState
    - GeneratedPostTabs (블로그별 생성된 글 탭)
    - PostEditor (TipTap 에디터)
  - **직접 작성 모드**:
    - PostEditor (TipTap / HTML 에디터 전환)
    - ImageUploader
    - BlogMultiSelect
  - **공통**:
    - SnippetDrawer (우측 스니펫 패널)
    - SEOMetaForm (메타 제목, 설명, OG 이미지)
    - PublishButton + ScheduleButton
- **다음 화면**: screen-03 or screen-05 (발행 후)

### screen-09: 글 편집
- **ID**: screen-09
- **경로**: /editor/:id
- **설명**: 기존 글 수정
- **컴포넌트**: screen-08과 동일 (기존 데이터 로드)
- **다음 화면**: screen-05 (저장 후)

### screen-10: 스케줄러/자동화
- **ID**: screen-10
- **경로**: /scheduler
- **설명**: 자동 발행 규칙 설정 + 키워드 풀 + 로그
- **컴포넌트**:
  - SchedulerTabNav (자동화 규칙 | 키워드 풀 | 타임라인 | 실행 로그)
  - **자동화 규칙 탭**:
    - JobList (규칙 목록)
    - JobCard (이름, 대상 블로그, 다음 실행 시각, 상태)
    - JobCreateModal
      - 대상 블로그 선택
      - 발행 시간 설정 (시간 피커)
      - 반복 설정 (1회/매일/매주/매월)
      - 회차당 발행 수
      - 이미지 수
  - **키워드 풀 탭**:
    - KeywordPoolTable (키워드 목록, 추가/삭제)
    - KeywordBulkImport (CSV 업로드)
  - **타임라인 탭**:
    - ScheduleCalendar (월/주 뷰)
    - ScheduleList (예약 목록)
  - **실행 로그 탭**:
    - LogTable (시각, 작업명, 상태, 발행된 글 링크)
- **다음 화면**: 해당 화면 내 유지

### screen-11: 통계
- **ID**: screen-11
- **경로**: /stats
- **설명**: 전체 + 블로그별 상세 통계
- **컴포넌트**:
  - DateRangePicker (기간 선택)
  - OverallStatCards (총 방문자, 총 조회수, 총 글 수)
  - BlogCompareChart (블로그별 방문자 비교 바 차트)
  - PostPerformanceTable (글별 성과 - 조회수, 체류시간)
  - TrendChart (일별/주별 추이 라인 차트)
- **다음 화면**: 해당 화면 내 유지

### screen-12: 광고/AdSense 관리
- **ID**: screen-12
- **경로**: /ads
- **설명**: 광고 단위 관리 및 수익 현황
- **컴포넌트**:
  - AdUnitList (광고 단위 목록)
  - AdUnitCreateModal (광고 코드, 위치, 크기 설정)
  - RevenueChart (수익 추이 차트)
  - AdPerformanceTable (광고별 수익 기여 현황)
  - AdSenseConnectButton (AdSense 계정 연결)
- **다음 화면**: 해당 화면 내 유지

### screen-13: SEO 키워드 탐색기
- **ID**: screen-13
- **경로**: /keywords
- **설명**: 구글 SEO에 적합한 트렌딩/시즌성 키워드 탐색
- **컴포넌트**:
  - KeywordSearchInput
  - TrendingKeywordList (실시간 트렌딩 키워드)
  - SeasonalKeywordCalendar (시즌성 키워드 캘린더)
  - KeywordDetailCard (검색량, 경쟁도, 관련 키워드)
  - AddToSchedulerButton (스케줄러에 바로 추가)
  - AddToEditorButton (에디터에 바로 사용)
- **다음 화면**: screen-08 (에디터로), screen-10 (스케줄러로)

### screen-14: 설정
- **ID**: screen-14
- **경로**: /settings
- **설명**: 계정, AI API 키, 외부 연동 설정
- **컴포넌트**:
  - SettingsNav (계정 | AI API | 외부 연동 | 알림)
  - **계정 탭**: 프로필 편집, 비밀번호 변경
  - **AI API 탭**: API 키 입력/관리 (Claude, OpenAI, Gemini)
  - **외부 연동 탭**: Notion API, Google Sheets 연결 (선택사항)
  - **알림 탭**: 자동화 실패 알림, 이메일 설정
- **다음 화면**: 해당 화면 내 유지

---

## 화면 간 이동 흐름

```
로그인(/login)
    └──> 대시보드(/dashboard)
              ├──> 블로그 목록(/blogs)
              │         ├──> 블로그 상세(/blogs/:id)
              │         │         └──> 블로그 설정(/blogs/:id/settings)
              │         └──> 블로그 생성(/blogs/new)
              ├──> 글 작성(/editor/new)
              │         └──> 글 편집(/editor/:id)
              ├──> 스케줄러(/scheduler)
              ├──> 통계(/stats)
              ├──> 광고관리(/ads)
              ├──> 키워드 탐색기(/keywords)
              └──> 설정(/settings)
```

---

## 재사용 컴포넌트

| 컴포넌트 | 사용 화면 |
|---------|---------|
| AppSidebar | 모든 인증된 화면 |
| AppHeader | 모든 인증된 화면 |
| BlogMultiSelect | screen-08, 09, 10 |
| SnippetDrawer | screen-08, 09 |
| StatCard | screen-03, 11 |
| PostTable | screen-03, 05 |
| DateRangePicker | screen-11, 12 |
