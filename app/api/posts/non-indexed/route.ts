/**
 * GET /api/posts/non-indexed
 *
 * 색인되지 않은 글 목록 (verdict = FAIL/NEUTRAL/null + 미검사 글).
 * 미색인 글 수정 패널에서 사용.
 *
 * 응답: { posts: [...], blogs: [...] }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getFixGuide } from '@/lib/google/indexing-fix-guide'

export const dynamic = 'force-dynamic'

interface NonIndexedPost {
  id: string
  title: string | null
  slug: string | null
  blogId: string
  blogName: string
  blogSlug: string | null
  blogCustomDomain: string | null
  publishedAt: string | null
  indexingVerdict: string | null
  indexingCoverageState: string | null
  indexingInspectedAt: string | null
  indexingLastCrawlAt: string | null
  // 가이드 정보 (서버 계산해서 클라이언트에 전달)
  fixGuide: {
    state: string
    severity: string
    reasonShort: string
    reasonDetail: string
    fixAction: string
    canRetry: boolean
  }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const [{ data: rawPosts }, { data: blogs }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, slug, blog_id, published_at, indexing_verdict, indexing_coverage_state, indexing_inspected_at, indexing_last_crawl_at')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase
      .from('blogs')
      .select('id, name, slug, custom_domain')
      .eq('user_id', user.id),
  ])

  const blogById = new Map((blogs ?? []).map(b => [b.id as string, b]))

  // 색인된 글(PASS/PARTIAL)은 제외하고 나머지 모두 표시
  const filtered = (rawPosts ?? []).filter(p => {
    const v = p.indexing_verdict as string | null
    return v !== 'PASS' && v !== 'PARTIAL'
  })

  const posts: NonIndexedPost[] = filtered.map(p => {
    const blog = blogById.get(p.blog_id as string)
    const guide = getFixGuide(
      (p.indexing_verdict as string | null) ?? null,
      (p.indexing_coverage_state as string | null) ?? null,
    )
    return {
      id: p.id as string,
      title: p.title as string | null,
      slug: p.slug as string | null,
      blogId: p.blog_id as string,
      blogName: blog?.name ?? '',
      blogSlug: blog?.slug ?? null,
      blogCustomDomain: blog?.custom_domain ?? null,
      publishedAt: p.published_at as string | null,
      indexingVerdict: (p.indexing_verdict as string | null) ?? null,
      indexingCoverageState: (p.indexing_coverage_state as string | null) ?? null,
      indexingInspectedAt: (p.indexing_inspected_at as string | null) ?? null,
      indexingLastCrawlAt: (p.indexing_last_crawl_at as string | null) ?? null,
      fixGuide: { ...guide },
    }
  })

  return NextResponse.json({
    posts,
    blogs: (blogs ?? []).map(b => ({ id: b.id, name: b.name, slug: b.slug, custom_domain: b.custom_domain })),
  })
}
