/**
 * 통계 페이지의 외부 데이터 소스 통합 fetcher.
 *
 * GA4 + AdSense + GSC 세 소스를 병렬 호출하여 가공된 raw 데이터를 반환.
 * 모든 통계 API 라우트가 이 모듈을 통해 데이터를 가져온다.
 *
 * 호출 흐름:
 *   /api/stats/* → lib/stats/cache.ts (1h TTL) → lib/stats/sources.ts → 외부 API
 *
 * 실패한 source는 부분 데이터로 반환하고 error 필드에 사유 표기 (전체 실패하지 않게)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getValidGoogleToken } from '@/lib/google/token-refresh'
import { fetchGa4Metrics, fetchGa4PageViews, type Ga4Metrics } from '@/lib/google/ga4-data'
import { generateAdsenseDomainReport, type AdsenseRevenue } from '@/lib/google/adsense'
import { fetchSearchAnalytics, type GscRow } from '@/lib/google/gsc-search-analytics'

export interface BlogMeta {
  id: string
  user_id: string
  slug: string
  custom_domain: string | null
  ga4_property_id: string | null
  blog_type: string | null
  name: string
}

export interface RawStatsBundle {
  ga4ByBlog: Record<string, Ga4Metrics>          // blogId → metrics
  ga4PagesByBlog: Record<string, Record<string, number>> // blogId → pagePath → views
  adsenseByDomain: Record<string, AdsenseRevenue> // domain → revenue
  gscByBlog: Record<string, GscRow[]>            // blogId → search analytics rows
  errors: { source: 'ga4' | 'adsense' | 'gsc'; blogId?: string; message: string }[]
}

interface FetchOptions {
  days?: number  // default 30
  includeGa4Pages?: boolean
  includeGsc?: boolean
  includeAdsense?: boolean
}

/**
 * 사용자의 모든 활성 블로그에 대해 GA4·AdSense·GSC 데이터를 병렬 fetch.
 *
 * @param supabaseAdmin service role client (RLS 우회 + AdSense token 등 접근)
 * @param userId 통계 소유자
 * @param options days, 어떤 source 포함할지
 */
export async function fetchAllSources(
  supabaseAdmin: SupabaseClient,
  userId: string,
  options: FetchOptions = {},
): Promise<RawStatsBundle> {
  const days = options.days ?? 30
  const startDate = daysAgoIso(days)
  const endDate = todayIso()

  const errors: RawStatsBundle['errors'] = []

  // 1) 활성 블로그 + Google access token + AdSense account id 동시 로드
  const [blogsRes, accessToken, tokenRowRes] = await Promise.all([
    supabaseAdmin
      .from('blogs')
      .select('id, user_id, slug, custom_domain, ga4_property_id, blog_type, name')
      .eq('user_id', userId)
      .eq('is_active', true),
    getValidGoogleToken(userId),
    supabaseAdmin
      .from('user_oauth_tokens')
      .select('adsense_account_id')
      .eq('user_id', userId)
      .eq('provider', 'google_analytics')
      .maybeSingle(),
  ])

  const blogs = (blogsRes.data ?? []) as BlogMeta[]
  const adsenseAccountId = (tokenRowRes.data?.adsense_account_id as string | null) ?? null

  if (!accessToken) {
    errors.push({ source: 'ga4', message: 'Google access token 없음 — GA4·AdSense·GSC 모두 스킵' })
    return {
      ga4ByBlog: {},
      ga4PagesByBlog: {},
      adsenseByDomain: {},
      gscByBlog: {},
      errors,
    }
  }

  // 2) 병렬 호출: GA4 (block 단위) + AdSense (전체 도메인 리포트) + GSC (블로그별)
  const ga4Promises = blogs
    .filter(b => b.ga4_property_id)
    .map(async b => {
      const result = await fetchGa4Metrics(b.ga4_property_id!, accessToken, startDate, endDate)
      if (result.error) {
        errors.push({ source: 'ga4', blogId: b.id, message: result.error })
      }
      return [b.id, result.metrics] as const
    })

  const ga4PagesPromises = options.includeGa4Pages
    ? blogs
        .filter(b => b.ga4_property_id)
        .map(async b => {
          const result = await fetchGa4PageViews(b.ga4_property_id!, accessToken, startDate, endDate)
          if (result.error) {
            errors.push({ source: 'ga4', blogId: b.id, message: result.error })
          }
          return [b.id, result.byPath] as const
        })
    : []

  const adsensePromise = options.includeAdsense !== false && adsenseAccountId
    ? generateAdsenseDomainReport(adsenseAccountId, accessToken, startDate, endDate)
        .catch(err => {
          errors.push({ source: 'adsense', message: err instanceof Error ? err.message : 'AdSense 호출 실패' })
          return {} as Record<string, AdsenseRevenue>
        })
    : Promise.resolve({} as Record<string, AdsenseRevenue>)

  const gscPromises = options.includeGsc
    ? blogs.map(async b => {
        // GSC 사이트 URL — custom_domain 우선, 없으면 default Vercel URL
        const siteUrl = b.custom_domain
          ? `https://${b.custom_domain}/`
          : `https://multi-blog-hub.vercel.app/blog/${encodeURIComponent(b.slug)}/`
        const result = await fetchSearchAnalytics(
          siteUrl,
          accessToken,
          startDate,
          endDate,
          ['page'],
          5000,
        )
        if (result.error) {
          errors.push({ source: 'gsc', blogId: b.id, message: result.error })
        }
        return [b.id, result.rows] as const
      })
    : []

  const [ga4Results, ga4PagesResults, adsenseResult, gscResults] = await Promise.all([
    Promise.all(ga4Promises),
    Promise.all(ga4PagesPromises),
    adsensePromise,
    Promise.all(gscPromises),
  ])

  return {
    ga4ByBlog: Object.fromEntries(ga4Results),
    ga4PagesByBlog: Object.fromEntries(ga4PagesResults),
    adsenseByDomain: adsenseResult,
    gscByBlog: Object.fromEntries(gscResults),
    errors,
  }
}

// ─── 헬퍼 ──────────────────────────────────────────

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}
