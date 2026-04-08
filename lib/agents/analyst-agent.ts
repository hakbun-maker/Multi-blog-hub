/**
 * Analyst 에이전트 — 발굴된 키워드를 분석하고 점수를 매깁니다.
 * discovered → scored 단계로 전환합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { scoreKeywords } from '@/lib/monetize/engines/keyword-scorer'
import type { KeywordApiData } from '@/lib/monetize/engines/keyword-scorer'
import { decrypt } from '@/lib/utils/encryption'
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
      .select('provider, encrypted_key, encrypted_secret, encrypted_extra')
      .eq('user_id', userId)
      .in('provider', ['naver_ad', 'naver_search'])
      .eq('is_active', true)

    const naverAdKeyRaw = apiKeys?.find(k => k.provider === 'naver_ad')
    const naverSearchKeyRaw = apiKeys?.find(k => k.provider === 'naver_search')

    // 복호화
    let decryptedAdKey: { apiKey: string; secretKey: string; customerId: string } | null = null
    let decryptedSearchKey: { apiKey: string; secretKey: string } | null = null

    if (naverAdKeyRaw) {
      try {
        decryptedAdKey = {
          apiKey: decrypt(naverAdKeyRaw.encrypted_key),
          secretKey: naverAdKeyRaw.encrypted_secret ? decrypt(naverAdKeyRaw.encrypted_secret) : '',
          customerId: naverAdKeyRaw.encrypted_extra ? decrypt(naverAdKeyRaw.encrypted_extra) : '',
        }
      } catch { console.error('[Analyst] naver_ad 키 복호화 실패') }
    }
    if (naverSearchKeyRaw) {
      try {
        decryptedSearchKey = {
          apiKey: decrypt(naverSearchKeyRaw.encrypted_key),
          secretKey: naverSearchKeyRaw.encrypted_secret ? decrypt(naverSearchKeyRaw.encrypted_secret) : '',
        }
      } catch { console.error('[Analyst] naver_search 키 복호화 실패') }
    }

    // 3. 네이버 광고 API로 검색량/경쟁도/CPC 조회
    const keywordTexts = pending.map(p => p.keyword_text)
    const adDataMap = new Map<string, { monthlySearchVolume: number; monthlyPcQcCnt: number; monthlyMobileQcCnt: number; compIdx: string; monthlyAvgCpc: number }>()

    if (decryptedAdKey) {
      try {
        const naverAd = new NaverAdAPI()
        naverAd.initializeWithKeys(decryptedAdKey.apiKey, decryptedAdKey.secretKey, decryptedAdKey.customerId)
        // 5개씩 배치로 조회 (네이버 API는 hintKeywords 최대 5개)
        for (let i = 0; i < keywordTexts.length; i += 5) {
          const batch = keywordTexts.slice(i, i + 5)
          try {
            const results = await naverAd.getKeywordStats(batch)
            for (const r of results) {
              adDataMap.set(r.keyword, r)
            }
          } catch (err) {
            console.error(`[Analyst] Naver Ad batch error (${batch.join(', ')}):`, err)
          }
        }
      } catch (err) {
        console.error('[Analyst] Naver Ad init error:', err)
      }
    }

    // 4. 트렌드 데이터 조회
    const trendMap = new Map<string, number>()
    if (decryptedSearchKey) {
      try {
        const dataLab = new NaverDataLabAPI()
        dataLab.initializeWithKeys(decryptedSearchKey.apiKey, decryptedSearchKey.secretKey)
        for (const kw of keywordTexts.slice(0, 10)) {
          try {
            const trend = await dataLab.getTrend(kw)
            trendMap.set(kw, trend?.trendIndex ?? 50)
          } catch { /* non-fatal */ }
        }
      } catch (err) {
        console.error('[Analyst] DataLab error:', err)
      }
    }

    // 5. 점수 계산 — API 데이터가 있는 키워드만 scored 단계로 진행
    //    API 데이터 없는 키워드는 점수를 매기지 않음 (가짜 데이터 날조 금지)
    let scoredCount = 0
    let skippedCount = 0

    for (const p of pending) {
      // 네이버 광고 API에서 이 키워드의 데이터를 찾기
      // hintKeywords 결과에 원본 키워드가 포함되지 않을 수 있으므로
      // pipeline의 keyword_text와 정확히 일치하는 결과를 찾음
      const adResult = adDataMap.get(p.keyword_text)

      if (!adResult || adResult.monthlySearchVolume === 0) {
        // API 데이터가 없거나 검색량 0인 키워드는 파이프라인에서 제거
        // (검증 불가능한 키워드를 scored로 보내지 않음)
        await supabase
          .from('keyword_pipeline')
          .update({
            stage: 'rejected' as any,
            scored_at: new Date().toISOString(),
          })
          .eq('id', p.id)
        skippedCount++
        continue
      }

      // 실제 API 데이터로 점수 계산
      const competitionIndex = adResult.compIdx === '높음' ? 'HIGH'
        : adResult.compIdx === '낮음' ? 'LOW' : 'MEDIUM'

      const apiData: KeywordApiData = {
        keyword: p.keyword_text,
        monthlySearchVolume: adResult.monthlySearchVolume,
        pcSearchVolume: adResult.monthlyPcQcCnt,
        mobileSearchVolume: adResult.monthlyMobileQcCnt,
        competitionIndex,
        cpcEstimate: adResult.monthlyAvgCpc || 0,
        trendIndex: trendMap.get(p.keyword_text),
      }

      const [scored] = scoreKeywords([apiData], p.keyword_type ?? 'gold')

      await supabase
        .from('keyword_pipeline')
        .update({
          stage: 'scored',
          revenue_score: scored.revenueScore.total,
          keyword_grade: scored.revenueScore.grade,
          intent_type: scored.intentType,
          monthly_search_volume: scored.monthlySearchVolume,
          cpc_estimate: scored.cpcEstimate,
          competition_score: scored.competitionScore,
          trend_index: scored.trendIndex,
          scored_at: new Date().toISOString(),
        })
        .eq('id', p.id)

      scoredCount++
    }

    return { analyzed: pending.length, scored: scoredCount, skipped: skippedCount }
  })
}
