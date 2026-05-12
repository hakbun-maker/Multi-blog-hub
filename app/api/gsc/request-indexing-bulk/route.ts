/**
 * POST /api/gsc/request-indexing-bulk
 *
 * 지정된 글들에 대해 Google Indexing API로 색인 요청을 일괄 전송.
 * 사용처: 미색인 글 수정 패널의 "선택 글 재요청" 버튼.
 *
 * Body: { postIds: string[] }
 * 응답: { ok, summary: { total, succeeded, failed }, results: [{ postId, url, ok, error? }] }
 *
 * 한도: Google Indexing API 200건/일 (기본). 초과 시 일부 실패.
 * 토큰: google_indexing OAuth (webmasters + indexing 스코프)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { submitUrlToGoogle } from '@/lib/google/indexing-api'

export const dynamic = 'force-dynamic'

interface RequestBody {
  postIds: string[]
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Partial<RequestBody>
  const postIds = (body.postIds ?? []).filter(id => typeof id === 'string')
  if (postIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'postIds가 비어 있습니다.' }, { status: 400 })
  }
  if (postIds.length > 200) {
    return NextResponse.json({
      ok: false,
      error: '한 번에 200개 이하만 요청 가능합니다 (Google Indexing API 일일 한도).',
    }, { status: 400 })
  }

  // 글 + 블로그 정보 로드
  const [{ data: posts }, { data: blogs }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, slug, blog_id, status')
      .in('id', postIds)
      .eq('user_id', user.id),
    supabase.from('blogs').select('id, slug, custom_domain').eq('user_id', user.id),
  ])

  const blogById = new Map((blogs ?? []).map(b => [b.id as string, { slug: b.slug as string, custom_domain: b.custom_domain as string | null }]))

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://multi-blog-hub.vercel.app').replace(/\/$/, '')

  const results: { postId: string; url: string; ok: boolean; error?: string }[] = []

  for (const p of (posts ?? []) as { id: string; slug: string | null; blog_id: string; status: string }[]) {
    if (!p.slug || p.status !== 'published') {
      results.push({
        postId: p.id,
        url: '',
        ok: false,
        error: p.status !== 'published' ? '발행되지 않은 글' : 'slug 없음',
      })
      continue
    }
    const blog = blogById.get(p.blog_id)
    if (!blog) {
      results.push({ postId: p.id, url: '', ok: false, error: '블로그 찾을 수 없음' })
      continue
    }
    const url = blog.custom_domain
      ? `https://${blog.custom_domain}/${encodeURIComponent(p.slug)}`
      : `${APP_URL}/blog/${encodeURIComponent(blog.slug)}/${encodeURIComponent(p.slug)}`

    const r = await submitUrlToGoogle(supabase, user.id, url)
    results.push({
      postId: p.id,
      url,
      ok: r.ok,
      error: r.error,
    })

    // Indexing API rate limit 방지 — 약간 간격
    await new Promise(res => setTimeout(res, 100))
  }

  const summary = {
    total: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  }

  return NextResponse.json({ ok: true, summary, results })
}
