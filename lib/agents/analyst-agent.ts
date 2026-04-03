/**
 * Analyst 에이전트 — 발굴된 키워드를 분석하고 점수를 매깁니다.
 * discovered → scored 단계로 전환합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { scoreKeywords, filterByScore } from '@/lib/monetize/engines/keyword-scorer'
import type { KeywordApiData } from '@/lib/monetize/engines/keyword-scorer'
import type { AgentRunResult } from './types'

export async function runAnalystAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'analyst', async () => {
    const supabase = getServiceClient()

    // 1. discovered 단계 키워드 가져오기
    const { data: pending } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', userId)
      .eq('stage', 'discovered')
      .order('created_at', { ascending: true })
      .limit(50)

    if (!pending || pending.length === 0) return { analyzed: 0, scored: 0 }

    // 2. API 키 조회
    const { data: apiKeys } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key, encrypted_secret')
      .eq('user_id', userId)
      .in('provider', ['naver_ad', 'naver_search'])
      .eq('is_active', true)

    const naverAdKey = apiKeys?.find(k => k.provider === 'naver_ad')
    const naverSearchKey = apiKeys?.find(k => k.provider === 'naver_search')

    // 3. 네이버 광고 API로 검색량/경쟁도 조회
    const keywordTexts = pending.map(p => p.keyword_text)
    let adDataMap = new Map<string, { volume: number; compIdx: string }>()

    if (naverAdKey) {
      try {
        const naverAd = new NaverAdAPI()
        naverAd.initializeWithKeys(naverAdKey.encrypted_key, naverAdKey.encrypted_secret)
        const results = await naverAd.getKeywordStats(keywordTexts.slice(0, 30))
        for (const r of results) {
          adDataMap.set(r.keyword, {
            volume: NaverAdAPI.getTotalSearchVolume(r),
            compIdx: r.compIdx ?? '중간',
          })
        }
      } catch (err) {
        console.error('[Analyst] Naver Ad error:', err)
      }
    }

    // 4. 트렌드 데이터 조회
    const trendMap = new Map<string, number>()
    if (naverSearchKey) {
      try {
        const dataLab = new NaverDataLabAPI()
        dataLab.initializeWithKeys(naverSearchKey.encrypted_key, naverSearchKey.encrypted_secret)
        // 상위 5개만 트렌드 조회 (API 호출 제한)
        for (const kw of keywordTexts.slice(0, 5)) {
          try {
            const trend = await dataLab.getTrend(kw)
            trendMap.set(kw, trend?.trendIndex ?? 50)
          } catch { /* non-fatal */ }
        }
      } catch (err) {
        console.error('[Analyst] DataLab error:', err)
      }
    }

    // 5. 점수 계산
    const apiDataList: KeywordApiData[] = pending.map(p => {
      const ad = adDataMap.get(p.keyword_text)
      const compIdx = ad?.compIdx ?? '중간'
      let competitionIndex = 'MEDIUM'
      if (compIdx === '높음') competitionIndex = 'HIGH'
      else if (compIdx === '낮음') competitionIndex = 'LOW'

      // API 데이터가 있으면 실제값 사용, 없으면 키워드 특성 기반 추정
      const hasApiData = !!ad
      const volume = ad?.volume ?? p.monthly_search_volume ?? 0

      // API 없을 때: 키워드 길이/단어수로 경쟁도 추정 (롱테일 = 경쟁 낮음)
      const wordCount = p.keyword_text.split(/\s+/).length
      const estimatedCompetition = !hasApiData
        ? (wordCount >= 3 ? 'LOW' : wordCount >= 2 ? 'MEDIUM' : 'HIGH')
        : competitionIndex

      // API 없을 때: 롱테일 키워드는 높은 CPC 추정 (구매 의도 높음)
      const estimatedCpc = hasApiData ? 1500
        : wordCount >= 3 ? 2500  // 롱테일 = 구매 의도 높음
        : wordCount >= 2 ? 1800
        : 800

      // API 없을 때: 검색량 추정 (롱테일은 중간 검색량)
      const estimatedVolume = volume > 0 ? volume
        : wordCount >= 3 ? 3000
        : wordCount >= 2 ? 5000
        : 8000

      return {
        keyword: p.keyword_text,
        monthlySearchVolume: estimatedVolume,
        competitionIndex: estimatedCompetition,
        cpcEstimate: estimatedCpc,
        trendIndex: trendMap.get(p.keyword_text) ?? (wordCount >= 2 ? 65 : 45),
      }
    })

    const scored = scoreKeywords(apiDataList, 'gold')
    let scoredCount = 0

    // 6. 파이프라인 업데이트 (scored 단계로)
    for (const sk of scored) {
      const pipeline = pending.find(p => p.keyword_text === sk.keyword)
      if (!pipeline) continue

      await supabase
        .from('keyword_pipeline')
        .update({
          stage: 'scored',
          revenue_score: sk.revenueScore.total,
          keyword_grade: sk.revenueScore.grade,
          intent_type: sk.intentType,
          monthly_search_volume: sk.monthlySearchVolume,
          cpc_estimate: sk.cpcEstimate,
          competition_score: sk.competitionScore,
          trend_index: sk.trendIndex,
          scored_at: new Date().toISOString(),
        })
        .eq('id', pipeline.id)

      scoredCount++
    }

    return { analyzed: pending.length, scored: scoredCount }
  })
}
