import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import type { NaverKeywordResult } from '@/lib/monetize/apis/naver-ad-api'
import { GoogleKWPAPI } from '@/lib/monetize/apis/google-kwp-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { scoreKeywords, saveKeywordsToDb, filterByScore, getGradeStats, getAverageScore } from '@/lib/monetize/engines/keyword-scorer'
import type { KeywordApiData } from '@/lib/monetize/engines/keyword-scorer'

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

    const minScore = Math.max(0, Math.min(100, parseInt(minScoreParam || '0', 10)))
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || '50', 10)))

    // Initialize APIs
    const naverAdAPI = new NaverAdAPI()
    const googleKWPAPI = new GoogleKWPAPI()
    const naverDataLabAPI = new NaverDataLabAPI()

    const naverAdReady = await naverAdAPI.initialize(user.id)
    const googleKWPReady = await googleKWPAPI.initialize(user.id)
    const dataLabReady = await naverDataLabAPI.initialize(user.id)

    // 네이버 광고 API가 최소 필수 (한국어 키워드의 핵심 데이터소스)
    if (!naverAdReady) {
      const missingKeys: string[] = []
      if (!naverAdReady) missingKeys.push('네이버 광고 API (API Key + Secret + Customer ID)')
      return NextResponse.json(
        {
          error: `키워드 검색에 필요한 API 키가 없습니다: ${missingKeys.join(', ')}`,
          hint: '설정 > API 키 관리에서 네이버 광고 API 키를 등록하세요.',
        },
        { status: 400 }
      )
    }

    // ────────────────────────────────────────────────────
    // Step 1: 네이버 광고 API 호출 (원본 키워드 그대로 전송)
    //   - hintKeywords로 원본 쿼리를 보내면 연관 키워드를 포함한 결과 반환
    // ────────────────────────────────────────────────────
    let naverResults: NaverKeywordResult[] = []
    let apiErrors: string[] = []

    try {
      naverResults = await naverAdAPI.getKeywordStats([query.trim()])
    } catch (error: any) {
      console.error('[Gold Keywords] Naver API error:', error)
      apiErrors.push(`네이버 광고 API: ${error.message}`)
    }

    // Google KWP는 보조 데이터소스 (사용 가능하면 CPC 보강)
    let googleResults: any[] = []
    try {
      if (googleKWPReady) {
        googleResults = await googleKWPAPI.getKeywordIdeas([query.trim()])
      }
    } catch (error) {
      console.error('[Gold Keywords] Google API error:', error)
    }

    // ────────────────────────────────────────────────────
    // Step 2: 네이버 결과를 KeywordApiData로 변환
    //   - 네이버 API가 반환한 모든 연관 키워드를 활용
    //   - 네이버 API의 monthlyAvgCpc를 CPC 데이터로 사용
    // ────────────────────────────────────────────────────
    const mergedData: KeywordApiData[] = naverResults.map(naver => {
      const googleMatch = googleResults.find(
        g => g.keyword === naver.keyword
      )

      return {
        keyword: naver.keyword,
        monthlySearchVolume: naver.monthlySearchVolume,
        pcSearchVolume: naver.monthlyPcQcCnt,
        mobileSearchVolume: naver.monthlyMobileQcCnt,
        competitionIndex: naver.compIdx === '높음' ? 'HIGH'
          : naver.compIdx === '중간' ? 'MEDIUM' : 'LOW',
        // CPC: 네이버 광고 API의 monthlyAvgCpc 활용 (Google 보조)
        cpcEstimate: googleMatch?.cpcKrw || naver.monthlyAvgCpc || 0,
      }
    })

    // 결과가 비어있으면 API 에러 정보와 함께 반환
    if (mergedData.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        total: 0,
        keywords: [],
        stats: { averageScore: 0, gradeDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 }, minScore, maxScore: 0 },
        savedIds: [],
        apiErrors: apiErrors.length > 0 ? apiErrors : undefined,
      })
    }

    // ────────────────────────────────────────────────────
    // Step 3: DataLab 트렌드 데이터 보강 (원본 쿼리 기준)
    //   - 트렌드 데이터는 원본 키워드에 대해서만 조회
    //   - 연관 키워드들은 동일 트렌드를 상속 (같은 주제이므로)
    // ────────────────────────────────────────────────────
    let trendData: any = null
    try {
      if (dataLabReady) {
        trendData = await naverDataLabAPI.getTrend(query.trim())
      }
    } catch (error) {
      console.error('[Gold Keywords] DataLab API error:', error)
    }

    if (trendData) {
      for (const item of mergedData) {
        item.trendIndex = trendData.trendIndex
        item.yoyGrowth = trendData.yoyGrowth
        item.isSeasonal = trendData.isSeasonal
        item.seasonalMonths = trendData.seasonalMonths
      }
    }

    // ────────────────────────────────────────────────────
    // Step 4: 점수 계산 + 필터링
    // ────────────────────────────────────────────────────
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
      apiErrors: apiErrors.length > 0 ? apiErrors : undefined,
    })
  } catch (error) {
    console.error('[Gold Keywords API] Unexpected error:', error)
    return NextResponse.json(
      { error: '키워드 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
