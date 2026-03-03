# Multi Blog Hub TASKS.md

> 생성 방식: Domain-Guarded (screen-spec v2.0 기반)
> 버전: 1.0 | 날짜: 2026-03-04
> Interface Contract Validation: ✅ PASSED

---

## 📊 전체 현황

| Phase | 설명 | 태스크 수 | 상태 |
|-------|------|----------|------|
| P0 | 프로젝트 셋업 | 1 | ⬜ |
| P1 | 공통 인프라 (Auth + Layout) | 4 | ⬜ |
| P2 | 블로그 관리 핵심 | 14 | ⬜ |
| P3 | 에디터 + AI 통합 | 8 | ⬜ |
| P4 | 자동화 + 통계 + 광고 + 키워드 | 18 | ⬜ |
| **합계** | | **45** | |

---

## 의존성 다이어그램

```mermaid
flowchart TD
    subgraph P0 [Phase 0: Setup]
        T0[P0-T1: 프로젝트 초기화]
    end

    subgraph P1 [Phase 1: 공통 인프라]
        R1[P1-R1: Auth Resource]
        S0[P1-S0: 공통 레이아웃]
    end

    subgraph P2 [Phase 2: 블로그 관리]
        R2[P2-R1: Blogs]
        R3[P2-R2: Posts]
        R4[P2-R3: Snippets]
        S1[P2-S1: 로그인]
        S2[P2-S2: 회원가입]
        S3[P2-S3: 대시보드]
        S4[P2-S4: 블로그 목록]
        S5[P2-S5: 블로그 상세]
        S6[P2-S6: 블로그 생성]
        S7[P2-S7: 블로그 설정]
    end

    subgraph P3 [Phase 3: 에디터 + AI]
        R5[P3-R1: AI API Keys]
        R6[P3-R2: AI Generation]
        S8[P3-S1: 글 작성 에디터]
        S9[P3-S2: 글 편집]
    end

    subgraph P4 [Phase 4: 자동화 + 통계]
        R7[P4-R1: Scheduler]
        R8[P4-R2: Stats]
        R9[P4-R3: Ad Units]
        R10[P4-R4: Keywords]
        S10[P4-S1: 스케줄러]
        S11[P4-S2: 통계]
        S12[P4-S3: 광고관리]
        S13[P4-S4: 키워드탐색기]
        S14[P4-S5: 설정]
    end

    T0 --> R1
    R1 --> S1
    R1 --> S2
    R1 --> S0
    S0 --> S3
    R1 --> R2
    R1 --> R3
    R1 --> R4
    R2 --> S3
    R2 --> S4
    R2 --> S5
    R2 --> S6
    R2 --> S7
    R3 --> S3
    R3 --> S5
    R4 --> S5
    R2 --> R5
    R2 --> R6
    R3 --> R6
    R5 --> S8
    R6 --> S8
    R4 --> S8
    R6 --> S9
    R4 --> S9
    R2 --> R7
    R3 --> R8
    R2 --> R9
    R7 --> S10
    R8 --> S11
    R9 --> S12
    R10 --> S13
    R5 --> S14
```

---

## Phase 0: 프로젝트 셋업

### [ ] P0-T1: Next.js 14 프로젝트 초기화
- **담당**: backend-specialist
- **설명**: Next.js 14 App Router + TypeScript + Supabase + Tailwind + shadcn/ui 초기 설정
- **작업 목록**:
  - [ ] `npx create-next-app@latest` with TypeScript + Tailwind + App Router
  - [ ] shadcn/ui 설치 및 초기화 (`npx shadcn@latest init`)
  - [ ] Supabase 클라이언트 설치 (`@supabase/supabase-js`, `@supabase/ssr`)
  - [ ] TipTap 에디터 설치 (`@tiptap/react`, `@tiptap/starter-kit`)
  - [ ] Zustand + TanStack Query 설치
  - [ ] `.env.local` 환경변수 템플릿 생성
  - [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts` 생성
  - [ ] 폴더 구조 생성 (07-coding-convention.md 기준)
  - [ ] ESLint + Prettier 설정
- **파일**:
  - `package.json`
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `.env.local.example`
  - `.eslintrc.json`
  - `.prettierrc`
- **완료 기준**: `npm run dev` 실행 시 기본 페이지 표시

---

## Phase 1: 공통 인프라

### P1-R1: Auth Resource

#### [ ] P1-R1-T1: Supabase Auth 스키마 + 미들웨어 구현
- **담당**: backend-specialist
- **리소스**: users
- **작업 목록**:
  - [ ] Supabase `users` 테이블 마이그레이션 (database.ts 타입 포함)
  - [ ] RLS 정책: 사용자 본인 데이터만 접근
  - [ ] `middleware.ts` 인증 체크 구현 (보호 경로 설정)
  - [ ] `lib/supabase/server.ts` SSR 쿠키 처리
- **파일**:
  - `supabase/migrations/001_users.sql`
  - `middleware.ts`
  - `types/database.ts`
- **TDD**: RED → GREEN → REFACTOR

#### [ ] P1-R1-T2: Auth API Route 구현
- **담당**: backend-specialist
- **엔드포인트**:
  - `POST /api/auth/login` (이메일 로그인)
  - `POST /api/auth/signup` (회원가입)
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- **파일**:
  - `app/api/auth/login/route.ts`
  - `app/api/auth/signup/route.ts`
  - `app/api/auth/logout/route.ts`
  - `app/api/auth/me/route.ts`
- **TDD**: `tests/api/auth.test.ts` → 구현

### P1-S0: 공통 레이아웃

#### [ ] P1-S0-T1: AppSidebar + AppHeader 구현
- **담당**: frontend-specialist
- **컴포넌트**:
  - `AppSidebar`: 240px 좌측 사이드바 (8개 메뉴)
  - `AppHeader`: 상단 헤더 (로고, 프로필)
  - `(dashboard)/layout.tsx`: 사이드바 + 헤더 조합 레이아웃
- **디자인**: 05-design-system.md 기준 색상/간격 적용
- **반응형**: Mobile(<768px) 하단 탭바, Tablet 아이콘만, Desktop 전체
- **파일**:
  - `components/layout/AppSidebar.tsx`
  - `components/layout/AppHeader.tsx`
  - `app/(dashboard)/layout.tsx`
- **TDD**: `tests/components/AppSidebar.test.tsx` → 구현

#### [ ] P1-S0-V: 공통 레이아웃 검증
- **담당**: test-specialist
- **검증 항목**:
  - [ ] 8개 네비게이션 링크 정상 렌더링
  - [ ] 미인증 접근 시 /login으로 리디렉션
  - [ ] 반응형 레이아웃 동작 (768px, 1024px 브레이크포인트)

---

## Phase 2: 블로그 관리 핵심

### P2-R1: Blogs Resource

#### [ ] P2-R1-T1: Blogs API 구현
- **담당**: backend-specialist
- **리소스**: blogs
- **엔드포인트**:
  - `GET /api/blogs` (목록, 사용자별)
  - `POST /api/blogs` (생성)
  - `GET /api/blogs/:id` (상세)
  - `PATCH /api/blogs/:id` (수정)
  - `DELETE /api/blogs/:id` (삭제)
- **필드**: id, user_id, name, slug, custom_domain, subdomain, description, ai_character_config, ai_provider, is_active, color
- **파일**:
  - `supabase/migrations/002_blogs.sql` (RLS 포함)
  - `app/api/blogs/route.ts`
  - `app/api/blogs/[id]/route.ts`
  - `types/blog.ts`
- **TDD**: `tests/api/blogs.test.ts` → 구현

### P2-R2: Posts Resource

#### [ ] P2-R2-T1: Posts API 구현
- **담당**: backend-specialist
- **리소스**: posts
- **엔드포인트**:
  - `GET /api/posts` (목록, blog_id 필터)
  - `POST /api/posts` (생성/발행)
  - `GET /api/posts/:id` (상세)
  - `PATCH /api/posts/:id` (수정)
  - `DELETE /api/posts/:id` (삭제)
- **필드**: id, blog_id, user_id, title, content, html_content, status, keywords, tags, seo_meta, view_count, published_at
- **파일**:
  - `supabase/migrations/003_posts.sql` (RLS 포함)
  - `app/api/posts/route.ts`
  - `app/api/posts/[id]/route.ts`
  - `types/post.ts`
- **TDD**: `tests/api/posts.test.ts` → 구현

### P2-R3: Snippets Resource

#### [ ] P2-R3-T1: Snippets API 구현
- **담당**: backend-specialist
- **리소스**: snippets
- **엔드포인트**:
  - `GET /api/snippets` (목록, blog_id 또는 전역)
  - `POST /api/snippets` (생성)
  - `PATCH /api/snippets/:id` (수정)
  - `DELETE /api/snippets/:id` (삭제)
- **필드**: id, user_id, blog_id, name, content, type
- **파일**:
  - `supabase/migrations/004_snippets.sql` (RLS 포함)
  - `app/api/snippets/route.ts`
  - `app/api/snippets/[id]/route.ts`
- **TDD**: `tests/api/snippets.test.ts` → 구현

### P2-S1: 로그인 화면

#### [ ] P2-S1-T1: 로그인 UI 구현
- **담당**: frontend-specialist
- **화면**: /login (screen-01)
- **컴포넌트**:
  - `LoginForm`: 이메일/비밀번호 폼 + 에러 표시
  - `SocialLoginButtons`: Google/GitHub OAuth 버튼
- **이벤트**:
  - submit → Supabase signInWithPassword → /dashboard 이동
  - click:forgot-password → 비밀번호 재설정 모달
- **파일**:
  - `app/(auth)/login/page.tsx`
  - `components/auth/LoginForm.tsx`
- **TDD**: `tests/pages/login.test.tsx` → 구현

#### [ ] P2-S1-V: 로그인 화면 검증
- **담당**: test-specialist
- **검증 항목**:
  - [ ] 유효한 자격증명 → /dashboard 이동
  - [ ] 잘못된 비밀번호 → 에러 메시지 표시, 폼 유지
  - [ ] Google OAuth 버튼 클릭 → OAuth 흐름 시작

### P2-S2: 회원가입 화면

#### [ ] P2-S2-T1: 회원가입 UI 구현
- **담당**: frontend-specialist
- **화면**: /signup (screen-02)
- **컴포넌트**:
  - `SignupForm`: 이메일/이름/비밀번호 + 약관 동의
  - `SocialSignupButtons`: Google/GitHub OAuth
- **파일**:
  - `app/(auth)/signup/page.tsx`
  - `components/auth/SignupForm.tsx`
- **TDD**: `tests/pages/signup.test.tsx` → 구현

#### [ ] P2-S2-V: 회원가입 화면 검증
- **검증 항목**:
  - [ ] 유효한 정보 → 계정 생성 → /dashboard 이동
  - [ ] 중복 이메일 → 에러 메시지
  - [ ] 약관 미동의 → 제출 차단

### P2-S3: 대시보드

#### [ ] P2-S3-T1: 대시보드 UI 구현
- **담당**: frontend-specialist
- **화면**: /dashboard (screen-03)
- **컴포넌트**:
  - `StatSummaryBar`: 총 방문자/조회수/글 수/예상 수익
  - `BlogStatGrid`: 블로그별 통계 카드 (고유 색상)
  - `RecentPostsList`: 최근 발행글 10개
  - `RevenueOverview`: 광고별 수익 기여 현황
  - `QuickActionButtons`: 글 작성 / 스케줄 추가
- **데이터 요구**: stats_summary, blogs, posts, ad_units
- **파일**:
  - `app/(dashboard)/dashboard/page.tsx`
  - `components/dashboard/StatSummaryBar.tsx`
  - `components/dashboard/BlogStatGrid.tsx`
  - `components/dashboard/RecentPostsList.tsx`
  - `components/dashboard/RevenueOverview.tsx`
- **TDD**: `tests/pages/dashboard.test.tsx` → 구현

#### [ ] P2-S3-V: 대시보드 검증
- **검증 항목**:
  - [ ] 모든 통계 카드 정상 렌더링
  - [ ] 블로그별 색상 구분 표시
  - [ ] 블로그 카드 클릭 → /blogs/:id 이동

### P2-S4: 블로그 목록

#### [ ] P2-S4-T1: 블로그 목록 UI 구현
- **담당**: frontend-specialist
- **화면**: /blogs (screen-04)
- **컴포넌트**:
  - `BlogListHeader`: 총 수 + 신규 생성 버튼
  - `BlogCardGrid`: 블로그 카드 그리드
  - `BlogCard`: 이름, 도메인, 방문자, 글 수, 빠른 작성
- **파일**:
  - `app/(dashboard)/blogs/page.tsx`
  - `components/blogs/BlogCard.tsx`
  - `hooks/useBlogs.ts`
- **TDD**: `tests/pages/blogs.test.tsx` → 구현

#### [ ] P2-S4-V: 블로그 목록 검증
- **검증 항목**:
  - [ ] 사용자 소유 블로그만 표시 (RLS)
  - [ ] 신규 생성 버튼 → /blogs/new 이동
  - [ ] 빠른 작성 버튼 → /editor/new?blogId=:id 이동

### P2-S5: 블로그 상세

#### [ ] P2-S5-T1: 블로그 상세 UI 구현
- **담당**: frontend-specialist
- **화면**: /blogs/:id (screen-05)
- **컴포넌트**:
  - `BlogHeader`: 블로그 정보 + 설정 버튼
  - `TabNav`: 발행글 / 통계 / 메모 탭
  - `PostsTab`: 글 목록 테이블 (편집/삭제)
  - `StatsTab`: 방문자/조회수 차트
  - `MemoTab`: 스니펫 목록 + 추가/편집
- **파일**:
  - `app/(dashboard)/blogs/[id]/page.tsx`
  - `components/blogs/PostsTab.tsx`
  - `components/blogs/StatsTab.tsx`
  - `components/blogs/MemoTab.tsx`
- **TDD**: `tests/pages/blog-detail.test.tsx` → 구현

#### [ ] P2-S5-V: 블로그 상세 검증
- **검증 항목**:
  - [ ] 탭 전환 정상 동작
  - [ ] 글 편집 클릭 → /editor/:id 이동
  - [ ] 스니펫 추가 모달 → 저장 후 목록 갱신

### P2-S6: 블로그 생성

#### [ ] P2-S6-T1: 블로그 생성 UI 구현
- **담당**: frontend-specialist
- **화면**: /blogs/new (screen-06)
- **컴포넌트**:
  - `BlogCreateForm`: 이름, 도메인 방식, AI 설정
  - `DomainConnectionGuide`: DNS 설정 안내 패널
- **파일**:
  - `app/(dashboard)/blogs/new/page.tsx`
  - `components/blogs/BlogCreateForm.tsx`
- **TDD**: `tests/pages/blog-new.test.tsx` → 구현

#### [ ] P2-S6-V: 블로그 생성 검증
- **검증 항목**:
  - [ ] 생성 성공 → /blogs/:id 이동
  - [ ] 중복 서브도메인 → 에러 메시지
  - [ ] 도메인 타입 토글 → 필드 전환

### P2-S7: 블로그 설정

#### [ ] P2-S7-T1: 블로그 설정 UI 구현
- **담당**: frontend-specialist
- **화면**: /blogs/:id/settings (screen-07)
- **컴포넌트**:
  - `SettingsTabNav`: 기본정보 / AI 캐릭터 / 광고 / 크로스링킹
  - `BasicInfoTab`: 이름, 도메인, 설명
  - `AICharacterTab`: 캐릭터 이름, 톤, 스타일, 페르소나
  - `AdsTab`: AdSense 코드 + 위치별 광고 단위
  - `CrossLinkTab`: 연결 블로그 선택
- **파일**:
  - `app/(dashboard)/blogs/[id]/settings/page.tsx`
  - `components/blogs/settings/`
- **TDD**: `tests/pages/blog-settings.test.tsx` → 구현

#### [ ] P2-S7-V: 블로그 설정 검증
- **검증 항목**:
  - [ ] AI 캐릭터 설정 저장 → 성공 토스트
  - [ ] 광고 단위 추가 → 목록 갱신
  - [ ] 크로스링킹 설정 저장

---

## Phase 3: 에디터 + AI 통합

### P3-R1: AI API Keys Resource

#### [ ] P3-R1-T1: AI API Keys 암호화 저장 구현
- **담당**: backend-specialist
- **리소스**: ai_api_keys
- **엔드포인트**:
  - `GET /api/ai-keys` (목록, 공급자별 is_active)
  - `POST /api/ai-keys` (생성, 암호화 저장)
  - `DELETE /api/ai-keys/:id` (삭제)
  - `POST /api/ai-keys/:id/test` (유효성 테스트)
- **보안**: `ENCRYPTION_KEY` 환경변수로 AES-256 암호화
- **파일**:
  - `supabase/migrations/005_ai_api_keys.sql` (RLS 포함)
  - `app/api/ai-keys/route.ts`
  - `lib/utils/encryption.ts`
- **TDD**: `tests/api/ai-keys.test.ts` → 구현

### P3-R2: AI Generation API

#### [ ] P3-R2-T1: AI 어댑터 패턴 구현
- **담당**: backend-specialist
- **아키텍처**: `AIAdapter` 인터페이스 → Claude/OpenAI/Gemini 어댑터
- **파일**:
  - `lib/ai/adapter.ts` (AIAdapter 인터페이스)
  - `lib/ai/claude.ts` (ClaudeAdapter)
  - `lib/ai/openai.ts` (OpenAIAdapter)
  - `lib/ai/gemini.ts` (GeminiAdapter)
  - `types/ai.ts`
- **TDD**: `tests/lib/ai-adapter.test.ts` → 구현

#### [ ] P3-R2-T2: AI 글 생성 API Route 구현
- **담당**: backend-specialist
- **엔드포인트**: `POST /api/ai/generate`
- **입력**: `{ keyword, relatedKeywords, blogIds, imageCount }`
- **출력**: `{ posts: { blogId, title, content, htmlContent }[] }`
- **파일**:
  - `app/api/ai/generate/route.ts`
- **TDD**: `tests/api/ai-generate.test.ts` → 구현

### P3-S1: 글 작성 에디터

#### [ ] P3-S1-T1: 에디터 UI 구현 (AI 생성 모드)
- **담당**: frontend-specialist
- **화면**: /editor/new (screen-08) - AI 생성 모드
- **컴포넌트**:
  - `EditorModeTab`: AI 생성 / 직접 작성 전환
  - `KeywordInput`: 키워드 입력 + 연관 키워드 탐색
  - `RelatedKeywordPanel`: 연관 키워드 칩 목록
  - `BlogMultiSelect`: 체크박스 멀티 선택
  - `ImageCountSelect`: 이미지 수 슬라이더
  - `AIGenerateButton`: 생성 버튼 + 로딩 상태
  - `GeneratedPostTabs`: 블로그별 생성된 글 탭
- **파일**:
  - `app/(dashboard)/editor/new/page.tsx`
  - `components/editor/AIGeneratePanel.tsx`
  - `components/editor/BlogMultiSelect.tsx`
  - `store/editorStore.ts`
- **TDD**: `tests/pages/editor-new.test.tsx` → 구현

#### [ ] P3-S1-T2: 에디터 UI 구현 (직접 작성 모드 + 공통)
- **담당**: frontend-specialist
- **컴포넌트**:
  - `PostEditor`: TipTap 리치텍스트 에디터 (HTML 모드 전환)
  - `ImageUploader`: 이미지 업로드 (Supabase Storage)
  - `SnippetDrawer`: 우측 스니펫 패널 드로어
  - `SEOMetaForm`: 메타 제목, 설명, OG 이미지
  - `PublishButton`: 즉시 발행
  - `ScheduleButton`: 예약 발행 모달
- **파일**:
  - `components/editor/PostEditor.tsx`
  - `components/editor/SnippetDrawer.tsx`
  - `components/editor/SEOMetaForm.tsx`
  - `hooks/usePosts.ts`
- **TDD**: `tests/components/PostEditor.test.tsx` → 구현

#### [ ] P3-S1-V: 에디터 검증
- **검증 항목**:
  - [ ] AI 글 생성 → 로딩 → 블로그별 탭에 결과 표시
  - [ ] 스니펫 클릭 → 에디터 커서 위치에 삽입
  - [ ] 발행 버튼 → 선택 블로그 발행 → /dashboard 이동
  - [ ] 내용 변경 → 3초 후 draft 자동 저장

### P3-S2: 글 편집

#### [ ] P3-S2-T1: 글 편집 UI 구현
- **담당**: frontend-specialist
- **화면**: /editor/:id (screen-09)
- **기존 글 로드**: posts/:id 데이터 에디터에 초기화
- **파일**:
  - `app/(dashboard)/editor/[id]/page.tsx`
- **TDD**: `tests/pages/editor-edit.test.tsx` → 구현

#### [ ] P3-S2-V: 글 편집 검증
- **검증 항목**:
  - [ ] 기존 글 데이터 에디터 로드 확인
  - [ ] 수정 후 저장 → 업데이트 확인
  - [ ] /blogs/:blogId로 이동

---

## Phase 4: 자동화 + 통계 + 광고 + 키워드

### P4-R1: Scheduler Resource

#### [ ] P4-R1-T1: Scheduler API 구현
- **담당**: backend-specialist
- **리소스**: scheduler_jobs, scheduler_logs
- **엔드포인트**:
  - `GET /api/scheduler/jobs` (규칙 목록)
  - `POST /api/scheduler/jobs` (규칙 생성)
  - `PATCH /api/scheduler/jobs/:id` (상태 변경 / 수정)
  - `DELETE /api/scheduler/jobs/:id` (삭제)
  - `GET /api/scheduler/logs` (실행 로그)
- **파일**:
  - `supabase/migrations/006_scheduler.sql`
  - `app/api/scheduler/jobs/route.ts`
  - `app/api/scheduler/jobs/[id]/route.ts`
  - `app/api/scheduler/logs/route.ts`
- **TDD**: `tests/api/scheduler.test.ts` → 구현

#### [ ] P4-R1-T2: Cron Job 자동 실행 구현
- **담당**: backend-specialist
- **엔드포인트**: `POST /api/cron/run` (Vercel Cron으로 호출)
- **로직**:
  - next_run_at <= now인 활성 작업 조회
  - keyword_pool에서 키워드 선택
  - AI 글 생성 → 블로그 발행
  - scheduler_logs 기록 + next_run_at 업데이트
- **파일**:
  - `app/api/cron/run/route.ts`
  - `vercel.json` (cron 설정)
- **TDD**: `tests/api/cron.test.ts` → 구현

### P4-R2: Stats Resource

#### [ ] P4-R2-T1: Stats API 구현
- **담당**: backend-specialist
- **리소스**: stats_summary
- **엔드포인트**:
  - `GET /api/stats` (전체 집계, 기간 필터)
  - `GET /api/stats/:blogId` (블로그별 상세)
- **파일**:
  - `supabase/migrations/007_stats.sql`
  - `app/api/stats/route.ts`
  - `app/api/stats/[blogId]/route.ts`
- **TDD**: `tests/api/stats.test.ts` → 구현

### P4-R3: Ad Units Resource

#### [ ] P4-R3-T1: Ad Units API 구현
- **담당**: backend-specialist
- **리소스**: ad_units
- **엔드포인트**:
  - `GET /api/ads` (광고 단위 목록)
  - `POST /api/ads` (생성)
  - `PATCH /api/ads/:id` (수정/활성화 토글)
  - `DELETE /api/ads/:id` (삭제)
- **파일**:
  - `supabase/migrations/008_ad_units.sql`
  - `app/api/ads/route.ts`
  - `app/api/ads/[id]/route.ts`
- **TDD**: `tests/api/ads.test.ts` → 구현

### P4-R4: Keyword Searches Resource

#### [ ] P4-R4-T1: Keyword Search API 구현
- **담당**: backend-specialist
- **리소스**: keyword_searches
- **엔드포인트**:
  - `GET /api/keywords/search?q=:keyword` (외부 SEO API 조회 + 저장)
  - `GET /api/keywords/trending` (트렌딩 키워드)
  - `GET /api/keywords/history` (검색 이력)
- **외부 연동**: Google Trends / DataForSEO API
- **파일**:
  - `supabase/migrations/009_keywords.sql`
  - `app/api/keywords/search/route.ts`
  - `app/api/keywords/trending/route.ts`
- **TDD**: `tests/api/keywords.test.ts` → 구현

### P4-S1: 스케줄러

#### [ ] P4-S1-T1: 스케줄러 UI 구현
- **담당**: frontend-specialist
- **화면**: /scheduler (screen-10)
- **컴포넌트**:
  - `SchedulerTabNav`: 4개 탭 전환
  - `JobList` + `JobCard`: 자동화 규칙 목록
  - `JobCreateModal`: 규칙 생성 폼
  - `KeywordPoolTable`: 키워드 풀 관리
  - `ScheduleCalendar`: 예약 타임라인 (월/주 뷰)
  - `LogTable`: 실행 로그
- **파일**:
  - `app/(dashboard)/scheduler/page.tsx`
  - `components/scheduler/`
  - `hooks/useScheduler.ts`
- **TDD**: `tests/pages/scheduler.test.tsx` → 구현

#### [ ] P4-S1-V: 스케줄러 검증
- **검증 항목**:
  - [ ] 규칙 생성 → 목록 추가 + next_run_at 계산
  - [ ] 토글 클릭 → 상태 paused/active 전환
  - [ ] CSV 업로드 → 키워드 풀 추가

### P4-S2: 통계

#### [ ] P4-S2-T1: 통계 UI 구현
- **담당**: frontend-specialist
- **화면**: /stats (screen-11)
- **컴포넌트**:
  - `DateRangePicker`: 기간 선택 (Recharts 또는 내장)
  - `OverallStatCards`: 총 방문자/조회수/글 수
  - `BlogCompareChart`: 블로그별 방문자 바 차트
  - `PostPerformanceTable`: 글별 조회수 성과
  - `TrendChart`: 일별/주별 추이 라인 차트
- **파일**:
  - `app/(dashboard)/stats/page.tsx`
  - `components/shared/DateRangePicker.tsx`
  - `components/stats/`
- **TDD**: `tests/pages/stats.test.tsx` → 구현

#### [ ] P4-S2-V: 통계 검증
- **검증 항목**:
  - [ ] 기간 변경 → 통계 재조회
  - [ ] 블로그 비교 차트 고유 색상 표시
  - [ ] 글 행 클릭 → /editor/:id 이동

### P4-S3: 광고 관리

#### [ ] P4-S3-T1: 광고 관리 UI 구현
- **담당**: frontend-specialist
- **화면**: /ads (screen-12)
- **컴포넌트**:
  - `AdUnitList`: 광고 단위 목록 + 토글
  - `AdUnitCreateModal`: 광고 단위 생성 폼
  - `RevenueChart`: 수익 추이 차트
  - `AdPerformanceTable`: 광고별 수익 기여
- **파일**:
  - `app/(dashboard)/ads/page.tsx`
  - `components/ads/`
- **TDD**: `tests/pages/ads.test.tsx` → 구현

#### [ ] P4-S3-V: 광고 관리 검증
- **검증 항목**:
  - [ ] 광고 단위 생성 → 목록 추가
  - [ ] 토글 클릭 → 활성/비활성 전환
  - [ ] 수익 차트 최근 30일 표시

### P4-S4: SEO 키워드 탐색기

#### [ ] P4-S4-T1: 키워드 탐색기 UI 구현
- **담당**: frontend-specialist
- **화면**: /keywords (screen-13)
- **컴포넌트**:
  - `KeywordSearchInput`: 검색 입력
  - `TrendingKeywordList`: 트렌딩 키워드 목록
  - `SeasonalKeywordCalendar`: 시즌성 캘린더
  - `KeywordDetailCard`: 검색량, 경쟁도, 관련 키워드
  - `AddToSchedulerButton` / `AddToEditorButton`
- **파일**:
  - `app/(dashboard)/keywords/page.tsx`
  - `components/keywords/`
- **TDD**: `tests/pages/keywords.test.tsx` → 구현

#### [ ] P4-S4-V: 키워드 탐색기 검증
- **검증 항목**:
  - [ ] 검색 → keyword_searches 저장 + 결과 표시
  - [ ] 에디터로 버튼 → /editor/new?keyword=:keyword 이동
  - [ ] 스케줄러 추가 → keyword_pool 업데이트

### P4-S5: 설정

#### [ ] P4-S5-T1: 설정 UI 구현
- **담당**: frontend-specialist
- **화면**: /settings (screen-14)
- **컴포넌트**:
  - `SettingsNav`: 계정 / AI API / 외부 연동 / 알림 탭
  - `AccountTab`: 프로필 편집 + 비밀번호 변경
  - `AIAPITab`: API 키 추가/삭제/테스트 (마스킹 표시)
  - `ExternalIntegrationTab`: Notion / Google Sheets (선택)
  - `NotificationTab`: 알림 설정
- **파일**:
  - `app/(dashboard)/settings/page.tsx`
  - `components/settings/`
- **TDD**: `tests/pages/settings.test.tsx` → 구현

#### [ ] P4-S5-V: 설정 검증
- **검증 항목**:
  - [ ] API 키 저장 → 암호화 저장 + 마스킹 표시
  - [ ] API 키 테스트 → 성공/실패 결과 표시
  - [ ] 프로필 수정 → 성공 토스트

---

## 병렬 실행 가이드

### 병렬 가능 그룹

```
P2-R1 || P2-R2 || P2-R3          # Backend Resource 동시 작업 가능
P2-S1 || P2-S2                    # Auth 화면 동시 가능 (P1-R1 완료 후)
P4-R1 || P4-R2 || P4-R3 || P4-R4 # P4 Resource 동시 가능
P4-S1 || P4-S2 || P4-S3 || P4-S4 || P4-S5  # P4 Screen 동시 (Resource 완료 후)
```

### 순차 필수 그룹

```
P0-T1 → P1-R1 → P2-R1 → P3-R2 → P3-S1
P1-R1 → P2-S1
P2-R1 → P2-S3 (대시보드)
```

---

## 기술 스택 참조

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 App Router + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Editor | TipTap |
| State | Zustand + TanStack Query |
| Backend | Next.js API Routes (Route Handlers) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (소셜 + 이메일) |
| Storage | Supabase Storage (이미지) |
| AI | Claude API + OpenAI API + Gemini API |
| Deploy | Vercel (Cron 포함) |

---

## 완료 기준 (Definition of Done)

- [ ] TypeScript strict 에러 없음
- [ ] ESLint 경고 없음 (`no-explicit-any: error`)
- [ ] 각 태스크의 테스트 통과
- [ ] Supabase RLS 정책 적용 (다른 사용자 데이터 접근 차단)
- [ ] 반응형 레이아웃 (Mobile/Tablet/Desktop)
- [ ] 에러 상태 및 로딩 상태 처리
