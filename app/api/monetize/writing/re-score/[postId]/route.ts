import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runQualityCheck } from '@/lib/monetize/engines/quality-checker'
import { getUserPlanContext, isFeatureEnabled } from '@/lib/plan/server'

/**
 * POST /api/monetize/writing/re-score/[postId]
 * Re-run quality check on a modified post
 */
export async function POST(
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

  // Plan check: Growth plan or above required
  const planCtx = await getUserPlanContext()
  if (!planCtx || !isFeatureEnabled(planCtx, 'auto_writing_pipeline')) {
    return NextResponse.json(
      { error: 'plan_required', minPlan: 'growth' },
      { status: 403 }
    )
  }

  const { postId } = params

  try {
    // Get the scheduled post with all necessary data
    const { data: postRaw, error: getError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        blog_id,
        keyword_id,
        status,
        content_draft,
        intent_type,
        keywords (
          keyword,
          keyword_type,
          intent_type
        ),
        blogs (
          user_id,
          grade
        )
      `
      )
      .eq('id', postId)
      .single()

    if (getError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const postAny = postRaw as any

    // Verify user owns the blog
    if (postAny.blogs.user_id !== user.id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    if (!postRaw.content_draft) {
      return NextResponse.json(
        { error: 'Content draft is empty' },
        { status: 400 }
      )
    }

    // Get ad category for this post's blog
    const { data: adSettings, error: adError } = await supabase
      .from('ad_units')
      .select('ad_category')
      .eq('blog_id', postRaw.blog_id)
      .limit(1)

    const adCategory = adSettings?.[0]?.ad_category || null

    // Run quality check
    const checkResult = await runQualityCheck({
      postId: postRaw.id,
      content: postRaw.content_draft,
      keyword: postAny.keywords?.keyword || 'unknown',
      keywordType: postAny.keywords?.keyword_type || 'gold',
      intentType: postAny.keywords?.intent_type || postRaw.intent_type || 'INFO',
      blogGrade: postAny.blogs.grade || 'B',
      adCategory,
    })

    // If auto-published, update status
    if (checkResult.autoPublished && postRaw.status !== 'published') {
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'auto_published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
    }

    return NextResponse.json({
      data: {
        postId: checkResult.postId,
        checkType: checkResult.checkType,
        totalScore: checkResult.totalScore,
        autoPublished: checkResult.autoPublished,
        reviewReason: checkResult.reviewReason,
        scoreBreakdown: checkResult.scoreBreakdown,
        details: checkResult.details,
        message: checkResult.autoPublished
          ? '자동 발행 기준을 충족하였습니다.'
          : '품질 검수 기준을 충족하지 못했습니다.',
      },
    })
  } catch (error) {
    console.error('Error re-scoring post:', error)
    return NextResponse.json({ error: '재검수 실패' }, { status: 500 })
  }
}
