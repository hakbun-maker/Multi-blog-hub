# 11. 외부 API 및 서비스 준비 가이드

> 개발 착수 전 개발자가 준비해야 할 API 키와, 블로거(사용자)가 직접 입력해야 할 설정을 구분하여 정리합니다.

---

## Part A. 개발자(플랫폼 관리자)가 준비할 환경변수

> 아래 항목은 `.env.local`에 설정하며, 모든 사용자가 공유하는 **플랫폼 레벨** 키입니다.
> **플랫폼 비용 = 0원** (전부 무료 플랜 또는 자체 생성).
> 유료 API(AI, 키워드, 이미지 생성)는 전부 블로거가 발급 → Part B 참조.

### 1. Supabase (기존 — 이미 설정됨)

| 키 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트용 익명 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 서비스 롤 키 |

- **발급처**: [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 → Settings → API
- **비용**: Free 플랜 (500MB DB, 1GB Storage, 50K MAU)
- **비고**: 이미 설정 완료

---

### 2. Meta Developer App (Instagram + Threads)

| 키 | 설명 |
|---|---|
| `INSTAGRAM_APP_ID` | Meta 앱 ID (Instagram + Threads 공용) |
| `INSTAGRAM_APP_SECRET` | Meta 앱 시크릿 |

- **발급처**: [Meta for Developers](https://developers.facebook.com/) → My Apps → Create App
- **발급 절차**:
  1. Meta 개발자 계정 생성 + 비즈니스 인증
  2. My Apps → Create App → "Business" 유형 선택
  3. Instagram Graph API + Threads API 제품 추가
  4. Settings → Basic 에서 App ID + App Secret 확인
  5. **OAuth 리다이렉트 URI** 등록: `https://your-domain.com/api/auth/callback/instagram`
  6. 앱 심사(App Review) 제출 → 승인 대기
- **비용**: 무료
- **주의**:
  - Instagram Graph API는 **비즈니스/크리에이터 계정만** 지원 (개인 계정 불가)
  - 앱 심사에 **2-4주** 소요 — 개발 초기부터 신청 권장
  - Threads API는 2024년부터 공개, 동일 Meta 앱에서 관리
  - 개발 모드에서는 자기 계정으로 테스트 가능 (심사 전)
- **왜 플랫폼 레벨?**: OAuth App 단위 키. 하나의 앱을 만들어 모든 사용자가 OAuth로 자기 계정 연결.

---

### 3. X (Twitter) API

| 키 | 설명 |
|---|---|
| `TWITTER_API_KEY` | X API Key (Consumer Key) |
| `TWITTER_API_SECRET` | X API Secret (Consumer Secret) |

- **발급처**: [X Developer Portal](https://developer.x.com/en/portal/dashboard) → Projects & Apps
- **발급 절차**:
  1. X Developer 계정 신청 (사용 목적 작성 필요)
  2. Project 생성 → App 생성
  3. Keys and Tokens 탭에서 API Key + Secret 확인
  4. OAuth 2.0 설정 → Callback URL 등록: `https://your-domain.com/api/auth/callback/twitter`
  5. User Authentication Settings → Read and Write 권한 설정
- **비용**: **Free 플랜 사용** (월 1,500 트윗 작성, 읽기 제한적)
- **주의**:
  - Free 플랜으로 시작 가능하나 기능 제한 있음
  - 계정 심사에 **1-2주** 소요
  - v2 API 사용 (스레드 발행 = 연속 트윗)
- **왜 플랫폼 레벨?**: OAuth App 단위 키. 사용자는 OAuth로 자기 X 계정 연결.

---

### 4. 기타 인프라

| 키 | 설명 |
|---|---|
| `CRON_SECRET` | Vercel Cron Job 인증 시크릿 (임의 문자열) |
| `ENCRYPTION_KEY` | 민감 데이터 암호화 키 (32자 이상 임의 문자열) |

- **생성 방법**: `openssl rand -hex 16` 또는 임의의 32자 이상 문자열
- **비고**: 이미 설정 완료

---

## Part B. 블로거(사용자)가 직접 입력하는 설정

> 아래 항목은 앱 `/settings?tab=api-keys` (screen-09) 에서 **사용자 단위로** 한 곳에서 입력합니다.
> `ai_api_keys` 테이블에 user 레벨로 암호화 저장됩니다 (blog_settings가 아님).
>
> **앱 내 접히는 가이드**: 아래 발급 절차는 screen-09의 `ApiGuideAccordion` 컴포넌트에
> 접히는 형태로 제공됩니다. 각 카테고리 섹션 하단에서 "발급 가이드" 클릭 시 펼쳐집니다.
> 가이드 데이터는 `lib/constants/api-guide-contents.ts` 상수에서 관리합니다.

### 1. AI 글쓰기 API 키 (Claude / GPT / Gemini 중 선택)

> 사용자가 설정 화면에서 AI 공급자를 선택하고 본인의 API 키를 입력합니다.
> LLM 비용은 **사용자 부담** (플랫폼 미포함).
> 입력된 키는 `blog_settings.ai_settings` JSONB에 **암호화 저장**됩니다.

| AI 공급자 | 모델 | 발급처 | 비용 (1M tokens 기준) |
|----------|------|--------|---------------------|
| **Claude** (Anthropic) | claude-sonnet-4-6 (기본) / claude-opus-4-6 (S등급) | [Anthropic Console](https://console.anthropic.com/) → API Keys | Input $3 / Output $15 (Sonnet) |
| **GPT** (OpenAI) | gpt-4o / gpt-4o-mini | [OpenAI Platform](https://platform.openai.com/api-keys) → API Keys | Input $2.50 / Output $10 (4o) |
| **Gemini** (Google) | gemini-2.0-flash / gemini-2.0-pro | [Google AI Studio](https://aistudio.google.com/apikey) → API Keys | Input $0.10 / Output $0.40 (Flash) |

**공통 발급 절차**:
1. 각 서비스 사이트에서 계정 생성
2. API Keys 메뉴에서 키 생성
3. 결제 수단 등록 (사용량 기반 과금)
4. 앱 설정 → AI API 탭에서 공급자 선택 + 키 붙여넣기

**참고 비용** (블로그 1편 생성 기준):
- Claude Sonnet: 약 $0.03–0.05
- GPT-4o: 약 $0.02–0.04
- Gemini Flash: 약 $0.005–0.01

---

### 2. Google Imagen 3 API 키 (SNS 이미지 생성)

> 이미지 생성 비용은 **사용자 부담**.
> 입력된 키는 `blog_settings.sns_settings.imageGen.apiKey` JSONB에 **암호화 저장**됩니다.

| 항목 | 설명 |
|------|------|
| Google Cloud API Key | Google Imagen 3 이미지 생성용 |

- **발급처**: [Google Cloud Console](https://console.cloud.google.com/) → Vertex AI → Imagen
- **발급 절차**:
  1. Google Cloud 프로젝트 생성
  2. 결제 계정 연결
  3. Vertex AI API 활성화
  4. API & Services → Credentials → API Key 생성
  5. Imagen 3 모델 액세스 요청 (일부 리전에서 자동 승인)
  6. 앱 설정 → SNS 탭 → 이미지 생성 API Key 붙여넣기
- **비용**: 약 $0.04/장 (1024×1024). 월 100장 ≈ $4
- **주의**: Google Cloud 무료 크레딧 ($300, 90일) 활용 가능

---

### 3. 키워드 탐색 API 키 (UI에서 입력 → 암호화 저장)

> 키당 일일 호출 제한이 있으므로 **블로거 각자가 발급**받아야 합니다.
> 입력된 키는 `blog_settings.keyword_api_keys` JSONB에 **암호화 저장**됩니다.

#### (a) 네이버 광고 API — 키워드 검색량 조회

| 항목 | 설명 |
|------|------|
| 네이버 광고 API Key | 네이버 검색광고 API 라이선스 키 |
| 네이버 광고 API Secret | 네이버 검색광고 API 시크릿 |

- **발급처**: [네이버 검색광고 시스템](https://searchad.naver.com/) → 로그인 → 도구 → API 사용 관리
- **발급 절차**:
  1. 네이버 검색광고 계정 생성 (사업자 등록 불필요, 네이버 아이디로 가입)
  2. 도구 → API 사용 관리 → API 라이선스 발급 요청
  3. 승인 후 API Key + Secret 확인 → 앱 설정에 붙여넣기
- **비용**: 무료 (API 호출 자체는 과금 없음)
- **호출 제한**: 약 100,000회/일 (1인 사용 시 충분)

#### (b) 네이버 검색 API — 자동완성/연관 키워드

| 항목 | 설명 |
|------|------|
| 네이버 Client ID | 네이버 개발자 앱 Client ID |
| 네이버 Client Secret | 네이버 개발자 앱 Client Secret |

- **발급처**: [네이버 개발자 센터](https://developers.naver.com/apps/) → 애플리케이션 등록
- **발급 절차**:
  1. 네이버 개발자 센터 로그인 (네이버 아이디)
  2. Application → 애플리케이션 등록
  3. 사용 API: "검색" 선택
  4. 서비스 URL: `https://multi-blog-hub.vercel.app` 입력
  5. Client ID + Secret 확인 → 앱 설정에 붙여넣기
- **비용**: 무료
- **호출 제한**: 25,000회/일 (1인 사용 시 충분)

#### (c) Google Keyword Planner API — 글로벌 키워드 CPC

| 항목 | 설명 |
|------|------|
| Google Ads Developer Token | Google Ads API 개발자 토큰 |

- **발급처**: [Google Ads](https://ads.google.com/) → API 센터
- **발급 절차**:
  1. Google Ads 계정 생성 (광고 집행 불필요)
  2. 도구 및 설정 → 설정 → API 센터
  3. 개발자 토큰 신청
  4. 기본 액세스 승인 후 토큰 확인 → 앱 설정에 붙여넣기
- **비용**: 무료 (API 호출 자체 과금 없음)
- **주의**:
  - 프로덕션 액세스 승인까지 **2-4주** 소요 가능 → 일찍 신청 권장
  - 다국어 키워드(JA/DE/PT_BR/ES) 조회에도 동일 토큰 사용

### 4. SNS 계정 연동 (OAuth 플로우)

| 항목 | 입력 방법 | 설명 |
|------|----------|------|
| Instagram 비즈니스 계정 | OAuth 로그인 버튼 클릭 | Meta 계정으로 인증 → access_token 자동 저장 |
| X (Twitter) 계정 | OAuth 로그인 버튼 클릭 | X 계정으로 인증 → access_token 자동 저장 |
| Threads 계정 | Instagram 연동 시 자동 | Instagram과 동일 Meta 앱 사용 |

- **사용자 조건**:
  - Instagram: **비즈니스 계정** 또는 **크리에이터 계정** 필수 (개인 계정 불가)
  - X: 일반 계정 사용 가능
  - Threads: Instagram 연동 계정 필요

### 5. SNS 발행 설정 (UI에서 입력)

| 항목 | 기본값 | 설명 |
|------|--------|------|
| 플랫폼별 PASONA 프롬프트 | 기본 PASONA 템플릿 | 기본/직접편집 토글 |
| 이미지 생성 ON/OFF | OFF | Google Imagen 3 (고정) |
| 추가 스타일 힌트 | (빈 값) | iPhone 16 Warm Real Photo에 추가할 스타일 |
| 발행 스케줄 | 즉시 발행 | 예약 시간 설정 가능 |

### 6. 쿠팡파트너스 설정 (UI에서 입력)

| 항목 | 입력 방법 | 설명 |
|------|----------|------|
| 쿠팡파트너스 ID | 텍스트 입력 | 쿠팡파트너스 가입 후 발급받은 파트너 ID |
| Sub ID (선택) | 텍스트 입력 | 추적용 서브 ID |

- **발급처**: [쿠팡파트너스](https://partners.coupang.com/) → 가입 → 파트너 ID 확인
- **주의**: 수익 정산을 위해 사업자 또는 개인 통장 등록 필요

### 6-1. Amazon Associates 설정 (UI에서 입력)

> 영어/일본어 블로그 수익화에 사용. 블로그 언어가 en/ja인 경우 Amazon이 기본 제휴 플랫폼.

| 항목 | 입력 방법 | 설명 |
|------|----------|------|
| Amazon Associates Tag | 텍스트 입력 | Amazon Associates 가입 후 발급받은 Tracking ID (예: myblog-20) |

- **발급처**: [Amazon Associates](https://affiliate-program.amazon.com/) (US) / 각국 Amazon 제휴 프로그램
  - US: affiliate-program.amazon.com
  - JP: affiliate.amazon.co.jp
  - UK: affiliate-program.amazon.co.uk
- **발급 절차**:
  1. Amazon Associates 사이트 가입 (Amazon 계정 필요)
  2. 계정 정보 입력 + 웹사이트/블로그 URL 등록
  3. Associates Tag (Tracking ID) 자동 생성 (예: myblog-20)
  4. **180일 내 3건 이상 적격 판매 달성 → 정식 승인**
  5. 앱 설정 → API 키 관리 → 수익화 연동 → Associates Tag 붙여넣기
- **수익**: 카테고리별 1~10% 수수료 (전자제품 ~4%, 패션 ~10%, 서적 ~4.5%)
- **주의**:
  - 180일 내 3건 미달성 시 계정 비활성화 (재가입 가능)
  - **국가별 별도 가입** 필요 (US에서 가입해도 JP 상품은 JP Associates 필요)
  - 제휴 링크에 반드시 "Paid link" 또는 "Affiliate link" 공개 문구 필요 (FTC 규정)
  - 수익 정산: 직접입금/수표/Amazon 기프트카드 선택

### 7. 다국어 블로그 설정 (UI에서 입력)

| 항목 | 입력 방법 | 설명 |
|------|----------|------|
| 블로그 언어 | 드롭다운 선택 | KO / EN / JA / DE / PT_BR / ES |
| 타겟 지역 | 자동 매핑 | 언어 선택 시 자동 설정 |

---

## Part C. API 발급 우선순위 & 타임라인

> 심사/승인이 필요한 서비스는 개발 시작 전에 미리 신청해야 합니다.

### 개발자(플랫폼) — 개발 착수 전 발급

| 우선순위 | 서비스 | 예상 소요 | 필요 Phase |
|---------|--------|----------|-----------|
| 🔴 1순위 | Meta Developer App (Instagram+Threads) | 개발모드 즉시 / 심사 2-4주 | Phase 4 |
| 🟡 2순위 | X Developer 계정 (Free 플랜) | 1-2주 | Phase 4 |

### 블로거(사용자) — 서비스 이용 시 본인 발급

| 우선순위 | 서비스 | 예상 소요 | 필요 Phase |
|---------|--------|----------|-----------|
| 🔴 1순위 | AI API (Claude/GPT/Gemini 중 택1) | 즉시 | Phase 1 |
| 🔴 1순위 | Google Ads API (KWP) | 테스트 즉시 / 프로덕션 2-4주 | Phase 1 |
| 🟢 2순위 | 네이버 광고 API | 즉시 | Phase 1 |
| 🟢 2순위 | 네이버 개발자 센터 | 즉시 | Phase 1 |
| 🟡 3순위 | Google Imagen 3 API | 즉시 (Cloud 계정 필요) | Phase 4 |
| 🟡 3순위 | Amazon Associates | 즉시 가입 / 180일 내 3건 판매 필요 | Phase 4 |

**권장**: 블로거 온보딩 시 API 발급 가이드를 앱 내에서 안내 (스텝 바이 스텝 위자드)

---

## Part D. `.env.local` 전체 템플릿

> 유료 API는 전부 블로거가 UI에서 입력하므로 환경변수에 포함하지 않음.
> **플랫폼 환경변수 비용 = 0원**.

```env
# ============================================
# Multi Blog Hub — 환경변수 (플랫폼 레벨, 전부 무료)
# ============================================
# 유료 API는 전부 블로거가 UI에서 직접 입력 → DB 암호화 저장:
#   - AI API (Claude/GPT/Gemini)   → blog_settings.ai_settings
#   - 키워드 탐색 API (네이버/구글) → blog_settings.keyword_api_keys
#   - Google Imagen 3 API          → blog_settings.sns_settings.imageGen

# ─── Supabase (무료 플랜) ───
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── 인프라 (자체 생성) ───
CRON_SECRET=
ENCRYPTION_KEY=

# ─── SNS 자동배포 — OAuth App (무료) ───
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
TWITTER_API_KEY=
TWITTER_API_SECRET=
```

---

## Part E. ai_api_keys 테이블 — 사용자 API 키 통합 저장 구조

> 모든 사용자 API 키는 `ai_api_keys` 테이블에 **user 레벨로 암호화 저장**.
> blog_settings에는 API 키를 저장하지 않음 — 설정(ON/OFF, 스타일 등)만 저장.
> 서버 사이드에서만 복호화하여 사용.

```sql
-- ai_api_keys 테이블 (확장)
CREATE TABLE ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN (
    'claude', 'openai', 'gemini',              -- AI 글쓰기
    'imagen',                                   -- 이미지 생성
    'naver_ad', 'naver_search', 'google_kwp',   -- 키워드 탐색
    'coupang', 'amazon'                         -- 수익화
  )),
  encrypted_key TEXT NOT NULL,           -- AES-256-GCM 암호화
  encrypted_secret TEXT,                 -- Key+Secret 쌍 (네이버 API용)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);
```

| provider | 카테고리 | encrypted_key | encrypted_secret |
|----------|---------|---------------|------------------|
| claude / openai / gemini | AI 글쓰기 | API Key | — |
| imagen | 이미지 생성 | API Key | — |
| naver_ad | 키워드 탐색 | API Key | API Secret |
| naver_search | 키워드 탐색 | Client ID | Client Secret |
| google_kwp | 키워드 탐색 | Developer Token | — |
| coupang | 수익화 | Partner ID | — |
| amazon | 수익화 | Associates Tag (Tracking ID) | — |

**보안 원칙**:
- 입력 시 ENCRYPTION_KEY로 AES-256-GCM 암호화 후 저장
- 서버 사이드 API Route에서만 복호화
- 클라이언트에는 마스킹된 키 (앞4자 + ... + 뒤4자) 또는 "등록됨/미등록" 상태만 노출
- RLS: `user_id = auth.uid()` (기존 정책 유지)
- blog_settings에서 API 키 참조 시 → 서버에서 ai_api_keys 테이블 JOIN
