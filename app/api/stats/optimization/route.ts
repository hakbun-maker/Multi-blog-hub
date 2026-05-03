/**
 * GET /api/stats/optimization
 *
 * 최적화 섹션 데이터:
 *  - slots: 슬롯별 수익·CTR (사용자 ads_config 기반 + 표준 분배 비율)
 *  - rpmMatrix: 카테고리 × 블로그 RPM heatmap
 *  - viewability: 도메인별 viewability 분포 (≥60%, 30~60%, <30%)
 *
 * AdSense는 슬롯 단위 데이터를 직접 제공하지 않음 → 표준 분배 비율로 근사:
 *   top 25% / middle 35% / bottom 25% / sidebar 15%
 *   사용자 ads_config에서 활성화된 슬롯만 비례 재분배.
 *
 * 캐시: 1시간 TTL, ?refresh=1로 무효화
 */

import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getOrCompute, invalidate } from '@/lib/stats/cache'
import { fetchAllSources } from '@/lib/stats/sources'
import { getValidGoogleToken } from '@/lib/google/token-refresh'
import { pickRevenueForBlog, generateAdsenseViewabilityReport } from '@/lib/google/adsense'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'optimization'
const CACHE_TTL_MS = 60 * 60 * 1000

// 표준 슬롯 분배 비율 (4종 모두 활성화 시)
const SLOT_BASE_SHARE: Record<string, number> = {
  top: 0.25,
  middle: 0.35,
  bottom: 0.25,
  sidebar: 0.15,
}

interface SlotRow {
  slot: string
  enabled: boolean
  estimatedRevenue: number
  estimatedShare: number  // 0~1
  warning: string | null
}

interface RpmCell {
  blogId: string
  blogName: string
  categoryId: string | null
  categoryName: string
  rpm: number
  revenue: number
  views: number
}

interface ViewabilityBucket {
  range: 'high' | 'medium' | 'low'  // ≥60% / 30~60% / <30%
  domains: { domain: string; viewability: number; impressions: number }[]
}

interface OptimizationPayload {
  slots: SlotRow[]
  rpmMatrix: RpmCell[]
  viewability: ViewabilityBucket[]
  errors: { source: string; message: string }[]
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('refresh') === '1'

  const client = supabase as unknown as SupabaseClient

  if (forceRefresh) {
    await invalidate(client, user.id, CACHE_KEY)
  }

  const result = await getOrCompute<OptimizationPayload>(
    client,
    user.id,
    CACHE_KEY,
    CACHE_TTL_MS,
    async () => computeOptimization(client, user.id),
  )

  return NextResponse.json(result)
}

async function computeOptimization(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<OptimizationPayload> {
  const errors: OptimizationPayload['errors'] = []
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const today = new Date()
  const startDate = fmt(addDays(today, -30))
  const endDate = fmt(today)

  const [bundle, userRowRes, blogsRes, postsRes, catsRes, accessToken, tokenRowRes] = await Promise.all([
    fetchAllSources(supabaseAdmin, userId, {
      startDate, endDate,
      includeGa4Pages: true,
      includeAdsense: true,
      includeGsc: false,
    }),
    supabaseAdmin
      .from('users')
      .select('ads_config')
      .eq('id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('blogs')
      .select('id, name, custom_domain')
      .eq('user_id', userId)
      /* is_active 필터 제거 — 대시보드 동작 일치 */,
    supabaseAdmin
      .from('posts')
      .select('id, blog_id, category_id, slug, status')
      .eq('user_id', userId)
      .eq('status', 'published'),
    supabaseAdmin
      .from('categories')
      .select('id, name'),
    getValidGoogleToken(userId),
    supabaseAdmin
      .from('user_oauth_tokens')
      .select('adsense_account_id')
      .eq('user_id', userId)
      .eq('provider', 'google_analytics')
      .maybeSingle(),
  ])

  for (const e of bundle.errors) errors.push({ source: e.source, message: e.message })

  const adsConfig = (userRowRes.data?.ads_config as Record<string, { enabled?: boolean }> | null) ?? null
  const blogs = (blogsRes.data ?? []) as { id: string; name: string; custom_domain: string | null }[]
  const posts = (postsRes.data ?? []) as { id: string; blog_id: string; category_id: string | null; slug: string | null }[]
  const cats = (catsRes.data ?? []) as { id: string; name: string }[]
  const catNameById = new Map(cats.map(c => [c.id, c.name]))

  // ─── 1) 슬롯별 수익 추정 ─────────────────────────
  const totalRevenue = blogs.reduce((acc, blog) => {
    const rev = pickRevenueForBlog(bundle.adsenseByDomain, [blog.custom_domain, 'multi-blog-hub.vercel.app'])
    return acc + (rev?.estimatedEarnings ?? 0)
  }, 0)

  const enabledSlots = ['top', 'middle', 'bottom', 'sidebar'].filter(s => {
    if (!adsConfig) return true
    return adsConfig[s]?.enabled !== false
  })
  const baseShareSum = enabledSlots.reduce((acc, s) => acc + (SLOT_BASE_SHARE[s] ?? 0), 0)
  const slots: SlotRow[] = ['top', 'middle', 'bottom', 'sidebar'].map(s => {
    const enabled = enabledSlots.includes(s)
    const share = enabled && baseShareSum > 0 ? (SLOT_BASE_SHARE[s] ?? 0) / baseShareSum : 0
    const revenue = totalRevenue * share
    return {
      slot: s,
      enabled,
      estimatedRevenue: round2(revenue),
      estimatedShare: round4(share),
      warning: !enabled ? null : (s === 'sidebar' && share > 0 ? null : null),
    }
  })

  // ─── 2) 카테고리 × 블로그 RPM 매트릭스 ─────────────
  // 글별 page views + 블로그 도메인 매핑 + AdSense 도메인 수익 → 셀 단위 (categoryId × blogId) RPM
  const blogRevenue = new Map<string, number>()
  const blogTotalViews = new Map<string, number>()
  for (const blog of blogs) {
    const rev = pickRevenueForBlog(bundle.adsenseByDomain, [blog.custom_domain, 'multi-blog-hub.vercel.app'])
    blogRevenue.set(blog.id, rev?.estimatedEarnings ?? 0)
    const pageMap = bundle.ga4PagesByBlog[blog.id] ?? {}
    blogTotalViews.set(blog.id, Object.values(pageMap).reduce((a, b) => a + b, 0))
  }

  // (blogId, categoryId) → views
  const cellViews = new Map<string, number>()
  const blogSlugById = new Map<string, string>(blogs.map(b => [b.id, ''])) // dummy; not needed
  for (const post of posts) {
    if (!post.slug) continue
    const pageMap = bundle.ga4PagesByBlog[post.blog_id] ?? {}
    let views = 0
    for (const [path, v] of Object.entries(pageMap)) {
      if (path.endsWith(`/${post.slug}`) || path.endsWith(`/${post.slug}/`)) {
        views += v
      }
    }
    if (views === 0) continue
    const key = `${post.blog_id}::${post.category_id ?? '__none__'}`
    cellViews.set(key, (cellViews.get(key) ?? 0) + views)
  }

  const rpmMatrix: RpmCell[] = []
  for (const [key, views] of Array.from(cellViews.entries())) {
    const [blogId, catKey] = key.split('::')
    const totalViews = blogTotalViews.get(blogId) ?? 0
    const rev = blogRevenue.get(blogId) ?? 0
    const cellRevenue = totalViews > 0 ? rev * (views / totalViews) : 0
    const blog = blogs.find(b => b.id === blogId)
    rpmMatrix.push({
      blogId,
      blogName: blog?.name ?? '',
      categoryId: catKey === '__none__' ? null : catKey,
      categoryName: catKey === '__none__' ? '미분류' : (catNameById.get(catKey) ?? '미분류'),
      rpm: views > 0 ? round4((cellRevenue / views) * 1000) : 0,
      revenue: round4(cellRevenue),
      views,
    })
  }

  // ─── 3) Viewability 분포 ────────────────────────
  const adsenseAccountId = (tokenRowRes.data?.adsense_account_id as string | null) ?? null
  let viewByDomain: Record<string, { viewability: number; impressions: number }> = {}
  if (accessToken && adsenseAccountId) {
    try {
      viewByDomain = await generateAdsenseViewabilityReport(adsenseAccountId, accessToken, startDate, endDate)
    } catch (err) {
      errors.push({ source: 'adsense', message: err instanceof Error ? err.message : 'Viewability 호출 실패' })
    }
  }

  const viewability: ViewabilityBucket[] = [
    { range: 'high', domains: [] },
    { range: 'medium', domains: [] },
    { range: 'low', domains: [] },
  ]
  for (const [domain, v] of Object.entries(viewByDomain)) {
    const entry = { domain, viewability: round4(v.viewability), impressions: v.impressions }
    if (v.viewability >= 0.6) viewability[0].domains.push(entry)
    else if (v.viewability >= 0.3) viewability[1].domains.push(entry)
    else viewability[2].domains.push(entry)
  }

  return { slots, rpmMatrix, viewability, errors }
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
