import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { GoogleKWPAPI } from '@/lib/monetize/apis/google-kwp-api'
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
    const query = searchParams.get('q')
    const minScoreParam = searchParams.get('minScore')
    const limitParam = searchParams.get('limit')
    const saveToDb = searchParams.get('saveToDb') === 'true'

    // Validate query
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: '검색어는 필수입니다.' },
        { status: 400 }
      )
    }

    const minScore = Math.max(0, Math.min(100, parseInt(minScoreParam || '60', 10)))
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || '50', 10)))

    // Initialize APIs
    const naverAdAPI = new NaverAdAPI()
    const googleKWPAPI = new GoogleKWPAPI()
    const naverDataLabAPI = new NaverDataLabAPI()

    const naverAdReady = await naverAdAPI.initialize(user.id)
    const googleKWPReady = await googleKWPAPI.initialize(user.id)
    const dataLabReady = await naverDataLabAPI.initialize(user.id)

    if (!naverAdReady && !googleKWPReady) {
      return NextResponse.json(
        { error: '등록된 API 키가 없습니다. 먼저 API 키를 등록하세요.' },
        { status: 400 }
      )
    }

    // Fetch data from APIs
    const keywordsList: string[] = [query]

    let naverResults: any[] = []
    let googleResults: any[] = []
    let trendData: any = null

    try {
      if (naverAdReady) {
        naverResults = await naverAdAPI.getKeywordStats(keywordsList)
      }
    } catch (error) {
      console.error('[Gold Keywords] Naver API error:', error)
    }

    try {
      if (googleKWPReady) {
        googleResults = await googleKWPAPI.getKeywordIdeas(keywordsList)
      }
    } catch (error) {
      console.error('[Gold Keywords] Google API error:', error)
    }

    try {
      if (dataLabReady) {
        trendData = await naverDataLabAPI.getTrend(query)
      }
    } catch (error) {
      console.error('[Gold Keywords] DataLab API error:', error)
    }

    // Merge and score results
    const mergedData = query.split(' ').map(kw => {
      const naver = naverResults.find(r => r.keyword === kw)
      const google = googleResults.find(r => r.keyword === kw)

      return {
        keyword: kw,
        monthlySearchVolume: naver?.monthlySearchVolume || google?.avgMonthlySearches || 0,
        competitionIndex: naver?.competitionIndex || 'MEDIUM',
        cpcEstimate: google?.cpcKrw || naver?.cpcEstimate || 0,
        trendIndex: trendData?.trendIndex || 50,
        yoyGrowth: trendData?.yoyGrowth || 0,
        isSeasonal: trendData?.isSeasonal || false,
        seasonalMonths: trendData?.seasonalMonths || null,
      }
    })

    const scoredKeywords = scoreKeywords(mergedData, 'gold')
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
          query,
          keyword_type: 'gold',
          result_count: filteredKeywords.length,
          top_score: filteredKeywords[0]?.revenueScore.total || 0,
          saved_count: savedIds.length,
        })
    } catch (error) {
      console.error('[Gold Keywords] Failed to log search history:', error)
    }

    // Calculate stats
    const gradeStats = getGradeStats(filteredKeywords)
    const averageScore = getAverageScore(filteredKeywords)

    return NextResponse.json({
      success: true,
      query,
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
    console.error('[Gold Keywords API] Unexpected error:', error)
    return NextResponse.json(
      { error: '키워드 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
