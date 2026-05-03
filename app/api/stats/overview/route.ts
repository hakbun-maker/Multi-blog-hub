/**
 * GET /api/stats/overview
 *
 * 통계 페이지 TOP 브리핑 데이터.
 *
 * 응답:
 *   {
 *     delta: { revenue, views, ctr } — 최근 30일 vs 이전 30일 변화율(%)
 *     totals: { revenue, views, impressions, clicks, ctr } — 최근 30일 합계
 *     alerts: { hiddenGems, decaying } — 카운트
 *     recommendedActions: [{ id, type, title, description, payload }] — 휴리스틱 3개
 *     errors: [{ source, message }] — 부분 실패 사유
 *   }
 *
 * 캐시: 1시간 TTL, ?refresh=1로 무효화
 *
 * 휴리스틱 룰 (recommendedActions):
 *   - hiddenGems ≥ 1 → 'change_title' 추천 (제목 재제안)
 *   - decaying ≥ 1 → 'add_to_rewrite_queue' 추천 (리라이팅 큐)
 *   - AdSense CTR < 0.5% 도메인 있음 → 'toggle_slot' 추천 (슬롯 점검)
 */

import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getOrCompute, invalidate } from '@/lib/stats/cache'
import { fetchAllSources } from '@/lib/stats/sources'
import { findHiddenGems, findDecayingPages, type GscRow } from '@/lib/google/gsc-search-analytics'
import { pickRevenueForBlog } from '@/lib/google/adsense'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'overview'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1h

const HIDDEN_GEM_MIN_IMPR = 1000
const HIDDEN_GEM_MAX_CTR = 0.02
const DECAYING_DROP_RATIO = 0.5
const LOW_ADSENSE_CTR = 0.005 // 0.5% 미만 → 슬롯 점검 후보

interface OverviewPayload {
  delta: { revenue: number; views: number; ctr: number }
  totals: {
    revenue: number
    views: number
    impressions: number
    clicks: number
    ctr: number
  }
  alerts: { hiddenGems: number; decaying: number }
  recommendedActions: RecommendedAction[]
  errors: { source: string; message: string }[]
}

interface RecommendedAction {
  id: string
  type: 'change_title' | 'add_to_rewrite_queue' | 'toggle_slot' | 'apply_slot_position'
  title: string
  description: string
  payload?: Record<string, unknown>
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('refresh') === '1'

  // 쿠키 인증 클라이언트 사용 (service role 불필요 — 모든 테이블 RLS가 user_id 기반)
  const client = supabase as unknown as SupabaseClient

  if (forceRefresh) {
    await invalidate(client, user.id, CACHE_KEY)
  }

  const result = await getOrCompute<OverviewPayload>(
    client,
    user.id,
    CACHE_KEY,
    CACHE_TTL_MS,
    async () => computeOverview(client, user.id),
  )

  return NextResponse.json(result)
}

// ─── 내부 ──────────────────────────────────────────

async function computeOverview(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<OverviewPayload> {
  // 현재 30일 + 이전 30일 두 구간 병렬 fetch
  const today = new Date()
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const currentEnd = fmt(today)
  const currentStart = fmt(addDays(today, -30))
  const previousEnd = fmt(addDays(today, -31))
  const previousStart = fmt(addDays(today, -60))

  const [current, previous] = await Promise.all([
    fetchAllSources(supabaseAdmin, userId, {
      startDate: currentStart,
      endDate: currentEnd,
      includeAdsense: true,
      includeGsc: true,
    }),
    fetchAllSources(supabaseAdmin, userId, {
      startDate: previousStart,
      endDate: previousEnd,
      includeAdsense: true,
      includeGsc: true,
    }),
  ])

  // 블로그 메타 — domain 매핑용
  const { data: blogsData } = await supabaseAdmin
    .from('blogs')
    .select('id, slug, custom_domain')
    .eq('user_id', userId)
    /* is_active 필터 제거 — 대시보드 동작 일치 */
  const blogs = blogsData ?? []

  // 합계 계산
  const sumGa4 = (bundle: typeof current) =>
    Object.values(bundle.ga4ByBlog).reduce((acc, m) => acc + (m?.screenPageViews ?? 0), 0)

  const sumAdsense = (bundle: typeof current) => {
    let total = 0
    for (const blog of blogs) {
      const rev = pickRevenueForBlog(bundle.adsenseByDomain, [
        blog.custom_domain,
        `multi-blog-hub.vercel.app`,
      ])
      if (rev) total += rev.estimatedEarnings
    }
    return total
  }

  const sumGsc = (bundle: typeof current) => {
    let imp = 0, clk = 0
    for (const rows of Object.values(bundle.gscByBlog)) {
      for (const r of rows) {
        imp += r.impressions
        clk += r.clicks
      }
    }
    return { impressions: imp, clicks: clk, ctr: imp > 0 ? clk / imp : 0 }
  }

  const cView = sumGa4(current)
  const pView = sumGa4(previous)
  const cRev = sumAdsense(current)
  const pRev = sumAdsense(previous)
  const cGsc = sumGsc(current)
  const pGsc = sumGsc(previous)

  const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100)

  const delta = {
    revenue: round2(pct(cRev, pRev)),
    views: round2(pct(cView, pView)),
    ctr: round2(pct(cGsc.ctr, pGsc.ctr)),
  }

  // 알림: hidden gems / decaying
  const allCurrentRows: GscRow[] = []
  for (const rows of Object.values(current.gscByBlog)) allCurrentRows.push(...rows)
  const allPreviousRows: GscRow[] = []
  for (const rows of Object.values(previous.gscByBlog)) allPreviousRows.push(...rows)

  const hiddenGems = findHiddenGems(allCurrentRows, HIDDEN_GEM_MIN_IMPR, HIDDEN_GEM_MAX_CTR)
  const decaying = findDecayingPages(allCurrentRows, allPreviousRows, DECAYING_DROP_RATIO)

  // 추천 액션 휴리스틱
  const recommendedActions: RecommendedAction[] = []

  if (hiddenGems.length > 0) {
    recommendedActions.push({
      id: 'rec_hidden_gems',
      type: 'change_title',
      title: `${hiddenGems.length}개 글, 제목만 바꾸면 클릭이 늡니다`,
      description: `노출은 충분한데 클릭이 안 되는 글을 발견했어요. AI가 제목 3개를 제안합니다.`,
      payload: { count: hiddenGems.length },
    })
  }

  if (decaying.length > 0) {
    recommendedActions.push({
      id: 'rec_decaying',
      type: 'add_to_rewrite_queue',
      title: `${decaying.length}개 글이 검색 노출에서 밀려나고 있어요`,
      description: `이전 대비 노출이 50% 이상 떨어진 글입니다. 리라이팅 큐에 추가하시겠어요?`,
      payload: { count: decaying.length },
    })
  }

  const lowCtrDomains = Object.values(current.adsenseByDomain).filter(
    d => d.impressions > 100 && d.ctr < LOW_ADSENSE_CTR,
  )
  if (lowCtrDomains.length > 0) {
    recommendedActions.push({
      id: 'rec_low_ctr',
      type: 'toggle_slot',
      title: `광고 슬롯 CTR이 낮은 도메인이 ${lowCtrDomains.length}개 있어요`,
      description: `슬롯 위치를 점검하거나 비활성화를 고려해보세요.`,
      payload: { domains: lowCtrDomains.map(d => d.domain) },
    })
  }

  // 추천이 3개 안 되면 빈자리 placeholder
  while (recommendedActions.length < 3) {
    recommendedActions.push({
      id: `rec_placeholder_${recommendedActions.length}`,
      type: 'apply_slot_position',
      title: '오늘은 큰 알림이 없습니다',
      description: '필요하면 시뮬레이션 섹션에서 변화를 미리 시험해보세요.',
    })
  }

  return {
    delta,
    totals: {
      revenue: round2(cRev),
      views: cView,
      impressions: cGsc.impressions,
      clicks: cGsc.clicks,
      ctr: round4(cGsc.ctr),
    },
    alerts: {
      hiddenGems: hiddenGems.length,
      decaying: decaying.length,
    },
    recommendedActions: recommendedActions.slice(0, 3),
    errors: [
      ...current.errors.map(e => ({ source: e.source, message: `[current] ${e.message}` })),
      ...previous.errors.map(e => ({ source: e.source, message: `[previous] ${e.message}` })),
    ],
  }
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
