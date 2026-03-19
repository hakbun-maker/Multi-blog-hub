import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Get user's blog IDs first
    const { data: userBlogs, error: blogsError } = await supabase
      .from('blogs')
      .select('id')
      .eq('user_id', user.id)

    if (blogsError) throw blogsError
    const userBlogIds = userBlogs?.map(b => b.id) || []

    // 1. Pipeline status counts
    let pipelineStatus = {
      pending: 0,
      writing: 0,
      reviewing: 0,
      published: 0,
    }

    if (userBlogIds.length > 0) {
      const { data: posts, error: postsError } = await supabase
        .from('scheduled_posts')
        .select('status')
        .in('blog_id', userBlogIds)

      if (postsError) throw postsError

      if (posts) {
        pipelineStatus = {
          pending: posts.filter(p => p.status === 'pending').length,
          writing: posts.filter(p => p.status === 'writing').length,
          reviewing: posts.filter(p => ['reviewing', 'review_queue'].includes(p.status)).length,
          published: posts.filter(p => ['auto_published', 'published'].includes(p.status)).length,
        }
      }
    }

    // 2. Revenue summary
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split('T')[0]

    let thisMonthTotal = 0
    let lastMonthTotal = 0
    let estimatedTotal = 0

    if (userBlogIds.length > 0) {
      const { data: thisMonthRevenue, error: thisMonthError } = await supabase
        .from('revenue_analytics')
        .select('actual_revenue, estimated_revenue')
        .in('blog_id', userBlogIds)
        .gte('analytics_date', thisMonthStart)

      if (thisMonthError) throw thisMonthError
      thisMonthTotal = thisMonthRevenue?.reduce((sum, r) => sum + (r.actual_revenue || 0), 0) || 0
      estimatedTotal = thisMonthRevenue?.reduce((sum, r) => sum + (r.estimated_revenue || 0), 0) || 0

      const { data: lastMonthRevenue, error: lastMonthError } = await supabase
        .from('revenue_analytics')
        .select('actual_revenue')
        .in('blog_id', userBlogIds)
        .gte('analytics_date', lastMonthStart)
        .lte('analytics_date', lastMonthEnd)

      if (lastMonthError) throw lastMonthError
      lastMonthTotal = lastMonthRevenue?.reduce((sum, r) => sum + (r.actual_revenue || 0), 0) || 0
    }

    const changeRate = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

    // 3. Blog grades
    const { data: blogs, error: blogsListError } = await supabase
      .from('blogs')
      .select('id, name, grade, daily_quota')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (blogsListError) throw blogsListError

    const blogGrades = await Promise.all(
      (blogs || []).map(async (blog) => {
        const { data: revenue, error: revenueError } = await supabase
          .from('revenue_analytics')
          .select('actual_revenue, page_views, rpm')
          .eq('blog_id', blog.id)
          .gte('analytics_date', thisMonthStart)

        if (revenueError) throw revenueError

        // Get post count for this blog
        const { data: posts } = await supabase
          .from('scheduled_posts')
          .select('status')
          .eq('blog_id', blog.id)

        const postCount =
          posts?.filter(p => ['auto_published', 'published'].includes(p.status)).length || 0
        const monthlyRevenue = revenue?.reduce((sum, r) => sum + (r.actual_revenue || 0), 0) || 0
        const avgRpm =
          revenue && revenue.length
            ? revenue.reduce((sum, r) => sum + (r.rpm || 0), 0) / revenue.length
            : 0

        return {
          blogId: blog.id,
          blogName: blog.name,
          grade: blog.grade || 'C',
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
          postCount,
          rpm: Math.round(avgRpm * 100) / 100,
        }
      })
    )

    return NextResponse.json({
      data: {
        pipelineStatus,
        revenueSummary: {
          thisMonth: Math.round(thisMonthTotal * 100) / 100,
          lastMonth: Math.round(lastMonthTotal * 100) / 100,
          estimated: Math.round(estimatedTotal * 100) / 100,
          changeRate: Math.round(changeRate * 100) / 100,
        },
        blogGrades,
      },
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
