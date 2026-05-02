import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getValidGoogleToken } from '@/lib/google/token-refresh'
import { fetchGa4PageViews } from '@/lib/google/ga4-data'

export const dynamic = 'force-dynamic'

/**
 * 블로그의 글별 GA4 page views 조회.
 *
 * Query params:
 *  - blogId (required)
 *  - days (optional, default 30, max 90)
 *
 * 응답:
 *  {
 *    source: 'ga4' | 'fallback',
 *    bySlug: { [post_slug]: views },
 *    error?: string
 *  }
 *
 * 동작:
 *  1) blogs.ga4_property_id가 있고 google_analytics OAuth 토큰이 유효하면 GA4 Data API 호출
 *     → pagePath별 page views 조회 후 post.slug 기준으로 매핑
 *  2) GA4 미연결/실패 시 source='fallback' + 빈 객체 반환 (UI는 자체 view_count로 fallback)
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const blogId = searchParams.get('blogId')
  if (!blogId) return NextResponse.json({ error: 'blogId 필요' }, { status: 400 })

  const days = Math.max(1, Math.min(90, parseInt(searchParams.get('days') ?? '30', 10) || 30))

  // 블로그 + 소속 글 조회
  const [{ data: blog }, { data: posts }] = await Promise.all([
    supabase
      .from('blogs')
      .select('id, slug, custom_domain, ga4_property_id')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('posts')
      .select('id, slug')
      .eq('blog_id', blogId)
      .eq('user_id', user.id)
      .eq('status', 'published'),
  ])

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  // GA4 미연결 → fallback
  if (!blog.ga4_property_id) {
    return NextResponse.json({ source: 'fallback', bySlug: {}, error: 'GA4 property 미연결' })
  }

  const accessToken = await getValidGoogleToken(user.id)
  if (!accessToken) {
    return NextResponse.json({ source: 'fallback', bySlug: {}, error: 'Google 토큰 없음' })
  }

  // GA4 page views 조회 (지난 N일)
  const startDate = `${days - 1}daysAgo`
  const result = await fetchGa4PageViews(blog.ga4_property_id, accessToken, startDate, 'today')
  if (result.error) {
    return NextResponse.json({ source: 'fallback', bySlug: {}, error: result.error })
  }

  // post.slug 기준으로 매핑 — pagePath의 마지막 segment가 post.slug와 일치
  // 가능한 path 패턴:
  //   - 커스텀 도메인: /{post.slug} 또는 /{post.slug}/
  //   - 기본 도메인: /blog/{blog.slug}/{post.slug} 또는 그 변형
  // 단순화: pagePath 끝에 post.slug가 정확히 있는 모든 row 합산
  const bySlug: Record<string, number> = {}
  for (const post of posts ?? []) {
    if (!post.slug) continue
    let total = 0
    for (const [path, views] of Object.entries(result.byPath)) {
      // path를 정규화: 마지막 / 제거, 쿼리 제거
      const normalized = path.replace(/\?.*$/, '').replace(/\/+$/, '')
      const lastSegment = normalized.split('/').filter(Boolean).pop()
      if (lastSegment === post.slug) {
        total += views
      }
    }
    if (total > 0) bySlug[post.slug] = total
  }

  return NextResponse.json({
    source: 'ga4',
    days,
    bySlug,
  })
}
