import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { blogId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { blogId } = params
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '30')

  const [{ data: blog }, { data: posts }] = await Promise.all([
    supabase.from('blogs').select('id, name, color').eq('id', blogId).eq('user_id', user.id).single(),
    supabase.from('posts').select('id, title, status, view_count, published_at').eq('blog_id', blogId).eq('user_id', user.id),
  ])

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  const allPosts = posts ?? []
  const published = allPosts.filter(p => p.status === 'published')
  const totalViews = allPosts.reduce((s, p) => s + (p.view_count ?? 0), 0)
  const estimatedRevenue = parseFloat(((totalViews / 1000) * 1).toFixed(2))

  const topPosts = [...published]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      title: p.title,
      view_count: p.view_count ?? 0,
      published_at: p.published_at,
    }))

  return NextResponse.json({
    data: {
      blog_id: blog.id,
      blog_name: blog.name,
      color: blog.color ?? '#6366f1',
      total_views: totalViews,
      total_posts: published.length,
      avg_views_per_post: published.length > 0 ? Math.round(totalViews / published.length) : 0,
      estimated_revenue: estimatedRevenue,
      top_posts: topPosts,
      period_days: days,
    },
  })
}
