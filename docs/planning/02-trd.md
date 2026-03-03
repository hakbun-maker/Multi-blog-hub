# Multi Blog Hub TRD (Technical Requirements Document)

> 버전: 1.0 | 날짜: 2026-03-04

---

## 1. 기술 스택

### 프론트엔드
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **에디터**: TipTap (리치 텍스트 + HTML 편집 지원)
- **상태 관리**: Zustand (경량 글로벌 상태)
- **데이터 패칭**: TanStack Query (서버 상태 캐싱)

### 백엔드
- **API**: Next.js API Routes (Route Handlers)
- **런타임**: Node.js 20+

### 데이터베이스 / 인프라
- **DB**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (이메일/소셜 로그인)
- **Storage**: Supabase Storage (이미지 파일 저장)
- **Real-time**: Supabase Realtime (자동화 실행 로그 실시간 업데이트)

### AI 통합
- **지원 AI**: Claude API (Anthropic) / OpenAI GPT-4o / Google Gemini
- **연결 방식**: 사용자가 본인 API 키 입력 → 암호화 저장 (Supabase Vault)
- **AI 선택**: 블로그별 또는 글 작성 시마다 선택 가능

### 외부 연동
- **SEO 키워드**: Google Trends API, DataForSEO API (또는 유사 서비스)
- **외부 블로그 (v2)**: WordPress REST API, 아임웹 API
- **광고**: Google AdSense API (수익 데이터 조회)
- **외부 소스 (선택)**: Notion API, Google Sheets API

### 배포
- **플랫폼**: Vercel
- **도메인**: 커스텀 도메인 연결 (각 블로그별)
- **환경**: Production / Preview / Development

---

## 2. 아키텍처

### 전체 구조 (Monolith → Modular)
```
Next.js App (Monolith)
├── /app               App Router 페이지
├── /api               API Route Handlers
│   ├── /blogs         블로그 CRUD
│   ├── /posts         글 CRUD + 발행
│   ├── /ai            AI 글 생성
│   ├── /scheduler     자동화 스케줄러
│   ├── /stats         통계
│   └── /integrations  외부 연동
├── /lib               공통 유틸리티
│   ├── /supabase      DB 클라이언트
│   ├── /ai            AI API 어댑터 (Claude/GPT/Gemini)
│   └── /scheduler     Cron 작업 관리
└── /components        UI 컴포넌트
```

### AI 어댑터 패턴
```
AIAdapter (인터페이스)
├── ClaudeAdapter
├── OpenAIAdapter
└── GeminiAdapter

→ 사용자가 선택한 AI에 따라 동일 인터페이스로 호출
→ API 키는 Supabase Vault에 암호화 저장
```

### 자동화 스케줄러 구조
```
SchedulerService
├── KeywordPool      (키워드 목록 관리)
├── JobQueue         (발행 예약 큐)
├── JobRunner        (Cron 기반 실행)
└── JobLogger        (실행 로그 + 알림)
```

---

## 3. 보안 요구사항

| 항목 | 방법 |
|------|------|
| 인증 | Supabase Auth (JWT 기반) |
| API 키 저장 | Supabase Vault (AES-256 암호화) |
| Row Level Security | Supabase RLS - 사용자별 데이터 격리 |
| API 접근 | Next.js Middleware로 인증 필터 |
| XSS 방지 | DOMPurify로 HTML 콘텐츠 sanitize |

---

## 4. 성능 요구사항

| 항목 | 목표 |
|------|------|
| 페이지 로드 (LCP) | 2.5초 이하 |
| API 응답 시간 | 200ms 이하 (AI 생성 제외) |
| AI 글 생성 | 10-30초 (AI API 응답 시간 의존) |
| 동시 스케줄러 작업 | 최대 10개 동시 실행 |

---

## 5. 개발 환경

```
Node.js: 20.x
Package Manager: pnpm
TypeScript: 5.x
Next.js: 14.x
Supabase CLI: latest

환경변수:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

---

## 6. 외부 블로그 발행 구조 (v2)

```
BlogPublisher (인터페이스)
├── InternalPublisher    (Hub 자체 블로그)
├── WordPressPublisher   (REST API)
└── ImwebPublisher       (아임웹 API)

→ 동일 인터페이스로 어느 플랫폼에도 발행 가능
→ MVP에서는 InternalPublisher만 구현
```
