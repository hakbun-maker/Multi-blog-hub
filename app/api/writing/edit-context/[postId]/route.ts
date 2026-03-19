import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/writing/edit-context/[postId]
 * Load edit context for monetize editor.
 * Returns: post data + quality scores + keyword info + blog info
 */
export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const supabase = createClient()

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const { postId } = params

  try {
    // Get scheduled post with relations
    const { data: postRaw, error: postError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        blog_id,
        keyword_id,
        status,
        content_draft,
        intent_type,
        intent_fit_score,
        scheduled_date,
        scheduled_time,
        created_at,
        updated_at,
        blogs (
          id,
          user_id,
          name
        ),
        keywords (
          id,
          keyword,
          keyword_type,
          intent_type,
          keyword_grade
        ),
        post_quality_scores (
          id,
          check_type,
          discovery_score,
          persuasion_score,
          conversion_score,
          event_score,
          tech_score,
          total_score,
          auto_published,
          review_reason,
          score_breakdown,
          created_at
        )
      `
      )
      .eq('id', postId)
      .single()

    if (postError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const postAny = postRaw as any

    // Verify user owns the blog
    if (postAny.blogs.user_id !== user.id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const qualityScore = postAny.post_quality_scores?.[0]

    return NextResponse.json({
      data: {
        postId: postRaw.id,
        keyword: postAny.keywords?.keyword || 'N/A',
        keywordGrade: postAny.keywords?.keyword_grade,
        intentType: postAny.keywords?.intent_type || postRaw.intent_type,
        keywordType: postAny.keywords?.keyword_type,
        blogName: postAny.blogs.name,
        blogId: postRaw.blog_id,
        status: postRaw.status,
        content: postRaw.content_draft || '',
        score: qualityScore?.total_score,
        qualityScore: qualityScore
          ? {
              checkType: qualityScore.check_type,
              totalScore: qualityScore.total_score,
              discoveryScore: qualityScore.discovery_score,
              persuasionScore: qualityScore.persuasion_score,
              conversionScore: qualityScore.conversion_score,
              eventScore: qualityScore.event_score,
              techScore: qualityScore.tech_score,
              autoPublished: qualityScore.auto_published,
              reviewReason: qualityScore.review_reason,
              breakdown: qualityScore.score_breakdown,
              createdAt: qualityScore.created_at,
            }
          : null,
        scheduledDate: postRaw.scheduled_date,
        scheduledTime: postRaw.scheduled_time,
        createdAt: postRaw.created_at,
        updatedAt: postRaw.updated_at,
      },
    })
  } catch (error) {
    console.error('Error fetching edit context:', error)
    return NextResponse.json({ error: '에디터 컨텍스트 로드 실패' }, { status: 500 })
  }
}
