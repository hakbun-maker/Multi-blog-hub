import type { Grade, RevenueScore, IntentType } from '@/types/monetize'
import { REVENUE_SCORE_WEIGHTS, GRADE_THRESHOLDS, INTENT_PRIORITY, INTENT_BLOG_FIT } from './constants'

/** 검색량 정규화 (0~100) */
export function normalizeSearchVolume(volume: number): number {
  if (volume <= 0) return 0
  // log scale: 10 → ~23, 100 → ~46, 1000 → ~69, 10000 → ~92, 50000 → 100
  const normalized = (Math.log10(volume) / Math.log10(50000)) * 100
  return Math.min(Math.max(Math.round(normalized * 100) / 100, 0), 100)
}

/** CPC 정규화 (0~100) */
export function normalizeCPC(cpc: number): number {
  if (cpc <= 0) return 0
  // ₩500 → 25, ₩1000 → 50, ₩2000 → 100
  const normalized = (cpc / 2000) * 100
  return Math.min(Math.max(Math.round(normalized * 100) / 100, 0), 100)
}

/** 트렌드 정규화 (0~100) */
export function normalizeTrend(trendIndex: number): number {
  return Math.min(Math.max(Math.round(trendIndex * 100) / 100, 0), 100)
}

/** 경쟁도 점수 계산 (경쟁 낮을수록 높은 점수) */
export function normalizeCompetition(competition: number): number {
  // competition 0~100 → 반전: 낮은 경쟁 = 높은 점수
  return Math.min(Math.max(Math.round((100 - competition) * 100) / 100, 0), 100)
}

/** Revenue Score 계산 */
export function calculateRevenueScore(params: {
  searchVolume: number
  cpc: number
  competition: number
  trendIndex: number
}): RevenueScore {
  const traffic = normalizeSearchVolume(params.searchVolume) * REVENUE_SCORE_WEIGHTS.traffic
  const revenue = normalizeCPC(params.cpc) * REVENUE_SCORE_WEIGHTS.revenue
  const difficulty = normalizeCompetition(params.competition) * REVENUE_SCORE_WEIGHTS.difficulty
  const trend = normalizeTrend(params.trendIndex) * REVENUE_SCORE_WEIGHTS.trend

  const total = Math.round((traffic + revenue + difficulty + trend) * 100) / 100
  const grade = assignGrade(total)

  return { traffic, revenue, difficulty, trend, total, grade }
}

/** 점수 → 등급 변환 */
export function assignGrade(score: number): Grade {
  if (score >= GRADE_THRESHOLDS.S.min) return 'S'
  if (score >= GRADE_THRESHOLDS.A.min) return 'A'
  if (score >= GRADE_THRESHOLDS.B.min) return 'B'
  if (score >= GRADE_THRESHOLDS.C.min) return 'C'
  return 'D'
}

/** Intent 우선순위 정렬용 점수 계산 */
export function calculateIntentPriority(keywordGrade: Grade, intentType: IntentType): number {
  const gradeScore: Record<Grade, number> = { S: 100, A: 80, B: 60, C: 40, D: 20 }
  return gradeScore[keywordGrade] * INTENT_PRIORITY[intentType]
}

/** Intent × BlogGrade 적합도 확인 */
export function getIntentFitScore(intentType: IntentType, blogGrade: Grade): number {
  return INTENT_BLOG_FIT[intentType][blogGrade]
}

/** Intent가 블로그에 적합한지 확인 (0이면 부적합) */
export function isIntentFit(intentType: IntentType, blogGrade: Grade): boolean {
  return getIntentFitScore(intentType, blogGrade) > 0
}
