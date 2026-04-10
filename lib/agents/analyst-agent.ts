/**
 * Analyst 에이전트 — expanded 키워드의 점수를 계산하고 등급을 매깁니다.
 *
 * Scout/Expander가 이미 검색량/CPC/경쟁도를 저장했으므로 API 재호출 없이
 * 기존 데이터로 Revenue Score를 계산합니다.
 *
 * expanded → scored 단계로 전환합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { scoreKeyword } from '@/lib/monetize/engines/keyword-scorer'
import type { KeywordApiData } from '@/lib/monetize/engines/keyword-scorer'
import type { AgentRunResult } from './types'

export async function runAnalystAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'analyst', async () => {
    const supabase = getServiceClient()

    // 1. expanded 단계 키워드 가져오기 (Scout/Expander가 데이터를 이미 저장함)
    const { data: pending } = await supabase
      .from('keyword_pipeline')
      .select('id, keyword_text, keyword_type, monthly_search_volume, cpc_estimate, competition_score')
      .eq('user_id', userId)
      .eq('stage', 'expanded')
      .order('created_at', { ascending: true })
      .limit(200)

    if (!pending || pending.length === 0) return { analyzed: 0, scored: 0 }

    let scoredCount = 0

    // 2. 점수 계산 (API 호출 없음 — 이미 데이터가 있음)
    for (const p of pending) {
      const volume = p.monthly_search_volume ?? 0
      const cpc = p.cpc_estimate ?? 0
      const competition = p.competition_score ?? 50

      // 검색량이 0이면 점수를 매길 수 없음
      if (volume === 0) {
        await supabase
          .from('keyword_pipeline')
          .delete()
          .eq('id', p.id)
        continue
      }

      const competitionIndex = competition >= 70 ? 'HIGH' : competition <= 30 ? 'LOW' : 'MEDIUM'

      const apiData: KeywordApiData = {
        keyword: p.keyword_text,
        monthlySearchVolume: volume,
        competitionIndex,
        cpcEstimate: cpc,
      }

      const scored = scoreKeyword(apiData, p.keyword_type ?? 'gold')

      await supabase
        .from('keyword_pipeline')
        .update({
          stage: 'scored',
          revenue_score: scored.revenueScore.total,
          keyword_grade: scored.revenueScore.grade,
          intent_type: scored.intentType,
          trend_index: scored.trendIndex,
          scored_at: new Date().toISOString(),
        })
        .eq('id', p.id)

      scoredCount++
    }

    return { analyzed: pending.length, scored: scoredCount }
  })
}
