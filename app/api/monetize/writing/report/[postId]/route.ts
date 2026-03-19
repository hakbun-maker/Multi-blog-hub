import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/monetize/writing/report/[postId]
 * Returns detailed quality check report for a specific post
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
    // Get scheduled post
    const { data: postRaw, error: postError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        blog_id,
        status,
        keyword_id,
        content_draft,
        scheduled_date,
        scheduled_time,
        intent_type,
        intent_fit_score,
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
          revenue_score
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

    // Get quality scores (should be just one)
    const qualityScores = postAny.post_quality_scores[0] || null

    return NextResponse.json({
      data: {
        postId: postRaw.id,
        blogId: postRaw.blog_id,
        blogName: postAny.blogs.name,
        status: postRaw.status,
        keyword: postAny.keywords?.keyword || 'N/A',
        keywordType: postAny.keywords?.keyword_type || 'N/A',
        intentType: postAny.keywords?.intent_type || postRaw.intent_type,
        scheduledDate: postRaw.scheduled_date,
        scheduledTime: postRaw.scheduled_time,
        contentLength: postRaw.content_draft?.length || 0,
        qualityScore: qualityScores
          ? {
              checkType: qualityScores.check_type,
              totalScore: calculateTotalScore(qualityScores),
              discoveryScore: qualityScores.discovery_score,
              persuasionScore: qualityScores.persuasion_score,
              conversionScore: qualityScores.conversion_score,
              eventScore: qualityScores.event_score,
              techScore: qualityScores.tech_score,
              autoPublished: qualityScores.auto_published,
              reviewReason: qualityScores.review_reason,
              breakdown: qualityScores.score_breakdown,
              createdAt: qualityScores.created_at,
            }
          : null,
        createdAt: postRaw.created_at,
        updatedAt: postRaw.updated_at,
      },
    })
  } catch (error) {
    console.error('Error fetching quality report:', error)
    return NextResponse.json({ error: '리포트 조회 실패' }, { status: 500 })
  }
}

function calculateTotalScore(qualityScores: any): number {
  const standard =
    (qualityScores.discovery_score || 0) +
    (qualityScores.persuasion_score || 0) +
    (qualityScores.conversion_score || 0)

  const event = (qualityScores.event_score || 0) + (qualityScores.tech_score || 0)

  return standard || event || 0
}
