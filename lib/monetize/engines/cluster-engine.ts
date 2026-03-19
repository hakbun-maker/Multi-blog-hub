import type { IntentType, Keyword } from '@/types/monetize'
import { createClient } from '@/lib/supabase/server'

export interface ClusterResult {
  seedKeywordId: string
  clusterKeywords: { keyword: string; intentType: IntentType }[]
  clusterStrategy: string
  intentWeights: Record<IntentType, number>
}

/**
 * Generate keyword cluster from seed keyword
 * Uses Claude API to generate related keywords per intent type
 */
export async function generateCluster(
  userId: string,
  seedKeyword: Keyword,
  aiApiKey?: string
): Promise<ClusterResult> {
  const intents: IntentType[] = ['AD', 'REVIEW', 'INFO', 'CRITIC', 'COMPARE', 'TREND']

  // Build prompt for Claude API
  const prompt = buildClusterPrompt(seedKeyword.keyword, seedKeyword.keywordType, intents)

  let clusterKeywords: { keyword: string; intentType: IntentType }[] = []

  if (aiApiKey) {
    // Call Claude API for intelligent clustering
    const response = await callClaudeForClustering(aiApiKey, prompt)
    clusterKeywords = parseClusterResponse(response, intents)
  } else {
    // Fallback: generate basic variations
    clusterKeywords = generateBasicClusters(seedKeyword.keyword, intents)
  }

  // Calculate intent weights based on keyword type
  const intentWeights = calculateIntentWeights(seedKeyword.keywordType)

  // Save to DB
  const supabase = createClient()
  const { data, error } = await supabase
    .from('keyword_clusters')
    .insert({
      user_id: userId,
      seed_keyword_id: seedKeyword.id,
      cluster_keywords: clusterKeywords,
      cluster_strategy: `${seedKeyword.keywordType}_${seedKeyword.intentType || 'mixed'}`,
      intent_weights: intentWeights,
    })
    .select()
    .single()

  if (error) throw new Error(`클러스터 저장 실패: ${error.message}`)

  return {
    seedKeywordId: seedKeyword.id,
    clusterKeywords,
    clusterStrategy: data.cluster_strategy,
    intentWeights,
  }
}

function buildClusterPrompt(keyword: string, keywordType: string, intents: IntentType[]): string {
  return `키워드 "${keyword}" (유형: ${keywordType})에 대해 각 Intent별로 관련 키워드를 2개씩 생성해주세요.

Intent 유형별 설명:
- AD: 구매/광고 의도 (예: "OO 가격", "OO 할인")
- REVIEW: 리뷰/후기 의도 (예: "OO 후기", "OO 사용기")
- INFO: 정보 탐색 의도 (예: "OO 방법", "OO 뜻")
- CRITIC: 비평/비교분석 (예: "OO 단점", "OO 장단점")
- COMPARE: 비교 의도 (예: "OO vs XX", "OO XX 비교")
- TREND: 트렌드/이슈 (예: "OO 인기", "2026 OO 트렌드")

JSON 형식으로 응답:
[{"keyword": "관련키워드", "intentType": "AD"}, ...]`
}

async function callClaudeForClustering(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API 호출 실패: ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || '[]'
}

function parseClusterResponse(
  response: string,
  intents: IntentType[]
): { keyword: string; intentType: IntentType }[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return generateBasicClusters('', intents)
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.filter((item: any) => item.keyword && intents.includes(item.intentType))
  } catch {
    return []
  }
}

function generateBasicClusters(
  keyword: string,
  intents: IntentType[]
): { keyword: string; intentType: IntentType }[] {
  const suffixes: Record<IntentType, string[]> = {
    AD: ['가격', '할인'],
    REVIEW: ['후기', '사용기'],
    INFO: ['방법', '정리'],
    CRITIC: ['단점', '장단점'],
    COMPARE: ['비교', '추천'],
    TREND: ['트렌드', '인기'],
  }

  return intents.flatMap(intent =>
    suffixes[intent].map(suffix => ({
      keyword: `${keyword} ${suffix}`,
      intentType: intent,
    }))
  )
}

function calculateIntentWeights(keywordType: string): Record<IntentType, number> {
  const weights: Record<string, Record<IntentType, number>> = {
    gold: { AD: 0.25, REVIEW: 0.2, INFO: 0.15, CRITIC: 0.1, COMPARE: 0.2, TREND: 0.1 },
    event: { AD: 0.15, REVIEW: 0.15, INFO: 0.25, CRITIC: 0.05, COMPARE: 0.1, TREND: 0.3 },
    seasonal: { AD: 0.2, REVIEW: 0.2, INFO: 0.2, CRITIC: 0.1, COMPARE: 0.15, TREND: 0.15 },
  }
  return weights[keywordType] || weights.gold
}
