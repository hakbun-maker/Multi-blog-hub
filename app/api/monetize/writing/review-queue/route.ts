import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/monetize/writing/review-queue
 * Returns list of posts in review_queue status with quality scores
 */
export async function GET(request: Request) {
  const supabase = createClient()

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  try {
    // Get posts in review_queue status
    const { data: posts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        status,
        keyword_id,
        content_draft,
        scheduled_date,
        scheduled_time,
        intent_type,
        created_at,
        updated_at,
        keywords (
          id,
          keyword,
          keyword_type,
          intent_type
        ),
        post_quality_scores (
          id,
          check_type,
          discovery_score,
          persuasion_score,
          conversion_score,
          event_score,
          tech_score,
          auto_published,
          review_reason,
          score_breakdown,
          created_at
        )
      `
      )
      .eq('status', 'review_queue')
      .order('created_at', { ascending: false })

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 })
    }

    // Filter by user's blogs
    const { data: userBlogs, error: blogsError } = await supabase
      .from('blogs')
      .select('id')
      .eq('user_id', user.id)

    if (blogsError) {
      return NextResponse.json({ error: blogsError.message }, { status: 500 })
    }

    const blogIds = userBlogs?.map(b => b.id) || []

    // Filter posts to only user's blogs
    const { data: filteredPosts, error: filterError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        status,
        keyword_id,
        content_draft,
        scheduled_date,
        scheduled_time,
        intent_type,
        created_at,
        updated_at,
        keywords (
          id,
          keyword,
          keyword_type,
          intent_type
        ),
        post_quality_scores (
          id,
          check_type,
          discovery_score,
          persuasion_score,
          conversion_score,
          event_score,
          tech_score,
          auto_published,
          review_reason,
          score_breakdown,
          created_at
        )
      `
      )
      .eq('status', 'review_queue')
      .in('blog_id', blogIds)
      .order('created_at', { ascending: false })

    if (filterError) {
      return NextResponse.json({ error: filterError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: filteredPosts || [],
      count: (filteredPosts || []).length,
    })
  } catch (error) {
    console.error('Error fetching review queue:', error)
    return NextResponse.json({ error: '리뷰 큐 조회 실패' }, { status: 500 })
  }
}
