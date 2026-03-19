import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { scoreKeywords, saveKeywordsToDb, filterByScore, getGradeStats, getAverageScore } from '@/lib/monetize/engines/keyword-scorer'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minScoreParam = searchParams.get('minScore')
    const limitParam = searchParams.get('limit')
    const saveToDb = searchParams.get('saveToDb') === 'true'

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate와 endDate는 필수입니다. (YYYY-MM-DD 형식)' },
        { status: 400 }
      )
    }

    // Validate date format
    const startRegex = /^\d{4}-\d{2}-\d{2}$/
    const endRegex = /^\d{4}-\d{2}-\d{2}$/

    if (!startRegex.test(startDate) || !endRegex.test(endDate)) {
      return NextResponse.json(
        { error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      return NextResponse.json(
        { error: 'startDate는 endDate보다 작거나 같아야 합니다.' },
        { status: 400 }
      )
    }

    const minScore = Math.max(0, Math.min(100, parseInt(minScoreParam || '60', 10)))
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || '50', 10)))

    // Initialize DataLab API
    const naverDataLabAPI = new NaverDataLabAPI()
    const dataLabReady = await naverDataLabAPI.initialize(user.id)

    if (!dataLabReady) {
      return NextResponse.json(
        { error: 'Naver DataLab API 키가 등록되지 않았습니다.' },
        { status: 400 }
      )
    }

    // Fetch event keywords
    const eventKeywords = await naverDataLabAPI.getEventKeywords(startDate, endDate)

    if (eventKeywords.length === 0) {
      return NextResponse.json({
        success: true,
        startDate,
        endDate,
        total: 0,
        keywords: [],
        stats: {
          averageScore: 0,
          gradeDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
        },
        message: '해당 기간에 이벤트 키워드가 없습니다.',
      })
    }

    // Score event keywords
    // For event keywords, we assign higher trend scores and shorter trend cycles
    const scoredKeywords = scoreKeywords(
      eventKeywords.map(ek => ({
        keyword: ek.keyword,
        monthlySearchVolume: 5000, // Default estimate for events
        competitionIndex: 'MEDIUM',
        cpcEstimate: 1500, // Higher CPC for events
        trendIndex: 75, // Events have high trend score
        isSeasonal: false,
      })),
      'event'
    )

    const filteredKeywords = filterByScore(scoredKeywords, minScore).slice(0, limit)

    // Save to database if requested
    let savedIds: string[] = []
    if (saveToDb && filteredKeywords.length > 0) {
      savedIds = await saveKeywordsToDb(user.id, filteredKeywords)
    }

    // Log search history
    try {
      await supabase
        .from('keyword_search_history')
        .insert({
          user_id: user.id,
          query: `Events: ${startDate} to ${endDate}`,
          keyword_type: 'event',
          result_count: filteredKeywords.length,
          top_score: filteredKeywords[0]?.revenueScore.total || 0,
          saved_count: savedIds.length,
        })
    } catch (error) {
      console.error('[Event Keywords] Failed to log search history:', error)
    }

    // Calculate stats
    const gradeStats = getGradeStats(filteredKeywords)
    const averageScore = getAverageScore(filteredKeywords)

    return NextResponse.json({
      success: true,
      startDate,
      endDate,
      total: filteredKeywords.length,
      keywords: filteredKeywords,
      stats: {
        averageScore,
        gradeDistribution: gradeStats,
        minScore,
        maxScore: filteredKeywords[0]?.revenueScore.total || 0,
      },
      savedIds,
    })
  } catch (error) {
    console.error('[Event Keywords API] Unexpected error:', error)
    return NextResponse.json(
      { error: '이벤트 키워드 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
