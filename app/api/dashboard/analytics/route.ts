import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getValidGoogleToken } from '@/lib/google/token-refresh'
import { fetchGa4MetricsBatch } from '@/lib/google/ga4-data'
import {
  generateAdsenseDomainReport,
  pickRevenueForBlog,
  type AdsenseRevenue,
} from '@/lib/google/adsense'

export const dynamic = 'force-dynamic'

/**
 * 대시보드 통합 분석 API.
 * 우선순위:
 *  1) GA4 Data API (totalUsers, screenPageViews) — 실데이터
 *  2) AdSense Management API (estimatedEarnings) — 실데이터
 *  3) 폴백: posts.view_count + daily_stats.visitors + (views/1000)*$1
 *
 * 응답 형태:
 *  {
 *    range: { startDate, endDate, days },
 *    connections: { ga4: bool, adsense: bool, adsenseAccountId },
 *    totals: { visitors, pageViews, sessions, revenueUsd },
 *    blogs: [{ id, name, color, slug, custom_domain,
 *              visitors, pageViews, sessions, revenueUsd,
 *              ga4PropertyId, source: { traffic, revenue } }],
 *  }
 */

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

function appHost(): string {
  return APP_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
}

function todayInSeoul(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}
function daysAgoInSeoul(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

interface BlogRow {
  id: string
  name: string
  slug: string | null
  color: string | null
  custom_domain: string | null
  ga4_property_id: string | null
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.max(1, Math.min(90, parseInt(searchParams.get('days') ?? '30', 10) || 30))
  const startDate = daysAgoInSeoul(days - 1)
  const endDate = todayInSeoul()

  const [{ data: blogs }, { data: tokenRow }, { data: posts }, { data: dailyStats }] = await Promise.all([
    supabase
      .from('blogs')
      .select('id, name, slug, color, custom_domain, ga4_property_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('user_oauth_tokens')
      .select('adsense_account_id, scopes')
      .eq('user_id', user.id)
      .eq('provider', 'google_analytics')
      .maybeSingle(),
    supabase
      .from('posts')
      .select('blog_id, view_count')
      .eq('user_id', user.id),
    supabase
      .from('daily_stats')
      .select('blog_id, visitors, views, date')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate),
  ])

  const blogList = (blogs ?? []) as BlogRow[]
  const adsenseAccountId = tokenRow?.adsense_account_id ?? null
  const scopes = tokenRow?.scopes ?? ''
  const hasAdsenseScope = scopes.includes('adsense.readonly')

  // 폴백 데이터 집계
  const fallbackByBlog: Record<string, { visitors: number; views: number }> = {}
  for (const b of blogList) fallbackByBlog[b.id] = { visitors: 0, views: 0 }
  for (const row of dailyStats ?? []) {
    const acc = fallbackByBlog[row.blog_id]
    if (!acc) continue
    acc.visitors += row.visitors ?? 0
    acc.views += row.views ?? 0
  }
  // posts.view_count는 누적 — 기간 필터가 정확히 안 맞지만 폴백 수단
  const postsViewByBlog: Record<string, number> = {}
  for (const p of posts ?? []) {
    postsViewByBlog[p.blog_id] = (postsViewByBlog[p.blog_id] ?? 0) + (p.view_count ?? 0)
  }

  // GA4 호출 (모든 블로그 propertyId 모음)
  const propertyIds = blogList.map(b => b.ga4_property_id).filter((x): x is string => !!x)
  let ga4Connected = false
  let ga4Map: Record<string, { totalUsers: number; screenPageViews: number; sessions: number }> = {}

  if (propertyIds.length) {
    const accessToken = await getValidGoogleToken(user.id)
    if (accessToken) {
      ga4Connected = true
      const batch = await fetchGa4MetricsBatch(propertyIds, accessToken, startDate, endDate)
      for (const [pid, r] of Object.entries(batch)) {
        ga4Map[pid] = r.metrics
      }
    }
  }

  // AdSense 호출 (account ID 있고 scope 부여된 경우)
  let adsenseConnected = false
  let adsenseDomainMap: Record<string, AdsenseRevenue> = {}
  if (adsenseAccountId && hasAdsenseScope) {
    const accessToken = await getValidGoogleToken(user.id)
    if (accessToken) {
      try {
        adsenseDomainMap = await generateAdsenseDomainReport(
          adsenseAccountId,
          accessToken,
          startDate,
          endDate,
        )
        adsenseConnected = true
      } catch {
        // 미승인/리포트 실패 — 폴백
      }
    }
  }

  // 블로그별 합산
  const host = appHost()
  type BlogStat = {
    id: string
    name: string
    slug: string | null
    color: string | null
    custom_domain: string | null
    ga4PropertyId: string | null
    visitors: number
    pageViews: number
    sessions: number
    revenueUsd: number
    source: { traffic: 'ga4' | 'fallback'; revenue: 'adsense' | 'estimate' }
  }

  const stats: BlogStat[] = blogList.map(b => {
    const ga4 = b.ga4_property_id ? ga4Map[b.ga4_property_id] : null
    const fb = fallbackByBlog[b.id] ?? { visitors: 0, views: 0 }
    const useGa4 = !!ga4 && (ga4.totalUsers > 0 || ga4.screenPageViews > 0)

    const visitors = useGa4 ? ga4!.totalUsers : fb.visitors
    const pageViews = useGa4
      ? ga4!.screenPageViews
      : (fb.views > 0 ? fb.views : (postsViewByBlog[b.id] ?? 0))
    const sessions = useGa4 ? ga4!.sessions : 0

    // AdSense 도메인 매칭: custom_domain 우선, 없으면 앱 호스트 (서브도메인 매칭은 제한적)
    const subdomainHost = b.slug ? `${b.slug}.${host}` : null
    const candidates = [b.custom_domain, subdomainHost, host]
    const ads = adsenseConnected ? pickRevenueForBlog(adsenseDomainMap, candidates) : null
    const revenueUsd = ads ? ads.estimatedEarnings : (pageViews / 1000) * 1 // CPM $1 폴백

    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      color: b.color,
      custom_domain: b.custom_domain,
      ga4PropertyId: b.ga4_property_id,
      visitors,
      pageViews,
      sessions,
      revenueUsd,
      source: {
        traffic: useGa4 ? 'ga4' : 'fallback',
        revenue: ads ? 'adsense' : 'estimate',
      },
    }
  })

  const totals = stats.reduce(
    (acc, s) => ({
      visitors: acc.visitors + s.visitors,
      pageViews: acc.pageViews + s.pageViews,
      sessions: acc.sessions + s.sessions,
      revenueUsd: acc.revenueUsd + s.revenueUsd,
    }),
    { visitors: 0, pageViews: 0, sessions: 0, revenueUsd: 0 },
  )

  return NextResponse.json({
    range: { startDate, endDate, days },
    connections: {
      ga4: ga4Connected,
      adsense: adsenseConnected,
      adsenseAccountId,
      hasAdsenseScope,
    },
    totals,
    blogs: stats,
  }, {
    headers: {
      // 5분 CDN 캐시 + 사용자 전용
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
    },
  })
}
