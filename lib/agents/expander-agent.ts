/**
 * Expander 에이전트 — 1차 발굴 키워드를 롱테일로 확장
 *
 * Scout가 발굴한 discovered 키워드 중 경쟁력 상위를
 * 다시 네이버 API에 넣어서 2차 롱테일 키워드를 확장합니다.
 *
 * 예: "건강검진비용" → "건강검진비용30대", "직장인건강검진비용"
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
    const _debug: Record<string, unknown> = {}
    const _errors: string[] = []

    // 1. discovered 단계 키워드 조회
    const { data: discovered, error: discoverError } = await supabase
      .from('keyword_pipeline')
      .select('id, keyword_text, monthly_search_volume, competition_score')
      .eq('user_id', userId)
      .eq('stage', 'discovered')
      .order('monthly_search_volume', { ascending: false })
      .limit(500)

    _debug.discoveredCount = discovered?.length ?? 0
    _debug.discoverError = discoverError?.message ?? null

    if (!discovered || discovered.length === 0) {
      return { expandedCount: 0, skippedCount: 0, _debug, _errors, reason: 'no_discovered_keywords' }
    }

    _debug.sampleKeywords = discovered.slice(0, 5).map(d => d.keyword_text)

    // 경쟁력 기반 정렬: 검색량 / (경쟁도 + 1)
    const ranked = discovered
      .map(d => ({
        ...d,
        competitiveness: (d.monthly_search_volume ?? 0) / ((d.competition_score ?? 50) + 1),
      }))
      .sort((a, b) => b.competitiveness - a.competitiveness)
      .slice(0, 20)

    _debug.rankedCount = ranked.length
    _debug.rankedSample = ranked.slice(0, 5).map(r => `${r.keyword_text}(${r.monthly_search_volume})`)

    // 2. API 키 조회 (.single() 대신 .limit(1)로 안전하게)
    const { data: apiKeyRows, error: apiKeyError } = await supabase
      .from('ai_api_keys')
      .select('encrypted_key, encrypted_secret, encrypted_extra')
      .eq('user_id', userId)
      .eq('provider', 'naver_ad')
      .eq('is_active', true)
      .limit(1)

    _debug.apiKeyError = apiKeyError?.message ?? null
    _debug.apiKeyFound = (apiKeyRows?.length ?? 0) > 0

    const apiKeyRow = apiKeyRows?.[0]
    if (!apiKeyRow) {
      return { expandedCount: 0, skippedCount: 0, _debug, _errors, reason: 'no_api_key' }
    }

    let naverAdKey: { apiKey: string; secretKey: string; customerId: string } | null = null
    try {
      naverAdKey = {
        apiKey: decrypt(apiKeyRow.encrypted_key),
        secretKey: apiKeyRow.encrypted_secret ? decrypt(apiKeyRow.encrypted_secret) : '',
        customerId: apiKeyRow.encrypted_extra ? decrypt(apiKeyRow.encrypted_extra) : '',
      }
      _debug.decryptSuccess = true
    } catch (err: any) {
      _debug.decryptSuccess = false
      return { expandedCount: 0, skippedCount: 0, _debug, _errors: [`decrypt: ${err.message}`], reason: 'decrypt_failed' }
    }

    const naverAd = new NaverAdAPI()
    naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.customerId)

    // 기존 키워드 (중복 방지)
    const { data: existingAll } = await supabase
      .from('keyword_pipeline')
      .select('keyword_text')
      .eq('user_id', userId)

    const existingSet = new Set((existingAll ?? []).map(p => p.keyword_text))
    _debug.existingKeywords = existingSet.size

    // 3. 각 키워드를 hintKeyword로 2차 API 호출
    const compScore = (compIdx: string) => compIdx === '높음' ? 80 : compIdx === '낮음' ? 20 : 50

    for (const kw of ranked) {
      try {
        const results = await naverAd.getKeywordStats([kw.keyword_text])

        const longTails = results
          .filter(r => !existingSet.has(r.keyword))
          .filter(r => r.keyword !== kw.keyword_text)
          .filter(r => r.monthlySearchVolume >= 30)
          .filter(r => r.keyword.length >= 5)
          .map(r => ({ ...r, competitiveness: r.monthlySearchVolume / (compScore(r.compIdx) + 1) }))
          .sort((a, b) => b.competitiveness - a.competitiveness)
          .slice(0, 10)

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
          const { error: insertError } = await supabase.from('keyword_pipeline').insert(rows)
          if (insertError) {
            _errors.push(`insert(${kw.keyword_text}): ${insertError.message}`)
          } else {
            expandedCount += longTails.length
            longTails.forEach(r => existingSet.add(r.keyword))
          }
        }
      } catch (err: any) {
        skippedCount++
        _errors.push(`expand(${kw.keyword_text}): ${err.message}`)
      }
    }

    // 4. 모든 discovered 키워드를 expanded로 승격 (Analyst가 처리할 수 있도록)
    const allDiscoveredIds = discovered.map(d => d.id)
    for (let i = 0; i < allDiscoveredIds.length; i += 50) {
      await supabase
        .from('keyword_pipeline')
        .update({ stage: 'expanded' })
        .in('id', allDiscoveredIds.slice(i, i + 50))
    }
    _debug.promotedToExpanded = allDiscoveredIds.length

    return { expandedCount, skippedCount, _debug, _errors }
  })
}
