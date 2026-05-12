import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getValidIndexingToken } from '@/lib/google/token-refresh'
import { fetchSearchAnalytics, type GscRow } from '@/lib/google/gsc-search-analytics'
import { getOrCompute, invalidate } from '@/lib/stats/cache'

export const dynamic = 'force-dynamic'

/**
 * 블로그의 글별 GSC 색인 상태 조회.
 *
 * Query params:
 *  - blogId (required)
 *  - refresh=1 (optional) — 캐시 무효화 후 재조회
 *
 * 응답:
 *  {
 *    source: 'gsc' | 'fallback',
 *    bySlug: { [post_slug]: 'indexed' | 'pending' | 'not_indexed' },
 *    debug?: { siteUrlTried: string[], rowCount: number, error?: string },
 *    error?: string
 *  }
 *
 * 동작:
 *  1) 가능한 GSC 사이트 URL 후보 여러 개를 순차 시도 (URL prefix + Domain property)
 *     예: 'https://example.com/', 'sc-domain:example.com'
 *  2) row 1개 이상 응답한 첫 후보 사용
 *  3) 노출 ≥ 1 = 'indexed', 그 외 발행일 기반 'pending'/'not_indexed'
 *  4) 모든 후보 실패 = source 'fallback'
 *
 * 1시간 캐시 (stats_cache 활용). ?refresh=1로 무효화 가능.
 */

const PENDING_DAYS = 7

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const blogId = searchParams.get('blogId')
  const forceRefresh = searchParams.get('refresh') === '1'
  if (!blogId) return NextResponse.json({ error: 'blogId 필요' }, { status: 400 })

  const [{ data: blog }, { data: posts }] = await Promise.all([
    supabase
      .from('blogs')
      .select('id, slug, custom_domain')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('posts')
      .select('id, slug, published_at, indexing_verdict, indexing_coverage_state, indexing_inspected_at')
      .eq('blog_id', blogId)
      .eq('user_id', user.id)
      .eq('status', 'published'),
  ])

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  const accessToken = await getValidIndexingToken(user.id)
  if (!accessToken) {
    return NextResponse.json({ source: 'fallback', bySlug: {}, error: 'GSC 토큰 없음 — 블로그 설정 > 색인/사이트맵에서 Google 연결을 다시 진행해주세요.' })
  }

  // 가능한 GSC 사이트 URL 후보들 — GSC 등록 형식 다양
  // 1) Domain property (sc-domain:host) — 가장 강력 (subdomain 모두 포함)
  // 2) URL prefix (https://host/) — 정확한 prefix 매치
  // 3) Default Vercel URL (custom_domain 없을 때만)
  const siteUrlCandidates: string[] = []
  if (blog.custom_domain) {
    siteUrlCandidates.push(`sc-domain:${blog.custom_domain}`)
    siteUrlCandidates.push(`https://${blog.custom_domain}/`)
  }
  siteUrlCandidates.push(
    `sc-domain:multi-blog-hub.vercel.app`,
    `https://multi-blog-hub.vercel.app/blog/${encodeURIComponent(blog.slug)}/`,
  )

  // 캐시
  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const cacheKey = `indexing-status:${blogId}`
  if (forceRefresh) {
    await invalidate(supabaseAdmin, user.id, cacheKey)
  }

  const result = await getOrCompute(supabaseAdmin, user.id, cacheKey, 60 * 60 * 1000, async () => {
    const startDate = daysAgoIso(30)
    const endDate = todayIso()

    // 후보 순차 시도 — row 1개 이상 응답하는 첫 사이트 사용
    const tried: { siteUrl: string; rowCount: number; error?: string }[] = []
    let usedRows: GscRow[] = []
    for (const siteUrl of siteUrlCandidates) {
      const gsc = await fetchSearchAnalytics(siteUrl, accessToken, startDate, endDate, ['page'], 5000)
      tried.push({ siteUrl, rowCount: gsc.rows.length, error: gsc.error })
      if (gsc.rows.length > 0) {
        usedRows = gsc.rows
        break
      }
    }

    console.log('[indexing-status]', { blogId, blogSlug: blog.slug, custom_domain: blog.custom_domain, tried })

    // 노출 ≥ 1인 page들의 마지막 segment(slug) 추출
    const indexedSlugs: Set<string> = new Set()
    for (const row of usedRows) {
      if (!row.page || row.impressions < 1) continue
      const path = row.page.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '').replace(/\/+$/, '')
      const slug = path.split('/').filter(Boolean).pop()
      if (slug) indexedSlugs.add(decodeURIComponent(slug))
    }
    return { indexedSlugs: Array.from(indexedSlugs), tried, totalRows: usedRows.length }
  })

  // 글별 색인 상태 매핑
  // 우선순위:
  //   1) posts.indexing_verdict (URL Inspection API 결과 — 가장 정확)
  //   2) GSC search analytics 노출 ≥ 1 (간접 신호)
  //   3) 발행일 기준 폴백 (pending/not_indexed)
  const indexedSet = new Set(result.indexedSlugs)
  const now = Date.now()
  const bySlug: Record<string, 'indexed' | 'pending' | 'not_indexed'> = {}
  const detailBySlug: Record<string, { source: 'inspection' | 'impressions' | 'fallback'; coverageState?: string | null; inspectedAt?: string | null }> = {}

  for (const post of posts ?? []) {
    if (!post.slug || !post.published_at) continue

    // 1) URL Inspection 결과 우선
    const verdict = (post as { indexing_verdict?: string | null }).indexing_verdict
    const coverageState = (post as { indexing_coverage_state?: string | null }).indexing_coverage_state ?? null
    const inspectedAt = (post as { indexing_inspected_at?: string | null }).indexing_inspected_at ?? null

    if (verdict === 'PASS' || verdict === 'PARTIAL') {
      bySlug[post.slug] = 'indexed'
      detailBySlug[post.slug] = { source: 'inspection', coverageState, inspectedAt }
      continue
    }
    if (verdict === 'FAIL') {
      bySlug[post.slug] = 'not_indexed'
      detailBySlug[post.slug] = { source: 'inspection', coverageState, inspectedAt }
      continue
    }
    if (verdict === 'NEUTRAL') {
      bySlug[post.slug] = 'pending'
      detailBySlug[post.slug] = { source: 'inspection', coverageState, inspectedAt }
      continue
    }

    // 2) Search analytics 노출 신호
    if (indexedSet.has(post.slug) || indexedSet.has(decodeURIComponent(post.slug))) {
      bySlug[post.slug] = 'indexed'
      detailBySlug[post.slug] = { source: 'impressions' }
      continue
    }

    // 3) 발행일 폴백
    const ageDays = (now - new Date(post.published_at).getTime()) / (1000 * 60 * 60 * 24)
    bySlug[post.slug] = ageDays <= PENDING_DAYS ? 'pending' : 'not_indexed'
    detailBySlug[post.slug] = { source: 'fallback' }
  }

  return NextResponse.json({
    source: 'gsc',
    bySlug,
    detailBySlug,
    debug: {
      siteUrlTried: result.tried?.map(t => `${t.siteUrl} (${t.rowCount} rows${t.error ? ', err: ' + t.error.slice(0, 60) : ''})`) ?? [],
      totalRows: result.totalRows ?? 0,
      indexedSlugCount: result.indexedSlugs.length,
    },
  })
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}
