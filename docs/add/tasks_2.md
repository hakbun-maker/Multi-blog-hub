# 수익화 로켓 추가개발 보완 TASKS (tasks_2.md)

> 생성일: 2026-03-19 | 기반: 갭 분석 (기획 vs 실제 구현)
> 선행 완료: Phase PT(요금제), Phase PC(동의서 컴포넌트), P0(DB+엔진), P1(백엔드 API)
> 범위: 프론트엔드 UI 연결 + 미완성 기능 보완
> 원칙: 백엔드 API는 96% 실구현 → **프론트엔드 연결이 핵심**

---

## 전체 현황

| Phase | 설명 | 태스크 | 복잡도 | 상태 |
|-------|------|--------|--------|------|
| **P1** | Quick Wins (독립, 즉시 가능) | 4 | S | ✅ 완료 |
| **P2** | Blog Settings 3탭 추가 | 8 | M | ✅ 완료 |
| **P3** | Editor 검수 워크플로우 | 5 | M-L | ✅ 완료 (T2-13~17) |
| **P4** | API Keys 탭 확장 | 4 | M | ✅ 완료 (T2-18~21) |
| **P5** | Consent 연동 | 5 | S-M | ✅ 완료 (T2-22~26) |
| **P6** | SNS Platform Publishing (Future) | 4 | L | ✅ 완료 (T2-27~30) |
| **합계** | | **30** | | **30/30 완료** |

---

## 갭 분석 요약 (왜 이 태스크들이 필요한가)

| # | 갭 | 현재 상태 | 목표 상태 |
|---|---|----------|----------|
| 1 | 블로그 설정 탭 부족 | 4탭 (basic/categories/ai/layout) | 7탭 (+language/sns/monetize) |
| 2 | 에디터 검수 워크플로우 | ?from=review 미감지 | 사이드패널 + 검수리포트 + 재검수 |
| 3 | API 키 관리 범위 | AI 4종만 표시 | 9종 + 카테고리별 발급 가이드 |
| 4 | 블로그 카드 언어 표시 | language 컬럼 있으나 UI 미표시 | 비한국어 블로그에 언어 배지 |
| 5 | 동의서 강제 적용 | 컴포넌트만 존재 | 기능별 ConsentGate 래핑 |
| 6 | SNS 실제 발행 | DB 기록만, OAuth 미구현 | 실 플랫폼 발행 (Future) |

---

## Phase 1: Quick Wins

> 독립적, 각 30분 이내 완료 가능. 병렬 실행 가능.

### [x] T2-01: 블로그 카드에 언어 배지 추가 ✅

- **설명**: `GET /api/blogs` 응답에 `language` 필드 포함됨 (DB 기본값 'ko'). 비한국어 블로그에 언어 배지 표시.
- **수정 파일**:
  - `app/(dashboard)/blogs/page.tsx`
- **작업**:
  - [x] `Blog` 타입에 `language?: string` 추가
  - [x] `LANGUAGE_LABELS` 상수 추가
  - [x] 블로그 카드 배지 영역에 언어 배지 렌더링 (한국어 포함 항상 표시)
  - [x] 블로그 글 관리 테이블에도 언어 컬럼 추가
  - [x] **추가**: 카드 레이아웃 재구성 (배지 상단 정렬, 이름 truncate, 글 수 통합)
- **완료일**: 2026-03-20

### [x] T2-02: RevenueGuidePanel 대시보드 연결 ✅

- **설명**: `RevenueGuidePanel` 컴포넌트 및 `POST /api/monetize/revenue-guide` API 모두 존재. 대시보드 페이지에 미연결.
- **수정 파일**:
  - `app/(dashboard)/monetize/page.tsx`
  - `lib/monetize/engines/revenue-calculator.ts`
  - `components/monetize/dashboard/RevenueGuidePanel.tsx`
- **작업**:
  - [x] `RevenueGuidePanel` import 추가 + props 전달
  - [x] **추가**: 수익 계산 로직 전면 개선 — 등급별 차등 CPC/트래픽 포트폴리오 전략
  - [x] **추가**: S/A/B 등급별 추천 블로그 유형, CPC, 방문자 수 차등 적용
  - [x] **추가**: API 비용 추정 및 순수익 계산 포함
  - [x] **추가**: 블로그 포트폴리오 카드 UI (추천 카테고리, 수익 상세)
- **완료일**: 2026-03-20

### [x] T2-03: 설정 탭명 변경 "AI API 키" → "API 키 관리" ✅

- **설명**: screen-09 기획에 따라 탭명 변경. 단순 문자열 교체.
- **수정 파일**:
  - `app/(dashboard)/settings/page.tsx`
- **작업**:
  - [x] `TabsTrigger value="ai-keys"` 라벨을 `API 키 관리`로 변경
- **완료일**: 2026-03-19

### [x] T2-04: 설정에 "동의 관리" 탭 플레이스홀더 추가 ✅

- **설명**: PC-T8 기획에 따라 설정 페이지에 동의 관리 탭 슬롯 추가. Phase 5에서 실 컴포넌트로 교체.
- **수정 파일**:
  - `app/(dashboard)/settings/page.tsx`
- **작업**:
  - [x] `TabsTrigger value="consent"` + `Shield` 아이콘 + "동의 관리" 라벨 추가
  - [x] `TabsContent value="consent"` 플레이스홀더 텍스트 추가
- **완료일**: 2026-03-19

---

## Phase 2: Blog Settings 3탭 추가

> 블로그 설정 페이지에 language, sns, monetize 탭 추가.
> 백엔드 API 모두 실구현 완료: GET/PUT /api/blogs/[id]/settings/language, sns, affiliate
> 기존 컴포넌트 재사용: SNSSettingsPanel, AffiliateSettingsPanel

### [x] T2-05: SettingsTab 타입 확장 (4→7탭) ✅

- **설명**: 탭 타입과 네비게이션을 7개로 확장.
- **수정 파일**:
  - `app/(dashboard)/blogs/[id]/settings/page.tsx`
- **작업**:
  - [x] `SettingsTab` 타입: `'basic' | 'categories' | 'ai' | 'layout' | 'language' | 'sns' | 'monetize'`
  - [x] `TABS` 배열에 3개 추가
  - [x] `FeatureGate` import 추가 + 탭 overflow-x-auto 스크롤 지원
- **완료일**: 2026-03-20

### [x] T2-06: 언어 선택 기능 ✅ (기본정보 탭에 통합)

- **설명**: 6개 언어 선택 UI. 별도 탭이 아닌 기본정보 탭 내 select로 구현.
- **수정 파일**:
  - `app/(dashboard)/blogs/[id]/settings/page.tsx`
  - `app/api/blogs/[id]/route.ts`
- **작업**:
  - [x] `LANGUAGES` 상수 추가 (6개 언어)
  - [x] `blogLanguage` 상태 + select UI 추가
  - [x] PATCH API에 `language` 필드 처리 추가
  - [x] 저장 시 DB `language` 컬럼 업데이트
- **완료일**: 2026-03-20
- **비고**: 별도 컴포넌트 대신 기본정보 탭에 통합. FeatureGate는 추후 필요 시 적용.

### [x] T2-07: DataSourcePreview 컴포넌트 ✅

- **설명**: 선택 언어의 데이터소스 매핑 읽기전용 표시. DB 미저장, 런타임 계산.
- **신규 파일**:
  - `components/blogs/settings/language/DataSourcePreview.tsx`
- **작업**:
  - [x] Props: `{ language: BlogLanguage }`
  - [x] `DATA_SOURCE_MAP` 상수: 언어별 keyword/trend/affiliate/timezone/publishTime 매핑
  - [x] 아이콘 포함 정보 카드 UI (Database, TrendingUp, ShoppingBag, Clock)
- **완료일**: 2026-03-20

### [x] T2-08: 언어 탭 연결 (settings page) ✅

- **설명**: 블로그 설정 페이지에 언어 탭 콘텐츠 연결. API: `GET/PUT /api/blogs/[id]/settings/language`
- **수정 파일**:
  - `app/(dashboard)/blogs/[id]/settings/page.tsx`
- **작업**:
  - [x] `writeStyle` 상태 추가 + `useEffect`에서 language 설정 fetch
  - [x] `activeTab === 'language'` 블록: LanguageSelector + DataSourcePreview + AffiliateDefaultNotice + writeStyle textarea + 저장 버튼
  - [x] `handleSaveLanguageSettings`: `PUT /api/blogs/[id]/settings/language` with `{ language, writeStyle }`
  - [x] LanguageSelector 컴포넌트 내부에서 비ko 플랜 체크 처리
- **완료일**: 2026-03-20

### [x] T2-09: SNS 탭 연결 (기존 컴포넌트 활용) ✅

- **설명**: 기존 `SNSSettingsPanel` 컴포넌트를 블로그 설정 SNS 탭에 연결.
- **수정 파일**:
  - `app/(dashboard)/blogs/[id]/settings/page.tsx`
- **작업**:
  - [x] `SNSSettingsPanel` import + `FeatureGate(sns_auto_deploy, pro)` 래핑
  - [x] `activeTab === 'sns'` 블록에 렌더링
- **완료일**: 2026-03-20

### [x] T2-10: 수익화 연동 탭 연결 (기존 컴포넌트 활용) ✅

- **설명**: 기존 `AffiliateSettingsPanel` 컴포넌트를 블로그 설정 수익화 탭에 연결.
- **수정 파일**:
  - `app/(dashboard)/blogs/[id]/settings/page.tsx`
- **작업**:
  - [x] `AffiliateSettingsPanel` import + `FeatureGate(coupang_affiliate, pro)` 래핑
  - [x] `activeTab === 'monetize'` 블록에 렌더링
- **완료일**: 2026-03-20

### [x] T2-11: ApiKeyStatusBadge 링크 연결 ✅

- **설명**: SNS/Affiliate 설정 패널의 "준비 중" 버튼을 `/settings?tab=ai-keys`로 링크 변경.
- **수정 파일**:
  - `components/monetize/sns/SNSSettingsPanel.tsx`
  - `components/monetize/affiliate/AffiliateSettingsPanel.tsx`
- **작업**:
  - [x] SNSSettingsPanel.handleConnect: toast + `router.push('/settings?tab=ai-keys')`
  - [x] AffiliateSettingsPanel: disabled 버튼 → `<Link href="/settings?tab=ai-keys">설정 > API 키 관리에서 등록</Link>`
- **완료일**: 2026-03-20

### [x] T2-12: 블로그 설정 URL ?tab= 쿼리파라미터 지원 ✅

- **설명**: `/blogs/[id]/settings?tab=language` 등으로 직접 탭 이동 가능하게.
- **수정 파일**:
  - `app/(dashboard)/blogs/[id]/settings/page.tsx`
- **작업**:
  - [x] `useSearchParams` import + `activeTab` 초기값을 searchParams에서 파생
  - [x] `Suspense` 래핑 (BlogSettingsContent + BlogSettingsPage wrapper)
- **완료일**: 2026-03-20

---

## Phase 3: Editor 검수 워크플로우

> `/editor/[id]?from=review` 진입 시 수익화 검수 사이드패널 표시.
> 기존 컴포넌트 존재: MonetizeEditorHeader, MonetizeEditorSidebar, MonetizeEditorActions
> 백엔드 API 존재: /api/writing/edit-context/[id], re-score, ai-improve

### [x] T2-13: ?from=review 감지 + edit-context fetch ✅

- **설명**: 에디터 페이지에서 `?from=review` 파라미터 감지 후 수익화 컨텍스트 로드.
- **수정 파일**:
  - `app/(dashboard)/editor/[id]/page.tsx`
- **작업**:
  - [x] `useSearchParams` import + Suspense 래핑
  - [x] `isReviewMode` 상태 추가 (`from === 'review'` 감지)
  - [x] `editContext` 상태 추가 (keyword, grade, intent, blog, score 등)
  - [x] `isReviewMode` 일 때 `GET /api/writing/edit-context/${id}` fetch
  - [x] editContext.content를 에디터 초기값으로 설정
- **의존**: 없음
- **복잡도**: M
- **완료일**: 2026-03-21

### [x] T2-14: MonetizeEditorHeader 조건부 렌더링 ✅

- **설명**: 검수 모드 진입 시 에디터 상단에 키워드/등급/인텐트/블로그명 표시.
- **수정 파일**:
  - `app/(dashboard)/editor/[id]/page.tsx`
- **작업**:
  - [x] `MonetizeEditorHeader` import
  - [x] `isReviewMode && editContext` 조건으로 제목 입력 위에 렌더링
- **의존**: T2-13
- **복잡도**: S
- **완료일**: 2026-03-21

### [x] T2-15: MonetizeEditorSidebar 그리드 레이아웃 ✅

- **설명**: 검수 모드 시 에디터를 2/3 + 1/3 그리드로 변경. 사이드패널에 검수 점수, AI 개선, SEO 체크리스트 표시.
- **수정 파일**:
  - `app/(dashboard)/editor/[id]/page.tsx`
- **작업**:
  - [x] `MonetizeEditorSidebar` import
  - [x] 레이아웃 조건 분기: `isReviewMode ? 'grid grid-cols-3 gap-6' : ''`
  - [x] 에디터 영역: `col-span-2` / 사이드패널: `col-span-1`
  - [x] MonetizeEditorSidebar는 내부에 FeatureGate 포함 (이중 래핑 불필요)
- **의존**: T2-13
- **복잡도**: M
- **완료일**: 2026-03-21

### [x] T2-16: MonetizeEditorActions 렌더링 ✅

- **설명**: 검수 모드 시 저장/재검수/승인/거절 액션 버튼 추가.
- **수정 파일**:
  - `app/(dashboard)/editor/[id]/page.tsx`
- **작업**:
  - [x] `MonetizeEditorActions` import
  - [x] 사이드패널 하단에 렌더링 (postId, content, score props)
  - [x] 이미 내부적으로 draft/re-score/approve/reject API 호출
- **의존**: T2-15
- **복잡도**: S
- **완료일**: 2026-03-21

### [x] T2-17: AI 개선 이벤트 리스너 연결 ✅

- **설명**: `AIImproveSuggestion`이 `CustomEvent('ai-improve-content')` 발생시킴. 에디터가 이를 수신하여 콘텐츠 갱신.
- **수정 파일**:
  - `app/(dashboard)/editor/[id]/page.tsx`
- **작업**:
  - [x] `useEffect`에서 `ai-improve-content` 이벤트 리스너 등록
  - [x] 이벤트 수신 시 `setHtmlContent(e.detail.content)`
  - [x] `isReviewMode` 일 때만 리스너 활성화
- **의존**: T2-15
- **복잡도**: S
- **완료일**: 2026-03-21

---

## Phase 4: API Keys 탭 확장

> 현재 AI 4종만 표시. keyword(naver_ad, naver_search, google_kwp) + monetize(coupang, amazon) 추가.
> 백엔드 ai_api_keys 테이블은 이미 9개 provider 지원.

### [x] T2-18: ApiGuideAccordion 컴포넌트 연결 ✅

- **설명**: 카테고리별 접히는 API 발급 가이드. `ApiGuideAccordion` 컴포넌트 + `api-guide-contents.ts` 데이터 존재.
- **수정 파일**:
  - `app/(dashboard)/settings/page.tsx`
- **작업**:
  - [x] `ApiGuideAccordion` import 추가
  - [x] API 키 등록 폼에서 프로바이더 선택 시 상세 가이드 아코디언 표시
- **완료일**: 2026-03-21

### [x] T2-19: Provider 정의 확장 ✅

- **설명**: 현재 TEXT_PROVIDERS(3) + IMAGE_PROVIDERS(1)에 KEYWORD_PROVIDERS(3) + MONETIZE_PROVIDERS(2) 추가.
- **수정 파일**:
  - `app/(dashboard)/settings/page.tsx`
- **작업**:
  - [x] `KEYWORD_PROVIDERS` 상수 추가: naver_ad(Key+Secret), naver_search(ID+Secret), google_kwp
  - [x] `MONETIZE_PROVIDERS` 상수 추가: coupang(Key+Secret), amazon(Key+Secret)
  - [x] `AIKey` 인터페이스 provider를 `string`으로 확장
  - [x] 각 프로바이더에 `needsSecret`, `secretPlaceholder`, `secretLabel`, `guide` 필드 추가
- **완료일**: 2026-03-20

### [x] T2-20: API 키 탭 4카테고리 섹션 재구성 ✅

- **설명**: 단일 리스트 → 4개 카테고리 섹션으로 재구성.
- **수정 파일**:
  - `app/(dashboard)/settings/page.tsx` (ai-keys TabsContent 교체)
- **작업**:
  - [x] 4개 섹션: 텍스트 생성 AI / 이미지 생성 AI / 키워드 분석 도구 / 수익화 (제휴 마케팅)
  - [x] 각 섹션에 카테고리별 색상 구분 (primary/violet/emerald/orange)
  - [x] 등록 폼에 `apiSecret` 필드 지원 + show/hide 토글
  - [x] 기존 키 행 UI 패턴 유지 (마스킹 + 활성 토글 + 테스트 + 삭제)
  - [x] 등록된 키 목록에 카테고리 배지 표시 + 시크릿 포함 표시
  - [x] 각 프로바이더 선택 시 설명 + 발급 가이드 링크 표시
- **완료일**: 2026-03-20

### [x] T2-21: Provider 카테고리 매핑 유틸리티 ✅ (settings 페이지에 인라인 구현)

- **설명**: provider → category 매핑 헬퍼.
- **수정 파일**:
  - `app/(dashboard)/settings/page.tsx` (별도 파일 대신 인라인)
- **작업**:
  - [x] `PROVIDER_CATEGORY_LABEL` 상수 (label + badge variant)
  - [x] `getProviderCategory(provider)` 함수
  - [x] `getCategoryBadge(provider)` 함수 (등록된 키 목록에서 사용)
- **완료일**: 2026-03-20
- **비고**: `lib/api-keys/categories.ts`로 분리하지 않고 settings 페이지에 직접 구현. 다른 곳에서 재사용 필요 시 분리.

---

## Phase 5: Consent 연동

> 동의서 컴포넌트(ConsentGate, ConsentInlinePanel, ConsentPreActionModal) 모두 구현 완료.
> 실제 기능 트리거 포인트에 ConsentGate를 래핑하는 작업.

### [x] T2-22: API 키 등록 → ConsentGate(api_key_storage) ✅

- **설명**: API 키 등록 폼을 `ConsentGate(api_key_storage, inline_panel)`로 래핑.
- **수정 파일**:
  - `app/(dashboard)/settings/page.tsx`
- **작업**:
  - [x] `ConsentGate` import
  - [x] API 키 등록 폼 Card를 ConsentGate로 래핑
  - [x] 미동의 시 ConsentInlinePanel 표시 → 동의 후 폼 노출
- **의존**: T2-20
- **복잡도**: S
- **완료일**: 2026-03-21

### [x] T2-23: 로켓 활성화 → ConsentGate(automation) ✅

- **설명**: 수익화 대시보드의 RocketStatusCard + RevenueSummaryCard를 자동화 동의 모달로 래핑.
- **수정 파일**:
  - `app/(dashboard)/monetize/page.tsx`
- **작업**:
  - [x] `ConsentGate(automation, modal)` 래핑 (RocketStatusCard + RevenueSummaryCard grid)
- **의존**: 없음
- **복잡도**: S
- **완료일**: 2026-03-21

### [x] T2-24: SNS OAuth → ConsentGate(sns_oauth_{platform}) ✅

- **설명**: 각 SNS 플랫폼 연결 버튼에 플랫폼별 동의 모달 적용.
- **수정 파일**:
  - `components/monetize/sns/SNSSettingsPanel.tsx`
- **작업**:
  - [x] 플랫폼별 consent_type 매핑: `sns_oauth_${platform.id}` as ConsentType
  - [x] 각 "연결하기" 버튼을 `ConsentGate(sns_oauth_{platform}, modal)`로 래핑
- **의존**: T2-09
- **복잡도**: S
- **완료일**: 2026-03-21

### [x] T2-25: 제휴마케팅 → ConsentGate(affiliate_marketing) ✅

- **설명**: 제휴마케팅 자동삽입 카드에 동의 패널 적용.
- **수정 파일**:
  - `components/monetize/affiliate/AffiliateSettingsPanel.tsx`
- **작업**:
  - [x] 자동삽입 카드를 `ConsentGate(affiliate_marketing, inline_panel)`로 래핑
- **의존**: T2-10
- **복잡도**: S
- **완료일**: 2026-03-21

### [x] T2-26: ConsentManagementSection 빌드 ✅

- **설명**: 설정 > 동의 관리 탭에 동의 현황 + 철회 기능 구현. T2-04 플레이스홀더를 교체.
- **수정 파일**:
  - `components/settings/ConsentManagementSection.tsx` (기존 파일 버그 수정)
  - `app/(dashboard)/settings/page.tsx` (consent 탭 플레이스홀더 교체)
- **작업**:
  - [x] `GET /api/consents` fetch → 동의 현황 리스트 (API 응답 형식 snake_case 맞춤)
  - [x] 각 consent_type: 라벨 + 동의일 + 버전 + 상태 표시
  - [x] 필수(tos, privacy): "필수" 배지, 철회 버튼 숨김
  - [x] 선택: "철회" 버튼 + 확인 다이얼로그 (연쇄 처리 경고)
  - [x] 철회: `POST /api/consents/[type]/revoke` (reason 필드 포함)
  - [x] 설정 페이지에서 `ConsentManagementSection` import + 플레이스홀더 교체
- **의존**: T2-04
- **복잡도**: M
- **완료일**: 2026-03-21

---

## Phase 6: SNS Platform Publishing (Future)

> SNS publish API는 DB 기록 완료, 실제 플랫폼 발행 코드가 주석 처리 상태.
> OAuth 앱 등록이 선행 필요 (Meta Developer, X Developer).
> 별도 스프린트로 진행 권장.

### [x] T2-27: OAuth 콜백 라우트 (Instagram/Twitter/Threads) ✅

- **설명**: 각 플랫폼 OAuth 2.0 code exchange 핸들러.
- **신규 파일**:
  - `lib/sns/oauth-config.ts` (공통 OAuth 설정 상수)
  - `app/api/oauth/[platform]/authorize/route.ts` (동적 라우트)
  - `app/api/oauth/[platform]/callback/route.ts` (동적 라우트)
- **작업**:
  - [x] OAuth code → access token 교환 (Instagram/Twitter/Threads)
  - [x] 암호화 후 blog_settings.snsSettings에 저장
  - [x] 블로그 설정 SNS 탭으로 리디렉트
  - [x] CSRF state 검증 (userId + blogId + nonce)
  - [x] Instagram long-lived token 자동 교환
- **선행 조건**: Meta Developer App, X Developer App 등록 완료
- **의존**: T2-24
- **복잡도**: L
- **완료일**: 2026-03-22

### [x] T2-28: 플랫폼 발행 함수 구현 ✅

- **설명**: 주석 처리된 SNS publish 코드를 실구현으로 교체.
- **수정 파일**:
  - `app/api/monetize/sns/publish/route.ts` (실구현으로 교체)
- **신규 파일**:
  - `lib/sns/publishers/instagram.ts` (Graph API container → publish)
  - `lib/sns/publishers/twitter.ts` (X API v2 tweets)
  - `lib/sns/publishers/threads.ts` (Threads API container → publish)
- **작업**:
  - [x] 각 publisher: access token 복호화 → 플랫폼 API 호출 → platform_post_id 반환
  - [x] Instagram: Graph API `/me/media` + `/me/media_publish`
  - [x] Twitter: `POST https://api.twitter.com/2/tweets`
  - [x] Threads: Meta Threads API container → publish
  - [x] sns_posts 레코드 status 업데이트 (pending → published)
  - [x] 플랫폼 연결 상태 확인 후 발행
- **의존**: T2-27
- **복잡도**: L
- **완료일**: 2026-03-22

### [x] T2-29: SNSSettingsPanel → 실제 OAuth 리디렉트 ✅

- **설명**: "연결하기" 버튼 클릭 시 실제 OAuth 인증 URL로 리디렉트.
- **수정 파일**:
  - `components/monetize/sns/SNSSettingsPanel.tsx`
- **작업**:
  - [x] `handleConnect` → `/api/oauth/{platform}/authorize?blogId=` 리디렉트
  - [x] 연결 상태 표시 (green/red/gray indicator + connectedAt)
  - [x] 연결 해제 기능 (Unlink 버튼)
  - [x] SNSFormatPromptInput: PASONA 기반 플랫폼별 프롬프트 (기본값 복원 지원)
  - [x] ImageGenToggle: 이미지 자동 생성 ON/OFF + 스타일 선택
  - [x] ApiKeyStatusBadge: Imagen API 키 상태 표시
  - [x] 전체 설정 저장 버튼
- **의존**: T2-27
- **복잡도**: M
- **완료일**: 2026-03-22

### [x] T2-30: SNS 연결 테스트 기능 ✅

- **설명**: 저장된 access token이 유효한지 확인하는 테스트 버튼.
- **신규 파일**:
  - `app/api/blogs/[id]/settings/sns/test/[platform]/route.ts`
- **수정 파일**:
  - `components/monetize/sns/SNSSettingsPanel.tsx` (테스트 버튼 + 결과 표시)
- **작업**:
  - [x] API: token 복호화 → 경량 API 호출 (프로필 조회) → 성공/실패 + username 반환
  - [x] Instagram: Graph API 비즈니스 계정 프로필
  - [x] Twitter: /2/users/me 프로필
  - [x] Threads: /me 프로필
  - [x] UI: 각 플랫폼 옆 TestTube 아이콘 버튼 + toast 결과
- **의존**: T2-27
- **복잡도**: M
- **완료일**: 2026-03-22

---

## 실행 순서 권장

```
1일차: Phase 1 전체 (T2-01~04 병렬) + Phase 2 시작 (T2-05 탭 확장)
2일차: Phase 2 계속 (T2-06~12) + Phase 4 독립 준비 (T2-18, T2-19, T2-21)
3일차: Phase 3 (T2-13~17 에디터 검수) + Phase 4 마무리 (T2-20)
4일차: Phase 5 (T2-22~26 동의서 연동)
이후:  Phase 6 (T2-27~30 SNS OAuth — 플랫폼 앱 등록 후)
```

---

## 핵심 아키텍처 원칙

1. **기존 컴포넌트 재사용**: SNSSettingsPanel, AffiliateSettingsPanel, MonetizeEditorSidebar 등 이미 존재하는 컴포넌트를 import하여 연결만 하면 됨
2. **이중 FeatureGate 방지**: 컴포넌트 내부에 이미 FeatureGate가 있으면 외부에 중복 래핑하지 않음
3. **ConsentGate 래퍼 패턴**: ConsentGate는 blocking이 아닌 graceful degradation — 미동의 시 동의 UI 표시, 동의 후 children 렌더링
4. **탭 확장 패턴**: 새 탭 콘텐츠는 별도 컴포넌트로 분리하여 import — 설정 페이지 비대화 방지

---

## 검증 체크리스트

- [x] `npm run build` 빌드 성공 (2026-03-21)
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] Phase 1: `/blogs` → 비ko 블로그에 언어 배지 표시
- [ ] Phase 1: `/monetize` → RevenueGuidePanel 접힌 상태로 표시
- [ ] Phase 2: `/blogs/[id]/settings?tab=language` → 6개 언어 선택 + 데이터소스 미리보기
- [ ] Phase 2: `/blogs/[id]/settings?tab=sns` → SNS 설정 패널 표시
- [ ] Phase 2: `/blogs/[id]/settings?tab=monetize` → 제휴마케팅 설정 표시
- [ ] Phase 3: `/editor/[id]?from=review` → 2/3+1/3 레이아웃 + 검수 사이드패널
- [ ] Phase 4: `/settings?tab=ai-keys` → 4카테고리 + 9 provider + 발급 가이드
- [ ] Phase 5: API 키 등록 시 동의 패널 표시
- [ ] Phase 5: SNS 연결 시 플랫폼별 동의 모달 표시
- [ ] Phase 5: 제휴마케팅 자동삽입 시 동의 패널 표시
- [ ] Phase 5: `/settings?tab=consent` → 동의 현황 + 철회 기능
