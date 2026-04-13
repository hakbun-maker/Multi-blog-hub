import type { Grade, RevenueScore, IntentType } from '@/types/monetize'
import { GRADE_THRESHOLDS, INTENT_SCORE, CATEGORY_BONUS, INTENT_PRIORITY, INTENT_BLOG_FIT } from './constants'

// ─── 4축 키워드 등급 평가 시스템 ───────────────────────────────
// 기획서: 키워드 등급 구분 기준.txt + AdSense 카테고리별 가중치.txt
//
// ① 검색 의도 강도 (40점) — Intent 패턴 기반
// ② 경쟁 강도 역산 (30점) — 경쟁도 + 키워드 길이(롱테일)
// ③ 수익 연결성   (20점) — Intent + CPC 추정
// ④ 콘텐츠 확장성 (10점) — 키워드 구조
// + 카테고리 보정값 — blog_type별 등급컷 하향

/** ① 검색 의도 강도 (40점 만점) */
function calcIntentScore(intentType: IntentType | null): number {
  if (!intentType) return 10 // 의도 불분명 = 최저
  return INTENT_SCORE[intentType] ?? 10
}

/** ② 경쟁 강도 역산 (30점 만점) */
function calcCompetitionScore(competition: number, keywordLength: number): number {
  // 경쟁도: 0=무경쟁, 20=낮음, 50=중간, 80=높음, 100=극심
  // 키워드 길이: 6글자+ = 롱테일
  const isLongTail = keywordLength >= 6
  const isMidTail = keywordLength >= 4

  if (isLongTail && competition <= 30) return 30     // 롱테일 + 낮은 경쟁 = 최고
  if (isLongTail && competition <= 60) return 25     // 롱테일 + 중간 경쟁
  if (isMidTail && competition <= 30) return 25      // 미드테일 + 낮은 경쟁
  if (isMidTail && competition <= 60) return 20      // 미드테일 + 중간 경쟁
  if (isLongTail && competition > 60) return 15      // 롱테일이지만 높은 경쟁
  if (isMidTail && competition > 60) return 10       // 미드테일 + 높은 경쟁
  if (competition <= 30) return 15                    // 짧지만 경쟁 낮음
  if (competition <= 60) return 10                    // 짧은 키워드 + 중간 경쟁
  return 5                                            // 대형 키워드
}

/** ③ 수익 연결성 (20점 만점) */
function calcRevenueScore(intentType: IntentType | null, cpcEstimate: number): number {
  // 구매 의도가 높고 CPC가 높은 카테고리일수록 높은 점수
  const intentFactor = intentType === 'AD' ? 1.0
    : intentType === 'COMPARE' ? 0.9
    : intentType === 'REVIEW' ? 0.7
    : intentType === 'CRITIC' ? 0.5
    : intentType === 'INFO' ? 0.3
    : 0.2

  // CPC 추정값 (0~300+ 범위)
  const cpcFactor = cpcEstimate > 200 ? 1.0
    : cpcEstimate > 100 ? 0.7
    : cpcEstimate > 50 ? 0.5
    : cpcEstimate > 0 ? 0.3
    : 0.2

  return Math.round(20 * intentFactor * (0.6 + 0.4 * cpcFactor))
}

/** ④ 콘텐츠 확장성 (10점 만점) */
function calcExpansionScore(keyword: string, intentType: IntentType | null): number {
  const length = keyword.length
  // 시리즈 확장 가능성: 긴 키워드 + 비교/정보 의도 = 확장 용이
  let score = 0

  if (length >= 8) score += 5         // 구체적 키워드 → 파생 가능
  else if (length >= 5) score += 3

  if (intentType === 'INFO' || intentType === 'COMPARE') score += 5   // 시리즈화 용이
  else if (intentType === 'REVIEW' || intentType === 'AD') score += 3
  else score += 1

  return Math.min(score, 10)
}

/** 4축 점수 계산 (기본 100점 + 카테고리 보정) */
export function calculateRevenueScore(params: {
  searchVolume: number
  cpc: number
  competition: number
  trendIndex: number
  intentType?: IntentType | null
  keyword?: string
  blogType?: string | null
}): RevenueScore {
  const intentType = params.intentType ?? null
  const keyword = params.keyword ?? ''
  const blogType = params.blogType ?? null

  // 4축 계산
  const intentScore = calcIntentScore(intentType)
  const competitionScore = calcCompetitionScore(params.competition, keyword.length)
  const revenueScoreAxis = calcRevenueScore(intentType, params.cpc)
  const expansionScore = calcExpansionScore(keyword, intentType)

  const baseTotal = intentScore + competitionScore + revenueScoreAxis + expansionScore

  // 카테고리 보정값
  const bonus = blogType && CATEGORY_BONUS[blogType] ? CATEGORY_BONUS[blogType].total : 0

  // 최종 점수 (보정값 추가, 100점 상한)
  const total = Math.min(Math.round(baseTotal + bonus), 100)

  // 등급 결정 (카테고리별 등급컷 하향 적용)
  const gradeOffset = blogType && CATEGORY_BONUS[blogType] ? CATEGORY_BONUS[blogType].gradeOffset : 0
  const grade = assignGradeWithOffset(baseTotal, gradeOffset)

  return {
    intentScore,
    competitionScore,
    revenueScore: revenueScoreAxis,
    expansionScore,
    categoryBonus: bonus,
    total,
    grade,
    // 하위 호환
    traffic: intentScore,
    revenue: revenueScoreAxis,
    difficulty: competitionScore,
    trend: expansionScore,
  }
}

/** 점수 → 등급 변환 (카테고리 보정 적용) */
function assignGradeWithOffset(baseScore: number, offset: number): Grade {
  // 보정값만큼 등급컷이 낮아짐 (medical +13 → S기준 85→72)
  const adjustedScore = baseScore + offset
  if (adjustedScore >= GRADE_THRESHOLDS.S.min) return 'S'
  if (adjustedScore >= GRADE_THRESHOLDS.A.min) return 'A'
  if (adjustedScore >= GRADE_THRESHOLDS.B.min) return 'B'
  if (adjustedScore >= GRADE_THRESHOLDS.C.min) return 'C'
  return 'D'
}

/** 기본 등급 변환 (보정 없음) */
export function assignGrade(score: number): Grade {
  return assignGradeWithOffset(score, 0)
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
