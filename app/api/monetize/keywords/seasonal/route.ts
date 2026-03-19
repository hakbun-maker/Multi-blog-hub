import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { GoogleKWPAPI } from '@/lib/monetize/apis/google-kwp-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { scoreKeywords, saveKeywordsToDb, filterByScore, getGradeStats, getAverageScore } from '@/lib/monetize/engines/keyword-scorer'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'

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
    const monthParam = searchParams.get('month')
    const minScoreParam = searchParams.get('minScore')
    const limitParam = searchParams.get('limit')
    const saveToDb = searchParams.get('saveToDb') === 'true'

    // Validate month
    if (!monthParam) {
      return NextResponse.json(
        { error: 'month는 필수입니다. (1-12)' },
        { status: 400 }
      )
    }

    const month = parseInt(monthParam, 10)

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: '월(month)은 1-12 사이의 숫자여야 합니다.' },
        { status: 400 }
      )
    }

    const minScore = Math.max(0, Math.min(100, parseInt(minScoreParam || '60', 10)))
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || '50', 10)))

    // Get seasonal events for the month
    const seasonalEvent = ANNUAL_EVENTS.find(ae => ae.month === month)

    if (!seasonalEvent || seasonalEvent.events.length === 0) {
      return NextResponse.json({
        success: true,
        month,
        total: 0,
        keywords: [],
        stats: {
          averageScore: 0,
          gradeDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
        },
        message: `${month}월에 등록된 시즌 이벤트가 없습니다.`,
      })
    }

    // Initialize APIs
    const naverAdAPI = new NaverAdAPI()
    const googleKWPAPI = new GoogleKWPAPI()
    const naverDataLabAPI = new NaverDataLabAPI()

    const naverAdReady = await naverAdAPI.initialize(user.id)
    const googleKWPReady = await googleKWPAPI.initialize(user.id)
    const dataLabReady = await naverDataLabAPI.initialize(user.id)

    // Get keywords list for current and nearby months
    const eventKeywords = seasonalEvent.events

    if (eventKeywords.length === 0) {
      return NextResponse.json({
        success: true,
        month,
        total: 0,
        keywords: [],
        stats: {
          averageScore: 0,
          gradeDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
        },
      })
    }

    // Fetch data from APIs
    let naverResults: any[] = []
    let googleResults: any[] = []
    let trendDataMap: Record<string, any> = {}

    try {
      if (naverAdReady) {
        naverResults = await naverAdAPI.getKeywordStats(eventKeywords)
      }
    } catch (error) {
      console.error('[Seasonal Keywords] Naver API error:', error)
    }

    try {
      if (googleKWPReady) {
        googleResults = await googleKWPAPI.getKeywordIdeas(eventKeywords)
      }
    } catch (error) {
      console.error('[Seasonal Keywords] Google API error:', error)
    }

    try {
      if (dataLabReady) {
        for (const keyword of eventKeywords) {
          try {
            const trendData = await naverDataLabAPI.getTrend(keyword)
            trendDataMap[keyword] = trendData
          } catch (error) {
            console.error(`[Seasonal Keywords] DataLab API error for "${keyword}":`, error)
          }
        }
      }
    } catch (error) {
      console.error('[Seasonal Keywords] DataLab API initialization error:', error)
    }

    // Merge and score results
    const mergedData = eventKeywords.map(kw => {
      const naver = naverResults.find(r => r.keyword === kw)
      const google = googleResults.find(r => r.keyword === kw)
      const trend = trendDataMap[kw]

      return {
        keyword: kw,
        monthlySearchVolume: naver?.monthlySearchVolume || google?.avgMonthlySearches || 8000,
        competitionIndex: naver?.competitionIndex || 'MEDIUM',
        cpcEstimate: google?.cpcKrw || naver?.cpcEstimate || 1200,
        trendIndex: trend?.trendIndex || 70,
        yoyGrowth: trend?.yoyGrowth || 0,
        isSeasonal: trend?.isSeasonal || true,
        seasonalMonths: trend?.seasonalMonths || [month],
      }
    })

    const scoredKeywords = scoreKeywords(mergedData, 'seasonal')
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
          query: `Seasonal: Month ${month}`,
          keyword_type: 'seasonal',
          result_count: filteredKeywords.length,
          top_score: filteredKeywords[0]?.revenueScore.total || 0,
          saved_count: savedIds.length,
        })
    } catch (error) {
      console.error('[Seasonal Keywords] Failed to log search history:', error)
    }

    // Calculate stats
    const gradeStats = getGradeStats(filteredKeywords)
    const averageScore = getAverageScore(filteredKeywords)

    return NextResponse.json({
      success: true,
      month,
      events: seasonalEvent.events,
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
    console.error('[Seasonal Keywords API] Unexpected error:', error)
    return NextResponse.json(
      { error: '시즌 키워드 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
