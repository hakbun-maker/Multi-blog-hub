# Multi Blog Hub 코딩 컨벤션

> 버전: 1.0 | 날짜: 2026-03-04

---

## 1. 파일 구조

```
blog-hub/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # 인증 없는 페이지 그룹
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/            # 인증 필요 페이지 그룹
│   │   ├── layout.tsx          # 사이드바 포함 레이아웃
│   │   ├── dashboard/page.tsx
│   │   ├── blogs/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── editor/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── scheduler/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── ads/page.tsx
│   │   ├── keywords/page.tsx
│   │   └── settings/page.tsx
│   └── api/                    # API Route Handlers
│       ├── blogs/
│       ├── posts/
│       ├── ai/
│       │   └── generate/route.ts
│       ├── scheduler/
│       └── stats/
│
├── components/
│   ├── ui/                     # shadcn/ui 기본 컴포넌트
│   ├── layout/                 # 레이아웃 컴포넌트
│   │   ├── AppSidebar.tsx
│   │   └── AppHeader.tsx
│   ├── dashboard/              # 대시보드 컴포넌트
│   ├── blogs/                  # 블로그 관련 컴포넌트
│   ├── editor/                 # 에디터 컴포넌트
│   ├── scheduler/              # 스케줄러 컴포넌트
│   └── shared/                 # 공통 재사용 컴포넌트
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 클라이언트 사이드 Supabase
│   │   └── server.ts           # 서버 사이드 Supabase
│   ├── ai/
│   │   ├── adapter.ts          # AI 어댑터 인터페이스
│   │   ├── claude.ts
│   │   ├── openai.ts
│   │   └── gemini.ts
│   └── utils/
│       ├── date.ts
│       └── format.ts
│
├── hooks/                      # 커스텀 React Hooks
│   ├── useBlogs.ts
│   ├── usePosts.ts
│   └── useScheduler.ts
│
├── types/                      # TypeScript 타입 정의
│   ├── database.ts             # Supabase 자동 생성 타입
│   ├── blog.ts
│   ├── post.ts
│   └── ai.ts
│
└── store/                      # Zustand 스토어
    ├── editorStore.ts
    └── uiStore.ts
```

---

## 2. 네이밍 규칙

| 항목 | 규칙 | 예시 |
|------|------|------|
| 변수 | camelCase | `blogList`, `postCount` |
| 함수 | camelCase | `fetchBlogs()`, `createPost()` |
| 컴포넌트 | PascalCase | `BlogCard`, `PostEditor` |
| 상수 | UPPER_SNAKE_CASE | `MAX_BLOGS_PER_USER` |
| 타입/인터페이스 | PascalCase | `Blog`, `PostStatus` |
| CSS 클래스 | Tailwind 유틸리티 우선 |
| 파일 (컴포넌트) | PascalCase | `BlogCard.tsx` |
| 파일 (유틸/훅) | camelCase | `useBlogs.ts`, `formatDate.ts` |
| API 경로 | kebab-case | `/api/blogs`, `/api/ai/generate` |
| DB 컬럼 | snake_case | `user_id`, `created_at` |

---

## 3. TypeScript 규칙

```typescript
// ✅ 명시적 타입 선언
interface Blog {
  id: string
  name: string
  userId: string
  aiCharacterConfig: AICharacterConfig
  createdAt: Date
}

// ✅ Union 타입으로 상태 관리
type PostStatus = 'draft' | 'published' | 'scheduled'

// ✅ 제네릭 API 응답 타입
interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// ❌ any 사용 금지
const data: any = ...  // 금지

// ✅ unknown 사용 후 타입 가드
const data: unknown = ...
if (typeof data === 'string') { ... }
```

---

## 4. 컴포넌트 작성 규칙

```typescript
// ✅ Server Component 기본 (데이터 패칭)
// app/blogs/page.tsx
export default async function BlogsPage() {
  const blogs = await fetchBlogs()
  return <BlogList blogs={blogs} />
}

// ✅ Client Component (인터랙션 필요 시)
// components/blogs/BlogCard.tsx
'use client'

interface BlogCardProps {
  blog: Blog
  onEdit: (id: string) => void
}

export function BlogCard({ blog, onEdit }: BlogCardProps) {
  return (...)
}

// ❌ 불필요한 'use client' 남용 금지
```

---

## 5. API Route 규칙

```typescript
// app/api/blogs/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

---

## 6. AI 어댑터 규칙

```typescript
// lib/ai/adapter.ts
export interface AIAdapter {
  generatePost(params: GeneratePostParams): Promise<GeneratedPost>
}

export interface GeneratePostParams {
  keyword: string
  relatedKeywords: string[]
  characterConfig: AICharacterConfig
  imageCount: number
}

// 모든 AI 어댑터는 동일 인터페이스 구현
export class ClaudeAdapter implements AIAdapter { ... }
export class OpenAIAdapter implements AIAdapter { ... }
export class GeminiAdapter implements AIAdapter { ... }

// 팩토리 함수
export function createAIAdapter(provider: AIProvider, apiKey: string): AIAdapter {
  switch (provider) {
    case 'claude': return new ClaudeAdapter(apiKey)
    case 'openai': return new OpenAIAdapter(apiKey)
    case 'gemini': return new GeminiAdapter(apiKey)
  }
}
```

---

## 7. Lint / Formatter

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "error"
  }
}
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## 8. Git 커밋 메시지 (Conventional Commits)

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷 (로직 변경 없음)
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 등

예시:
feat: AI 멀티캐릭터 글 생성 기능 추가
fix: 스케줄러 중복 실행 버그 수정
feat(editor): 스니펫 원클릭 삽입 구현
```

---

## 9. 환경변수 네이밍

```
# Public (클라이언트 접근 가능)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=

# Private (서버 전용)
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
ENCRYPTION_KEY=      # API 키 암호화용
```
