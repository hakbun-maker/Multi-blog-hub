# 수익화 로켓 코딩 컨벤션

> 작성일: 2026-03-15 | 버전: 1.0.0

---

## 1. 파일 구조

```
app/(dashboard)/monetize/
├── page.tsx                      ← 탭 라우팅 메인
├── layout.tsx                    ← MonetizeTabNav 레이아웃
└── components/
    ├── dashboard/
    │   ├── RocketStatusCard.tsx
    │   ├── RevenueSummaryCard.tsx
    │   ├── RevenueLineChart.tsx
    │   ├── BlogGradeTable.tsx
    │   └── MultiDimensionChart.tsx
    ├── keywords/
    │   ├── KeywordTypeSelector.tsx
    │   ├── GoldKeywordPanel.tsx
    │   ├── EventKeywordPanel.tsx
    │   ├── SeasonKeywordPanel.tsx
    │   ├── KeywordResultCard.tsx
    │   ├── RevenueScoreBar.tsx
    │   └── KeywordDetailModal.tsx
    ├── scheduler/
    │   ├── SchedulerCalendar.tsx
    │   ├── DistributionEnginePanel.tsx
    │   ├── KeywordScheduleCard.tsx
    │   ├── BlogDistributionPreview.tsx
    │   └── ScheduleConfirmModal.tsx
    └── writing/
        ├── PipelineStatusBoard.tsx
        ├── ReviewQueueList.tsx
        ├── QualityScoreReport.tsx
        ├── PostActionButtons.tsx
        └── WritingProgressCard.tsx

app/api/monetize/
├── dashboard/route.ts
├── analytics/route.ts
├── revenue-guide/route.ts        ← 기능 5: 수익화 가이드 역산
├── keywords/
│   ├── gold/route.ts
│   ├── events/route.ts
│   ├── seasonal/route.ts
│   └── register/route.ts
├── scheduler/
│   ├── calendar/route.ts
│   ├── reassign/route.ts
│   ├── distribute/route.ts
│   └── confirm/route.ts
└── writing/
    ├── pipeline/route.ts
    ├── review-queue/route.ts
    ├── report/[postId]/route.ts
    ├── approve/[postId]/route.ts
    └── reject/[postId]/route.ts

app/api/blogs/[id]/settings/
├── language/route.ts             ← 기능 4: 언어 설정
├── sns/route.ts                  ← 기능 6: SNS 설정
├── sns/test/[platform]/route.ts  ← 기능 6: 연결 테스트
└── monetize/route.ts             ← 기능 7: 쿠팡 설정

app/api/sns/
└── distribute/route.ts           ← 기능 6: SNS 배포 실행

app/api/affiliate/
└── [blogId]/stats/route.ts       ← 기능 7: 제휴 통계

lib/monetize/
├── engines/
│   ├── distribution-engine.ts    ← 배분 엔진
│   ├── keyword-scorer.ts         ← Revenue Score 계산
│   ├── quality-checker.ts        ← 3단계 검수
│   ├── ai-writer.ts              ← Claude API 글쓰기
│   └── language-writer.ts        ← 다국어 글쓰기 (기능 4)
├── apis/
│   ├── naver-ad-api.ts           ← 네이버 광고 API (ko 1순위)
│   ├── datalab-api.ts            ← DataLab API (ko 3순위)
│   ├── google-kwp-api.ts         ← Google KWP (en/ja 1순위, ko 2순위)
│   ├── event-api.ts              ← 이벤트 API
│   ├── claude-api.ts             ← Claude API
│   ├── sns/
│   │   ├── instagram-api.ts      ← Instagram Graph API (기능 6)
│   │   ├── twitter-api.ts        ← Twitter API v2 (기능 6)
│   │   └── threads-api.ts        ← Threads API (기능 6)
│   ├── image-gen/
│   │   ├── dalle3-api.ts         ← DALL-E 3 (기능 6)
│   │   └── ideogram-api.ts       ← Ideogram (기능 6)
│   └── coupang-api.ts            ← 쿠팡파트너스 API (기능 7)
├── store/
│   └── monetize-store.ts         ← Zustand 스토어
└── types/
    └── monetize.types.ts         ← TypeScript 타입 정의
```

---

## 2. 네이밍 규칙 (기존 프로젝트 상속)

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | PascalCase | `RocketStatusCard.tsx` |
| 컴포넌트 함수 | PascalCase | `function RocketStatusCard()` |
| 훅 | camelCase + use prefix | `useRevenueData()` |
| API Route 핸들러 | GET/POST/PUT/DELETE | `export async function GET()` |
| 유틸리티 함수 | camelCase | `calculateRevenueScore()` |
| 상수 | UPPER_SNAKE_CASE | `AUTO_PUBLISH_THRESHOLD = 45` |
| 타입/인터페이스 | PascalCase | `interface KeywordWithScore` |
| Zustand 스토어 | camelCase + Store suffix | `useMonetizeStore` |
| DB 테이블 | snake_case | `scheduled_posts` |
| DB 컬럼 | snake_case | `revenue_score` |
| API 경로 | kebab-case | `/api/monetize/review-queue` |

---

## 3. 컴포넌트 작성 패턴

### Server Component (기본)
```typescript
// app/(dashboard)/monetize/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function MonetizePage({
  searchParams
}: {
  searchParams: { tab?: string }
}) {
  const supabase = createClient()
  // 서버에서 초기 데이터 페치
  const { data } = await supabase
    .from('revenue_analytics')
    .select('*')
    .limit(10)

  return <MonetizeDashboard initialData={data} />
}
```

### Client Component (인터랙션 필요 시)
```typescript
'use client'

import { useMonetizeStore } from '@/lib/monetize/store/monetize-store'

interface RocketStatusCardProps {
  initialData?: PipelineStatus
}

export function RocketStatusCard({ initialData }: RocketStatusCardProps) {
  const { pipelineStatus, fetchPipelineStatus } = useMonetizeStore()
  // ...
}
```

---

## 4. API Route 패턴

```typescript
// app/api/monetize/dashboard/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await fetchDashboardData(supabase, user.id)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 5. Zustand 스토어 패턴

```typescript
// lib/monetize/store/monetize-store.ts
import { create } from 'zustand'

interface MonetizeStore {
  // 상태
  activeTab: 'dashboard' | 'keywords' | 'scheduler' | 'writing'
  pipelineStatus: PipelineStatus | null
  keywords: KeywordWithScore[]

  // 액션
  setActiveTab: (tab: MonetizeStore['activeTab']) => void
  fetchPipelineStatus: () => Promise<void>
  searchKeywords: (query: string, type: KeywordType) => Promise<void>
}

export const useMonetizeStore = create<MonetizeStore>((set, get) => ({
  activeTab: 'dashboard',
  pipelineStatus: null,
  keywords: [],

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchPipelineStatus: async () => {
    const res = await fetch('/api/monetize/dashboard')
    const data = await res.json()
    set({ pipelineStatus: data.pipelineStatus })
  },

  searchKeywords: async (query, type) => {
    const res = await fetch(`/api/monetize/keywords/${type}?q=${query}`)
    const data = await res.json()
    set({ keywords: data.keywords })
  }
}))
```

---

## 6. 타입 정의 패턴

```typescript
// lib/monetize/types/monetize.types.ts

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'
export type KeywordType = 'gold' | 'event' | 'seasonal'
export type IntentType = 'AD' | 'REVIEW' | 'INFO' | 'CRITIC' | 'COMPARE' | 'TREND'
export type PostStatus =
  | 'pending'
  | 'writing'
  | 'reviewing'
  | 'auto_published'
  | 'review_queue'
  | 'published'
  | 'failed'

// 기능 4: 다국어
export type BlogLanguage = 'ko' | 'en' | 'ja'

// 기능 6: SNS
export type SNSPlatform = 'instagram' | 'twitter' | 'threads'
export type ImageGenProvider = 'dalle3' | 'ideogram' | 'flux'
export type SNSPostStatus = 'pending' | 'published' | 'failed'

export interface KeywordWithScore {
  id: string
  keyword: string
  keywordType: KeywordType
  intentType: IntentType
  revenueScore: number
  keywordGrade: Grade
  monthlySearchVolume: number
  cpcEstimate: number
  competitionScore: number
  trendIndex: number
}

export const AUTO_PUBLISH_THRESHOLD = 45
```

---

## 7. Recharts 사용 패턴

```typescript
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export function RevenueLineChart({ data }: { data: RevenueDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(v) => `${v.toLocaleString()}원`} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString()}원`]} />
        <Line
          type="monotone"
          dataKey="actualRevenue"
          stroke="#F59E0B"
          strokeWidth={2}
          name="실제 수익"
        />
        <Line
          type="monotone"
          dataKey="estimatedRevenue"
          stroke="#F59E0B"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="예상 수익"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## 8. 에러 처리 패턴

```typescript
// lib/monetize/apis/naver-ad-api.ts

export async function fetchNaverKeywords(query: string): Promise<KeywordData[]> {
  try {
    const res = await fetch(`https://api.naver.com/keywordstool?q=${query}`, {
      headers: { 'X-API-KEY': process.env.NAVER_AD_API_KEY! },
      next: { revalidate: 86400 }  // 24시간 캐싱
    })

    if (!res.ok) {
      // 캐시 폴백 시도
      const cached = await getCachedKeywords(query)
      if (cached) return cached
      throw new Error(`Naver API error: ${res.status}`)
    }

    return res.json()
  } catch (error) {
    console.error('[NaverAPI] fetch failed:', error)
    throw error
  }
}
```

---

## 9. Git 커밋 메시지 (기존 프로젝트 상속)

```
feat: 수익화 로켓 키워드탐색기 골드 키워드 검색 구현
fix: 배분 엔진 쿼터 초과 시 날짜 밀기 로직 수정
refactor: Revenue Score 계산 함수 분리
docs: 수익화 로켓 기획 문서 추가
chore: pg_cron 자동 발행 스케줄 설정
```

---

## 10. 환경 변수

```env
# .env.local (추가 필요)

# 키워드 탐색 (코어)
NAVER_AD_API_KEY=
NAVER_AD_API_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GOOGLE_KWP_API_KEY=
TICKETLINK_API_KEY=
ANTHROPIC_API_KEY=  ← AI 글쓰기용 (기존 있을 경우 활용)

# 기능 4 — 다국어 (추가 API 없음, 기존 Google KWP 활용)

# 기능 6 — SNS 자동배포
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
TWITTER_API_KEY=
TWITTER_API_SECRET=
OPENAI_API_KEY=       ← DALL-E 3 이미지 생성 (선택)
IDEOGRAM_API_KEY=     ← Ideogram 이미지 생성 (선택)

# 기능 7 — 쿠팡파트너스
# 파트너 ID는 blog_settings 테이블에 사용자별 저장 (환경변수 아님)
# API 엔드포인트는 쿠팡파트너스 공개 URL 사용
```
