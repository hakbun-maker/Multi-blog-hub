/**
 * Analyst 에이전트 — expanded 키워드의 점수를 계산하고 등급을 매깁니다.
 *
 * 4축 평가 체계:
 * ① 검색 의도 강도 (40점) — Intent 패턴 기반
 * ② 경쟁 강도 역산 (30점) — 경쟁도 + 키워드 길이(롱테일)
 * ③ 수익 연결성   (20점) — Intent + CPC
 * ④ 콘텐츠 확장성 (10점) — 키워드 구조
 * + 카테고리 보정 — blog_type별 등급컷 하향
 *
 * API 재호출 없음 — Scout/Expander가 이미 데이터를 저장함.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { scoreKeyword } from '@/lib/monetize/engines/keyword-scorer'
import type { KeywordApiData } from '@/lib/monetize/engines/keyword-scorer'
import type { AgentRunResult } from './types'

export async function runAnalystAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'analyst', async () => {
    const supabase = getServiceClient()

    // 1. expanded 단계 키워드
    const { data: pending } = await supabase
      .from('keyword_pipeline')
      .select('id, keyword_text, keyword_type, monthly_search_volume, cpc_estimate, competition_score, trend_index')
      .eq('user_id', userId)
      .eq('stage', 'expanded')
      .order('created_at', { ascending: true })
      .limit(200)

    if (!pending || pending.length === 0) return { analyzed: 0, scored: 0 }

    // 2. 사용자 블로그 목록 (카테고리 보정값 적용을 위해)
    const { data: blogs } = await supabase
      .from('blogs')
      .select('blog_type')
      .eq('user_id', userId)
      .eq('is_active', true)

    // 가장 주된 blog_type을 기본 카테고리로 사용
    const blogTypes = (blogs ?? []).map((b: any) => b.blog_type).filter(Boolean)
    const primaryBlogType = blogTypes[0] ?? null

    let scoredCount = 0

    // 3. 4축 점수 계산
    for (const p of pending) {
      const volume = p.monthly_search_volume ?? 0
      const cpc = p.cpc_estimate ?? 0
      const competition = p.competition_score ?? 50

      // 검색량 0이면 삭제
      if (volume === 0) {
        await supabase.from('keyword_pipeline').delete().eq('id', p.id)
        continue
      }

      const competitionIndex = competition >= 70 ? 'HIGH' : competition <= 30 ? 'LOW' : 'MEDIUM'

      const apiData: KeywordApiData = {
        keyword: p.keyword_text,
        monthlySearchVolume: volume,
        competitionIndex,
        cpcEstimate: cpc,
        trendIndex: p.trend_index ?? undefined,
      }

      // blogType 전달하여 카테고리 보정 적용
      const scored = scoreKeyword(apiData, p.keyword_type ?? 'gold', primaryBlogType)

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
