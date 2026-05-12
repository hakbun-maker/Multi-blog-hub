import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { bulkApplyAutoIndexAndSitemap } from '@/lib/google/gsc-site'
import { getValidIndexingToken } from '@/lib/google/token-refresh'
import { inspectUrl, type IndexVerdict } from '@/lib/google/url-inspection'

/**
 * 모든 블로그에 자동색인 ON + 사이트맵 일괄 재제출 + (옵션) URL Inspection 일괄 검사.
 *
 * POST body: { skipInspection?: boolean, inspectionLimit?: number }
 *   - skipInspection: true면 1·2단계만 (기존 동작)
 *   - inspectionLimit: URL 검사할 글 최대 개수 (기본 200)
 *
 * 응답:
 *   {
 *     ok: true,
 *     summary: { total, autoIndexSet, sitemapOk, failed,
 *                inspection?: { total, passed, partial, failed, neutral, errors } },
 *     results: [...],
 *     inspection?: [{ postId, url, verdict, coverageState }]
 *   }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { skipInspection?: boolean; inspectionLimit?: number }
  const skipInspection = body.skipInspection === true
  const inspectionLimit = Math.max(1, Math.min(500, body.inspectionLimit ?? 200))

  try {
    // 1·2단계: 자동색인 ON + 사이트맵 제출
    const { results } = await bulkApplyAutoIndexAndSitemap(user.id)
    const baseSummary = {
      total: results.length,
      autoIndexSet: results.filter(r => r.autoIndexSet).length,
      sitemapOk: results.filter(r => r.sitemapOk).length,
      failed: results.filter(r => !r.sitemapOk || !r.autoIndexSet).length,
    }

    if (skipInspection) {
      return NextResponse.json({ ok: true, summary: baseSummary, results })
    }

    // 3단계: URL Inspection API로 발행글 색인 상태 일괄 검사
    const accessToken = await getValidIndexingToken(user.id)
    if (!accessToken) {
      return NextResponse.json({
        ok: true,
        summary: { ...baseSummary, inspection: { total: 0, passed: 0, partial: 0, failed: 0, neutral: 0, errors: 0, skipped: 'GSC 토큰 없음' } },
        results,
      })
    }

    const [{ data: posts }, { data: blogs }] = await Promise.all([
      supabase
        .from('posts')
        .select('id, slug, blog_id, status')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .not('slug', 'is', null)
        .order('published_at', { ascending: false })
        .limit(inspectionLimit),
      supabase.from('blogs').select('id, slug, custom_domain').eq('user_id', user.id),
    ])

    const blogById = new Map((blogs ?? []).map(b => [b.id as string, { slug: b.slug as string, custom_domain: b.custom_domain as string | null }]))

    interface InspectionRow {
      postId: string
      url: string
      blogId: string
      verdict: IndexVerdict | null
      coverageState: string | null
      lastCrawlTime: string | null
      error?: string
    }

    const inspectionResults: InspectionRow[] = []
    for (const p of (posts ?? []) as { id: string; slug: string; blog_id: string }[]) {
      const blog = blogById.get(p.blog_id)
      if (!blog || !blog.custom_domain) {
        inspectionResults.push({
          postId: p.id,
          url: '',
          blogId: p.blog_id,
          verdict: null,
          coverageState: null,
          lastCrawlTime: null,
          error: 'custom_domain 없음',
        })
        continue
      }
      const siteUrl = `sc-domain:${blog.custom_domain}`
      const inspectionUrl = `https://${blog.custom_domain}/${encodeURIComponent(p.slug)}`
      const r = await inspectUrl(siteUrl, inspectionUrl, accessToken)
      inspectionResults.push({
        postId: p.id,
        url: inspectionUrl,
        blogId: p.blog_id,
        verdict: r.error ? null : r.verdict,
        coverageState: r.coverageState ?? null,
        lastCrawlTime: r.lastCrawlTime ?? null,
        error: r.error,
      })
      // 호출 spam 방지
      await new Promise(res => setTimeout(res, 100))
    }

    // DB 저장
    const now = new Date().toISOString()
    await Promise.all(
      inspectionResults
        .filter(r => r.verdict !== null)
        .map(r =>
          supabase
            .from('posts')
            .update({
              indexing_verdict: r.verdict,
              indexing_coverage_state: r.coverageState,
              indexing_inspected_at: now,
              indexing_last_crawl_at: r.lastCrawlTime,
            })
            .eq('id', r.postId)
            .eq('user_id', user.id),
        ),
    )

    const inspectionSummary = {
      total: inspectionResults.length,
      passed: inspectionResults.filter(r => r.verdict === 'PASS').length,
      partial: inspectionResults.filter(r => r.verdict === 'PARTIAL').length,
      failed: inspectionResults.filter(r => r.verdict === 'FAIL').length,
      neutral: inspectionResults.filter(r => r.verdict === 'NEUTRAL').length,
      errors: inspectionResults.filter(r => !!r.error).length,
    }

    return NextResponse.json({
      ok: true,
      summary: { ...baseSummary, inspection: inspectionSummary },
      results,
      inspection: inspectionResults,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : '일괄 적용 중 오류 발생'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
