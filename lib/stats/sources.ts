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
import { getValidGoogleToken, getValidIndexingToken } from '@/lib/google/token-refresh'
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
  days?: number  // default 30 — startDate/endDate 미지정 시 사용
  startDate?: string  // YYYY-MM-DD — 명시 시 days 무시
  endDate?: string    // YYYY-MM-DD — 명시 시 days 무시
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
  const startDate = options.startDate ?? daysAgoIso(days)
  const endDate = options.endDate ?? todayIso()

  const errors: RawStatsBundle['errors'] = []

  // 1) 사용자의 모든 블로그 + Google access tokens (analytics/indexing 분리) + AdSense account id 동시 로드
  // 토큰 스코프 분리: analytics 토큰(GA4·AdSense), indexing 토큰(GSC webmasters)
  // is_active 필터 제거 — 대시보드 동작과 맞춤. is_active=NULL인 기존 블로그도 통계에 포함되도록.
  const [blogsRes, gaToken, gscToken, tokenRowRes] = await Promise.all([
    supabaseAdmin
      .from('blogs')
      .select('id, user_id, slug, custom_domain, ga4_property_id, blog_type, name')
      .eq('user_id', userId),
    getValidGoogleToken(userId),
    getValidIndexingToken(userId),
    supabaseAdmin
      .from('user_oauth_tokens')
      .select('adsense_account_id')
      .eq('user_id', userId)
      .eq('provider', 'google_analytics')
      .maybeSingle(),
  ])

  const blogs = (blogsRes.data ?? []) as BlogMeta[]
  const adsenseAccountId = (tokenRowRes.data?.adsense_account_id as string | null) ?? null

  if (!gaToken && !gscToken) {
    errors.push({ source: 'ga4', message: 'Google access token 없음 — 모든 source 스킵' })
    return {
      ga4ByBlog: {},
      ga4PagesByBlog: {},
      adsenseByDomain: {},
      gscByBlog: {},
      errors,
    }
  }
  if (!gaToken) {
    errors.push({ source: 'ga4', message: 'GA4/AdSense 토큰 없음' })
  }
  if (!gscToken) {
    errors.push({ source: 'gsc', message: 'GSC 토큰 없음 — 색인 OAuth 재연결 필요' })
  }

  // 2) 병렬 호출: GA4·AdSense는 gaToken, GSC는 gscToken
  const ga4Promises = gaToken
    ? blogs
        .filter(b => b.ga4_property_id)
        .map(async b => {
          const result = await fetchGa4Metrics(b.ga4_property_id!, gaToken, startDate, endDate)
          if (result.error) {
            errors.push({ source: 'ga4', blogId: b.id, message: result.error })
          }
          return [b.id, result.metrics] as const
        })
    : []

  const ga4PagesPromises = options.includeGa4Pages && gaToken
    ? blogs
        .filter(b => b.ga4_property_id)
        .map(async b => {
          const result = await fetchGa4PageViews(b.ga4_property_id!, gaToken, startDate, endDate)
          if (result.error) {
            errors.push({ source: 'ga4', blogId: b.id, message: result.error })
          }
          return [b.id, result.byPath] as const
        })
    : []

  const adsensePromise = options.includeAdsense !== false && adsenseAccountId && gaToken
    ? generateAdsenseDomainReport(adsenseAccountId, gaToken, startDate, endDate)
        .catch(err => {
          errors.push({ source: 'adsense', message: err instanceof Error ? err.message : 'AdSense 호출 실패' })
          return {} as Record<string, AdsenseRevenue>
        })
    : Promise.resolve({} as Record<string, AdsenseRevenue>)

  const gscPromises = options.includeGsc && gscToken
    ? blogs.map(async b => {
        // GSC 사이트 URL 후보 — custom_domain만 사용.
        // Vercel 도메인은 사용자 GSC 소유가 아니라 403을 반환하므로 시도하지 않음.
        // custom_domain 미설정 블로그는 GSC 데이터 없음 (스킵).
        if (!b.custom_domain) return [b.id, [] as GscRow[]] as const

        const candidates = [
          `sc-domain:${b.custom_domain}`,
          `https://${b.custom_domain}/`,
        ]
        let usedRows: GscRow[] = []
        let permissionDenied = false
        let lastNonPermissionError: string | undefined
        for (const siteUrl of candidates) {
          const result = await fetchSearchAnalytics(siteUrl, gscToken, startDate, endDate, ['page'], 5000)
          if (result.error) {
            // 403은 사용자 setup 이슈 (해당 도메인이 GSC에 등록 안 됨) — 코드 에러 아님
            if (result.error.includes('403')) permissionDenied = true
            else lastNonPermissionError = result.error
          }
          if (result.rows.length > 0) { usedRows = result.rows; break }
        }
        // 403만 있고 다른 에러 없으면 silent (warnings로 별도 처리 가능하나 일단 무시).
        // 실제 코드/네트워크 에러만 errors에 push.
        if (usedRows.length === 0 && lastNonPermissionError && !permissionDenied) {
          errors.push({ source: 'gsc', blogId: b.id, message: lastNonPermissionError })
        }
        return [b.id, usedRows] as const
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
