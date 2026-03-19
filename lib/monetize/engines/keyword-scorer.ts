import { createClient } from '@/lib/supabase/server'
import type { Grade, KeywordType, IntentType, RevenueScore } from '@/types/monetize'
import { calculateRevenueScore, assignGrade } from '../utils'
import { GRADE_THRESHOLDS } from '../constants'

export interface KeywordApiData {
  keyword: string
  // From Naver Ad API
  monthlySearchVolume?: number
  pcSearchVolume?: number
  mobileSearchVolume?: number
  competitionIndex?: string // 'HIGH' | 'MEDIUM' | 'LOW'
  // From Google KWP
  cpcEstimate?: number // in KRW
  globalSearchVolume?: number
  // From DataLab
  trendIndex?: number // 0-100
  yoyGrowth?: number
  isSeasonal?: boolean
  seasonalMonths?: number[]
}

export interface ScoredKeyword {
  keyword: string
  keywordType: KeywordType
  intentType: IntentType | null
  revenueScore: RevenueScore
  monthlySearchVolume: number
  cpcEstimate: number
  competitionScore: number
  trendIndex: number
  isSeasonal: boolean
  seasonalMonths: number[] | null
}

/** Convert competition index string to numeric score (0-100) */
function competitionToScore(index?: string): number {
  switch (index?.toUpperCase()) {
    case 'HIGH': return 80
    case 'MEDIUM': return 50
    case 'LOW': return 20
    default: return 50
  }
}

/** Score a single keyword from API data */
export function scoreKeyword(data: KeywordApiData, keywordType: KeywordType = 'gold'): ScoredKeyword {
  const searchVolume = data.monthlySearchVolume || ((data.pcSearchVolume || 0) + (data.mobileSearchVolume || 0))
  const cpc = data.cpcEstimate || 0
  const competition = competitionToScore(data.competitionIndex)
  const trendIndex = data.trendIndex || 50

  const revenueScore = calculateRevenueScore({
    searchVolume,
    cpc,
    competition,
    trendIndex,
  })

  return {
    keyword: data.keyword,
    keywordType,
    intentType: null, // Will be set by cluster engine
    revenueScore,
    monthlySearchVolume: searchVolume,
    cpcEstimate: cpc,
    competitionScore: competition,
    trendIndex,
    isSeasonal: data.isSeasonal || false,
    seasonalMonths: data.seasonalMonths || null,
  }
}

/** Score multiple keywords in batch */
export function scoreKeywords(dataList: KeywordApiData[], keywordType: KeywordType = 'gold'): ScoredKeyword[] {
  return dataList
    .map(data => scoreKeyword(data, keywordType))
    .sort((a, b) => b.revenueScore.total - a.revenueScore.total)
}

/** Save scored keywords to database */
export async function saveKeywordsToDb(userId: string, keywords: ScoredKeyword[]): Promise<string[]> {
  const supabase = createClient()
  const savedIds: string[] = []

  for (const kw of keywords) {
    const { data, error } = await supabase
      .from('keywords')
      .upsert({
        user_id: userId,
        keyword: kw.keyword,
        keyword_type: kw.keywordType,
        intent_type: kw.intentType,
        revenue_score: kw.revenueScore.total,
        keyword_grade: kw.revenueScore.grade,
        monthly_search_volume: kw.monthlySearchVolume,
        cpc_estimate: kw.cpcEstimate,
        competition_score: kw.competitionScore,
        trend_index: kw.trendIndex,
        is_seasonal: kw.isSeasonal,
        seasonal_months: kw.seasonalMonths,
        expires_at: kw.keywordType === 'event'
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      }, { onConflict: 'user_id,keyword' })
      .select('id')
      .single()

    if (error) {
      console.error(`[KeywordScorer] DB save failed for "${kw.keyword}":`, error)
    } else if (data) {
      savedIds.push(data.id)
    }
  }

  return savedIds
}

/** Filter keywords by revenue score threshold */
export function filterByScore(keywords: ScoredKeyword[], minScore: number = 60): ScoredKeyword[] {
  return keywords.filter(kw => kw.revenueScore.total >= minScore)
}

/** Filter keywords by grade */
export function filterByGrade(keywords: ScoredKeyword[], grades: Grade[]): ScoredKeyword[] {
  return keywords.filter(kw => grades.includes(kw.revenueScore.grade))
}

/** Get grade distribution stats */
export function getGradeStats(keywords: ScoredKeyword[]): Record<Grade, number> {
  const stats: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }

  for (const kw of keywords) {
    stats[kw.revenueScore.grade]++
  }

  return stats
}

/** Get average revenue score */
export function getAverageScore(keywords: ScoredKeyword[]): number {
  if (keywords.length === 0) return 0
  const sum = keywords.reduce((acc, kw) => acc + kw.revenueScore.total, 0)
  return Math.round((sum / keywords.length) * 100) / 100
}
