/**
 * POST /api/gsc/inspect-batch
 *
 * 사용자의 모든 발행 글에 대해 GSC URL Inspection API를 호출하여
 * 실제 색인 여부(verdict + coverageState)를 받아 posts 테이블에 저장.
 *
 * 수동 GSC UI의 10건/일 한도와 무관 — Inspection API는 2000건/일/속성.
 *
 * 응답:
 *   {
 *     ok: true,
 *     summary: { total, passed, partial, failed, neutral, errors },
 *     results: [{ postId, url, verdict, coverageState, error? }]
 *   }
 *
 * 토큰: google_indexing OAuth (webmasters 스코프)
 * 사이트 매칭: blogs.custom_domain → sc-domain:custom_domain 형태로 호출
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getValidIndexingToken } from '@/lib/google/token-refresh'
import { inspectUrl, type IndexVerdict } from '@/lib/google/url-inspection'

export const dynamic = 'force-dynamic'

interface InspectionRow {
  postId: string
  url: string
  blogId: string
  verdict: IndexVerdict | null
  coverageState: string | null
  lastCrawlTime: string | null
  error?: string
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { blogId?: string; limit?: number }
  const filterBlogId = body.blogId
  const limit = Math.max(1, Math.min(500, body.limit ?? 200))  // 한 번에 최대 500건

  const accessToken = await getValidIndexingToken(user.id)
  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      error: 'GSC 토큰 없음 — 블로그 설정 > 색인/사이트맵에서 Google 연결을 다시 진행해주세요.',
    }, { status: 400 })
  }

  // 발행글 + 해당 블로그 정보 로드
  let postsQuery = supabase
    .from('posts')
    .select('id, slug, blog_id, status')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .not('slug', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (filterBlogId) postsQuery = postsQuery.eq('blog_id', filterBlogId)

  const [{ data: posts }, { data: blogs }] = await Promise.all([
    postsQuery,
    supabase.from('blogs').select('id, slug, custom_domain').eq('user_id', user.id),
  ])

  const blogById = new Map((blogs ?? []).map(b => [b.id as string, { slug: b.slug as string, custom_domain: b.custom_domain as string | null }]))

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://multi-blog-hub.vercel.app').replace(/\/$/, '')

  const results: InspectionRow[] = []
  for (const p of (posts ?? []) as { id: string; slug: string; blog_id: string }[]) {
    const blog = blogById.get(p.blog_id)
    if (!blog) continue

    // GSC 속성 식별자 + 검사 URL 결정
    let siteUrl: string
    let inspectionUrl: string
    if (blog.custom_domain) {
      siteUrl = `sc-domain:${blog.custom_domain}`
      inspectionUrl = `https://${blog.custom_domain}/${encodeURIComponent(p.slug)}`
    } else {
      // custom_domain 없으면 GSC 검사 불가 — 스킵
      results.push({
        postId: p.id,
        url: `${APP_URL}/blog/${blog.slug}/${p.slug}`,
        blogId: p.blog_id,
        verdict: null,
        coverageState: null,
        lastCrawlTime: null,
        error: 'custom_domain 없음 — GSC 검사 불가',
      })
      continue
    }

    const result = await inspectUrl(siteUrl, inspectionUrl, accessToken)

    results.push({
      postId: p.id,
      url: inspectionUrl,
      blogId: p.blog_id,
      verdict: result.error ? null : result.verdict,
      coverageState: result.coverageState ?? null,
      lastCrawlTime: result.lastCrawlTime ?? null,
      error: result.error,
    })

    // 100ms 간격으로 호출 spam 방지
    await new Promise(r => setTimeout(r, 100))
  }

  // DB에 저장 (실패한 것도 inspected_at 갱신)
  const now = new Date().toISOString()
  const updates = results
    .filter(r => !r.error || r.verdict !== null)
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
    )
  await Promise.all(updates)

  // 요약
  const summary = {
    total: results.length,
    passed: results.filter(r => r.verdict === 'PASS').length,
    partial: results.filter(r => r.verdict === 'PARTIAL').length,
    failed: results.filter(r => r.verdict === 'FAIL').length,
    neutral: results.filter(r => r.verdict === 'NEUTRAL').length,
    errors: results.filter(r => !!r.error).length,
  }

  return NextResponse.json({ ok: true, summary, results })
}
