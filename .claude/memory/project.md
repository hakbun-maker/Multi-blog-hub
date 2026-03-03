# Multi Blog Hub - 프로젝트 지식

## 프로젝트 개요
- **이름**: Multi Blog Hub
- **목적**: 복수의 독립 블로그를 중앙에서 관리 + AI 자동 글 생성 + AdSense 최적화
- **생성일**: 2026-03-04

## 기술 스택
- **프레임워크**: Next.js 14 App Router + TypeScript
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **에디터**: TipTap
- **상태관리**: Zustand + TanStack Query
- **DB/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Claude API + OpenAI API + Gemini API (AI Adapter 패턴)
- **배포**: Vercel (Cron 포함)

## 핵심 아키텍처
- **AI Adapter 패턴**: `AIAdapter` 인터페이스 → `ClaudeAdapter`, `OpenAIAdapter`, `GeminiAdapter`
- **보안**: AI API 키 AES-256 암호화 (`lib/utils/encryption.ts`, `ENCRYPTION_KEY` 환경변수)
- **RLS**: 모든 Supabase 테이블에 Row Level Security 적용
- **ai_api_keys.encrypted_key**: 절대 클라이언트에 노출 금지

## 디렉토리 구조
- `app/(auth)/`: 로그인, 회원가입 (auth 불필요)
- `app/(dashboard)/`: 대시보드, 블로그, 에디터, 스케줄러 등 (인증 필요)
- `app/api/`: Next.js Route Handlers
- `components/`: layout, dashboard, blogs, editor, scheduler, shared, ui
- `lib/supabase/`: client.ts (클라이언트), server.ts (SSR)
- `lib/ai/`: adapter.ts, claude.ts, openai.ts, gemini.ts
- `supabase/migrations/`: SQL 마이그레이션 (001_ 순서)
- `specs/`: 도메인 리소스 + 화면 명세 YAML
- `docs/planning/`: 기획 문서 (01~06)

## 도메인 리소스 (10개)
users, blogs, posts, snippets, ai_api_keys, scheduler_jobs, scheduler_logs, ad_units, keyword_searches, stats_summary

## 화면 목록 (14개)
screen-01: /login, screen-02: /signup, screen-03: /dashboard
screen-04: /blogs, screen-05: /blogs/:id, screen-06: /blogs/new
screen-07: /blogs/:id/settings, screen-08: /editor/new, screen-09: /editor/:id
screen-10: /scheduler, screen-11: /stats, screen-12: /ads
screen-13: /keywords, screen-14: /settings

## 개발 규칙
- TypeScript strict: `any` 사용 금지
- Prettier: semi:false, singleQuote:true, tabWidth:2
- 컴포넌트: PascalCase, 유틸/훅: camelCase
- API 경로: kebab-case
- Git: Conventional Commits 사용
