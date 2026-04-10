/**
 * Expander 에이전트 — 1차 발굴 키워드를 롱테일로 확장
 *
 * Scout가 발굴한 discovered 키워드 중 경쟁력 상위를
 * 다시 네이버 API에 넣어서 2차 롱테일 키워드를 확장합니다.
 *
 * 예: "건강검진비용" → "건강검진비용30대", "직장인건강검진비용"
 *
 * 1차 키워드의 검색량/CPC/경쟁도는 Scout가 이미 저장했으므로,
 * Expander는 2차 확장 키워드의 데이터만 추가합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { decrypt } from '@/lib/utils/encryption'
import type { AgentRunResult } from './types'

export async function runExpanderAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'expander', async () => {
    const supabase = getServiceClient()
    let expandedCount = 0
    let skippedCount = 0

    // 1. discovered 단계 키워드 중 경쟁력 상위를 가져옴
    const { data: discovered } = await supabase
      .from('keyword_pipeline')
      .select('id, keyword_text, monthly_search_volume, competition_score')
      .eq('user_id', userId)
      .eq('stage', 'discovered')
      .order('monthly_search_volume', { ascending: false })
      .limit(50)

    if (!discovered || discovered.length === 0) {
      return { expandedCount: 0, skippedCount: 0, reason: 'no_discovered_keywords' }
    }

    // 경쟁력 기반 정렬: 검색량 / (경쟁도 + 1)
    const ranked = discovered
      .map(d => ({
        ...d,
        competitiveness: (d.monthly_search_volume ?? 0) / ((d.competition_score ?? 50) + 1),
      }))
      .sort((a, b) => b.competitiveness - a.competitiveness)
      .slice(0, 20) // 상위 20개만 확장

    // 2. API 키 조회
    const { data: apiKeys } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key, encrypted_secret, encrypted_extra')
      .eq('user_id', userId)
      .eq('provider', 'naver_ad')
      .eq('is_active', true)
      .single()

    if (!apiKeys) {
      return { expandedCount: 0, skippedCount: 0, reason: 'no_api_key' }
    }

    let naverAdKey: { apiKey: string; secretKey: string; customerId: string } | null = null
    try {
      naverAdKey = {
        apiKey: decrypt(apiKeys.encrypted_key),
        secretKey: apiKeys.encrypted_secret ? decrypt(apiKeys.encrypted_secret) : '',
        customerId: apiKeys.encrypted_extra ? decrypt(apiKeys.encrypted_extra) : '',
      }
    } catch {
      return { expandedCount: 0, skippedCount: 0, reason: 'decrypt_failed' }
    }

    const naverAd = new NaverAdAPI()
    naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.customerId)

    // 기존 키워드 (중복 방지)
    const { data: existingAll } = await supabase
      .from('keyword_pipeline')
      .select('keyword_text')
      .eq('user_id', userId)

    const existingSet = new Set((existingAll ?? []).map(p => p.keyword_text))

    // 3. 각 키워드를 hintKeyword로 2차 API 호출
    const compScore = (compIdx: string) => compIdx === '높음' ? 80 : compIdx === '낮음' ? 20 : 50

    for (const kw of ranked) {
      try {
        const results = await naverAd.getKeywordStats([kw.keyword_text])

        const longTails = results
          .filter(r => !existingSet.has(r.keyword))
          .filter(r => r.keyword !== kw.keyword_text) // 원본 키워드 제외
          .filter(r => r.monthlySearchVolume >= 30)    // 롱테일이므로 검색량 기준 낮춤
          .filter(r => r.keyword.length >= 5)           // 충분히 구체적인 키워드만
          .map(r => ({ ...r, competitiveness: r.monthlySearchVolume / (compScore(r.compIdx) + 1) }))
          .sort((a, b) => b.competitiveness - a.competitiveness)
          .slice(0, 10) // 키워드당 최대 10개 롱테일

        if (longTails.length > 0) {
          const rows = longTails.map(r => ({
            user_id: userId,
            keyword_text: r.keyword,
            keyword_type: 'gold' as const,
            stage: 'expanded' as const,
            monthly_search_volume: r.monthlySearchVolume,
            cpc_estimate: r.monthlyAvgCpc || 0,
            competition_score: compScore(r.compIdx),
          }))
          await supabase.from('keyword_pipeline').insert(rows)
          expandedCount += longTails.length
          longTails.forEach(r => existingSet.add(r.keyword))
        }

        // 원본 discovered 키워드도 expanded 단계로 승격
        await supabase
          .from('keyword_pipeline')
          .update({ stage: 'expanded' })
          .eq('id', kw.id)
      } catch (err: any) {
        skippedCount++
        console.error(`[Expander] "${kw.keyword_text}" 확장 실패:`, err.message)
      }
    }

    // 확장하지 않은 나머지 discovered 키워드도 expanded로 승격 (Analyst가 처리할 수 있도록)
    const remainingIds = discovered
      .filter(d => !ranked.some(r => r.id === d.id))
      .map(d => d.id)

    if (remainingIds.length > 0) {
      await supabase
        .from('keyword_pipeline')
        .update({ stage: 'expanded' })
        .in('id', remainingIds)
    }

    return { expandedCount, skippedCount, rankedCount: ranked.length, remainingPromoted: remainingIds.length }
  })
}
