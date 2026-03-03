# 학습 기록

> 개발 중 발견된 패턴, 해결책, 주의사항을 기록합니다.

## 보안
- ai_api_keys.encrypted_key는 API 응답에서 절대 제외 (SELECT 시 제거)
- 모든 Route Handler에서 `supabase.auth.getUser()` 인증 체크 필수
- HTML 에디터 콘텐츠는 DOMPurify로 sanitize 후 렌더링

## Supabase
- SSR 환경에서는 `lib/supabase/server.ts` (쿠키 기반) 사용
- 클라이언트 컴포넌트에서는 `lib/supabase/client.ts` 사용
- RLS: `auth.uid() = user_id` 패턴으로 사용자 격리

## Next.js 14
- 기본은 Server Component, 인터랙션 필요 시만 `use client`
- API Routes: `app/api/[resource]/route.ts` 형식
- 동적 경로: `app/(dashboard)/blogs/[id]/page.tsx`

## TipTap
- HTML 모드 전환: `@tiptap/extension-code-block` 또는 raw HTML 확장
- 자동 저장: debounce 3초 후 draft 저장

## AI 어댑터
- `lib/ai/adapter.ts`에 `AIAdapter` 인터페이스 정의
- 팩토리 함수 `createAIAdapter(provider, apiKey)` 사용
- API 키는 사용 시점에 복호화 (`lib/utils/encryption.ts`)
