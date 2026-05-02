# OAuth 동의 화면 — 앱 도메인 입력 자료

Google Cloud Console → 인증 플랫폼 → 브랜딩(또는 OAuth 동의 화면) → "앱 도메인" 섹션에 입력할 세 가지 URL.

## ✅ Google Cloud Console 입력값 (그대로 복사)

| 항목 | URL |
|---|---|
| **애플리케이션 홈페이지** | `https://multi-blog-hub.vercel.app/about` |
| **애플리케이션 개인정보처리방침 링크** | `https://multi-blog-hub.vercel.app/privacy` |
| **애플리케이션 서비스 약관 링크** | `https://multi-blog-hub.vercel.app/terms` |

> 위 세 페이지는 코드로 이미 추가됨 — Vercel 배포 후 즉시 접속 가능
> (운영자: 학분 / 연락처: leansha@gmail.com)

---

## 추가된 페이지 (코드)

- [`app/about/page.tsx`](../../app/about/page.tsx) — 애플리케이션 홈페이지 (서비스 소개)
- [`app/privacy/page.tsx`](../../app/privacy/page.tsx) — 개인정보처리방침 (12개 조항)
- [`app/terms/page.tsx`](../../app/terms/page.tsx) — 서비스 이용약관 (12개 조항)

세 페이지 모두 root layout만 적용되는 **공개 정적 페이지**(인증 불필요). Google이 검증 시 누구나 접근 가능.

---

## 페이지 본문 요약

### 1. /about — 애플리케이션 홈페이지
- 서비스 정의, 주요 기능 5개 (AI 글 작성 / GSC 자동 색인 / AdSense 통합 / 키워드 자동화 / 멀티 블로그 일괄 관리)
- 비공개 도구 명시 + 운영자·연락처 표기

### 2. /privacy — 개인정보처리방침
- 수집 항목: 회원 정보, Google OAuth 토큰, AI API 키, 발행 글 데이터
- 처리 목적: 색인 요청, AI 글 작성, AdSense 관리, 통계
- 제3자: Google, Anthropic, OpenAI, Google AI, Supabase, Vercel
- 보안: AES-256-GCM 암호화 + RLS + HTTPS
- 책임자: 학분 / leansha@gmail.com

### 3. /terms — 서비스 이용약관
- 가입·계약 성립·서비스 변경·이용 제한·해지 규정
- 콘텐츠 저작권은 이용자 본인 귀속
- AI 생성물 검수 책임은 이용자 / AdSense 수익 보장 없음 명시
- 준거법: 대한민국

---

## 다음 단계

1. **로컬 확인** — 각 URL이 정상 렌더되는지 확인:
   - `http://localhost:3000/about`
   - `http://localhost:3000/privacy`
   - `http://localhost:3000/terms`
2. **Vercel 배포** (`git push` 또는 "스커푸") 후 production URL이 응답하는지 확인:
   - `https://multi-blog-hub.vercel.app/about`
   - `https://multi-blog-hub.vercel.app/privacy`
   - `https://multi-blog-hub.vercel.app/terms`
3. **Google Cloud Console 입력** — 위 표의 세 URL을 "앱 도메인" 섹션 각 입력란에 붙여넣기 후 저장
