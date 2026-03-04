import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '30')

  const [{ data: posts }, { data: blogs }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, blog_id, title, status, view_count, published_at')
      .eq('user_id', user.id),
    supabase
      .from('blogs')
      .select('id, name, color')
      .eq('user_id', user.id),
  ])

  const allPosts = posts ?? []
  const allBlogs = blogs ?? []

  const published = allPosts.filter(p => p.status === 'published')
  const totalViews = allPosts.reduce((s, p) => s + (p.view_count ?? 0), 0)
  const totalPosts = published.length
  const avgViews = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0
  // 예상 수익: 1000 view당 $1 CPM 가정
  const estimatedRevenue = (totalViews / 1000) * 1

  // 블로그명 맵
  const blogNameMap: Record<string, string> = {}
  for (const b of allBlogs) {
    blogNameMap[b.id] = b.name
  }

  // 블로그별 통계
  const blogStats = allBlogs.map(blog => {
    const bp = allPosts.filter(p => p.blog_id === blog.id)
    const views = bp.reduce((s, p) => s + (p.view_count ?? 0), 0)
    return {
      blog_id: blog.id,
      blog_name: blog.name,
      color: blog.color ?? '#6366f1',
      views,
      posts: bp.filter(p => p.status === 'published').length,
      revenue: parseFloat(((views / 1000) * 1).toFixed(2)),
    }
  })

  // Top 10 게시글
  const topPosts = [...published]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      title: p.title,
      view_count: p.view_count ?? 0,
      blog_name: blogNameMap[p.blog_id] ?? '',
      published_at: p.published_at,
    }))

  return NextResponse.json({
    data: {
      total_views: totalViews,
      total_posts: totalPosts,
      avg_views_per_post: avgViews,
      estimated_revenue: parseFloat(estimatedRevenue.toFixed(2)),
      blogs: blogStats,
      top_posts: topPosts,
    },
  })
}
