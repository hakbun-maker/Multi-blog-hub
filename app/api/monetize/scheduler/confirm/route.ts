import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmDistribution } from '@/lib/monetize/engines/distribution-engine'
import type { Keyword } from '@/types/monetize'

export const runtime = 'nodejs'

interface ConfirmRequest {
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
