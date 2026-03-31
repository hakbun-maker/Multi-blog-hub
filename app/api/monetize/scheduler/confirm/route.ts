import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmDistribution } from '@/lib/monetize/engines/distribution-engine'
import type { Keyword } from '@/types/monetize'

export const runtime = 'nodejs'

interface PreviewItem {
  keywordId: string
  keyword: string
  keywordGrade: string
  intentType: string
  blogId: string
  blogName: string
  blogGrade: string
  scheduledDate: string
  scheduledTime: string
  intentFitScore: number
  reason: string
}

interface ConfirmRequest {
  previews?: PreviewItem[]
  keywordIds?: string[]
  category?: string
  excludeWarnedBlogs?: boolean
}

/**
 * POST /api/monetize/scheduler/confirm
 * Confirm and apply distribution (creates scheduled_posts + blog_keyword_assignments)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as ConfirmRequest

    // If previews are provided directly, use them (skip engine re-run)
    if (body.previews && Array.isArray(body.previews) && body.previews.length > 0) {
      // Validate ownership: all blogIds must belong to the user
      const blogIds = Array.from(new Set(body.previews.map(p => p.blogId)))
      const { data: userBlogs } = await supabase
        .from('blogs')
        .select('id')
        .eq('user_id', user.id)
        .in('id', blogIds)

      const validBlogIds = new Set((userBlogs ?? []).map(b => b.id))
      const validPreviews = body.previews.filter(p => validBlogIds.has(p.blogId))

      if (validPreviews.length === 0) {
        return NextResponse.json({ error: '유효한 배분 항목이 없습니다' }, { status: 400 })
      }

      // Insert scheduled_posts
      const scheduledPostInserts = validPreviews.map(p => ({
        blog_id: p.blogId,
        keyword_id: p.keywordId,
        scheduled_date: p.scheduledDate,
        scheduled_time: p.scheduledTime,
        status: 'pending' as const,
        writing_mode: 'auto' as const,
        intent_type: p.intentType,
        intent_fit_score: p.intentFitScore,
      }))

      const { error: postsError } = await supabase
        .from('scheduled_posts')
        .insert(scheduledPostInserts)

      if (postsError) {
        return NextResponse.json({ error: `스케줄 저장 실패: ${postsError.message}` }, { status: 500 })
      }

      // Insert blog_keyword_assignments
      const now = new Date()
      const assignmentInserts = validPreviews.map(p => ({
        blog_id: p.blogId,
        keyword_id: p.keywordId,
        assigned_date: now.toISOString().split('T')[0],
        assigned_time: now.toISOString().split('T')[1].slice(0, 5),
        assignment_reason: p.reason,
        is_confirmed: true,
        intent_type: p.intentType,
        intent_fit_score: p.intentFitScore,
      }))

      const { error: assignError } = await supabase
        .from('blog_keyword_assignments')
        .insert(assignmentInserts)

      if (assignError) {
        console.error('[Confirm] Assignment insert error:', assignError)
      }

      return NextResponse.json({
        success: true,
        count: validPreviews.length,
        assignments: validPreviews,
      })
    }

    // Fallback: re-run engine (legacy flow)
    // Fetch keywords
    let keywordsQuery = supabase
      .from('keywords')
      .select('*')
      .eq('user_id', user.id)

    if (body.keywordIds && body.keywordIds.length > 0) {
      keywordsQuery = keywordsQuery.in('id', body.keywordIds)
    }

    const { data: keywords, error: keywordError } = await keywordsQuery

    if (keywordError) {
      return NextResponse.json(
        { error: `키워드 조회 실패: ${keywordError.message}` },
        { status: 400 }
      )
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: '배정할 키워드가 없습니다' },
        { status: 400 }
      )
    }

    // Fetch blogs
    let blogsQuery = supabase
      .from('blogs')
      .select('id, name, grade, category, is_warned, daily_limit')
      .eq('user_id', user.id)

    if (body.category) {
      blogsQuery = blogsQuery.eq('category', body.category)
    }

    const { data: blogs, error: blogError } = await blogsQuery

    if (blogError) {
      return NextResponse.json(
        { error: `블로그 조회 실패: ${blogError.message}` },
        { status: 400 }
      )
    }

    if (!blogs || blogs.length === 0) {
      return NextResponse.json(
        { error: '사용 가능한 블로그가 없습니다' },
        { status: 400 }
      )
    }

    // Convert DB data to app types
    const typedKeywords: Keyword[] = keywords.map(k => ({
      id: k.id,
      userId: k.user_id,
      keyword: k.keyword,
      keywordType: k.keyword_type,
      intentType: k.intent_type,
      revenueScore: k.revenue_score,
      keywordGrade: k.keyword_grade,
      monthlySearchVolume: k.monthly_search_volume,
      cpcEstimate: k.cpc_estimate,
      competitionScore: k.competition_score,
      trendIndex: k.trend_index,
      isSeasonal: k.is_seasonal,
      seasonalMonths: k.seasonal_months,
      expiresAt: k.expires_at,
      createdAt: k.created_at,
    }))

    const typedBlogs = blogs.map(b => ({
      id: b.id,
      name: b.name,
      grade: b.grade,
      category: b.category,
      isWarned: b.is_warned,
      dailyLimit: b.daily_limit,
    }))

    // Run distribution and create records
    const assignments = await confirmDistribution({
      userId: user.id,
      keywords: typedKeywords,
      blogs: typedBlogs,
      category: body.category,
      excludeWarnedBlogs: body.excludeWarnedBlogs !== false,
    })

    return NextResponse.json({
      success: true,
      count: assignments.length,
      assignments,
    })
  } catch (error) {
    console.error('[Distribution Confirm Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '배정 적용 실패',
      },
      { status: 500 }
    )
  }
}
