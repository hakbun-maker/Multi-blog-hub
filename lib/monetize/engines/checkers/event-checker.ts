import type { Grade, IntentType } from '@/types/monetize'
import { calculateKeywordDensity } from '../post-processor'
import { PASONA_WEIGHTS, ANNUAL_EVENTS } from '../../constants'

export interface EventCheckResult {
  eventScore: number // 0-35
  techScore: number // 0-15
  totalScore: number
  breakdown: {
    // Event-specific (0-35)
    intentAchievement: number
    pasonaWeightCompliance: number
    requiredElements: number
    forbiddenElements: number
    personaTone: number
    // Technical (0-15)
    seoCompliance: number
    aiSearchOptimization: number
    adCodeCompliance: number
  }
  weakAreas: string[]
}

export function checkEvent(params: {
  content: string
  keyword: string
  intentType: IntentType
  blogGrade: Grade
}): EventCheckResult {
  const { content, keyword, intentType, blogGrade } = params
  const breakdown = {
    intentAchievement: 0,
    pasonaWeightCompliance: 0,
    requiredElements: 0,
    forbiddenElements: 0,
    personaTone: 0,
    seoCompliance: 0,
    aiSearchOptimization: 0,
    adCodeCompliance: 0,
  }

  // ========== EVENT-SPECIFIC AXIS (0-35) ==========
  // Intent Achievement (0-8)
  breakdown.intentAchievement = calculateIntentAchievement(content, keyword, intentType)

  // PASONA Weight Compliance (0-7)
  breakdown.pasonaWeightCompliance = calculatePasonaWeightCompliance(content, intentType)

  // Required Elements (0-7)
  breakdown.requiredElements = calculateRequiredElements(content, keyword, intentType)

  // Forbidden Elements (0-7)
  breakdown.forbiddenElements = calculateForbiddenElements(content, keyword)

  // Persona Tone (0-6)
  breakdown.personaTone = calculatePersonaTone(content, blogGrade)

  const eventScore = Math.min(
    35,
    breakdown.intentAchievement +
      breakdown.pasonaWeightCompliance +
      breakdown.requiredElements +
      breakdown.forbiddenElements +
      breakdown.personaTone
  )

  // ========== TECHNICAL AXIS (0-15) ==========
  // SEO Compliance (0-5)
  breakdown.seoCompliance = calculateSEOCompliance(content, keyword)

  // AI Search Optimization (0-5)
  breakdown.aiSearchOptimization = calculateAISearchOptimization(content, keyword)

  // Ad Code Compliance (0-5)
  breakdown.adCodeCompliance = calculateAdCodeCompliance(content)

  const techScore = Math.min(
    15,
    breakdown.seoCompliance + breakdown.aiSearchOptimization + breakdown.adCodeCompliance
  )

  const totalScore = Math.round(eventScore + techScore)

  // Identify weak areas
  const weakAreas: string[] = []
  if (breakdown.intentAchievement < 4) weakAreas.push('의도 달성도')
  if (breakdown.pasonaWeightCompliance < 3.5) weakAreas.push('PASONA 가중치')
  if (breakdown.requiredElements < 3.5) weakAreas.push('필수 요소')
  if (breakdown.forbiddenElements < 3.5) weakAreas.push('금지 사항')
  if (breakdown.personaTone < 3) weakAreas.push('페르소나 톤')
  if (breakdown.seoCompliance < 2.5) weakAreas.push('SEO 준수')
  if (breakdown.aiSearchOptimization < 2.5) weakAreas.push('AI 검색 최적화')
  if (breakdown.adCodeCompliance < 2.5) weakAreas.push('광고 코드 준수')

  return {
    eventScore,
    techScore,
    totalScore,
    breakdown,
    weakAreas,
  }
}

/**
 * Intent Achievement: Event relevance and content match to keyword
 * Score: 0-8
 */
function calculateIntentAchievement(
  content: string,
  keyword: string,
  intentType: IntentType
): number {
  let score = 0

  // Check if event is mentioned
  const isEventKeyword = checkIfEventKeyword(keyword)
  if (isEventKeyword) {
    score += 2
  }

  // Content mentions event context
  const eventContext = extractEventContext(keyword)
  if (eventContext) {
    const lowerContent = content.toLowerCase()
    if (lowerContent.includes(eventContext.toLowerCase())) {
      score += 2
    }
  }

  // Intent-specific markers
  const lowerContent = content.toLowerCase()
  switch (intentType) {
    case 'REVIEW':
      if (lowerContent.includes('추천') || lowerContent.includes('리뷰')) {
        score += 2
      }
      break
    case 'AD':
      if (lowerContent.includes('구매') || lowerContent.includes('특가')) {
        score += 2
      }
      break
    case 'INFO':
      if (lowerContent.includes('준비') || lowerContent.includes('가이드')) {
        score += 2
      }
      break
    case 'COMPARE':
      if (lowerContent.includes('비교') || lowerContent.includes('선택')) {
        score += 2
      }
      break
    default:
      if (lowerContent.includes('이벤트') || lowerContent.includes('행사')) {
        score += 1
      }
  }

  // Has urgency/timeliness mentions (typical for events)
  if (lowerContent.includes('지금') || lowerContent.includes('한정') || lowerContent.includes('마감')) {
    score += 2
  }

  return Math.min(8, score)
}

/**
 * PASONA Weight Compliance: Follows intent-specific weight distribution
 * Score: 0-7
 */
function calculatePasonaWeightCompliance(content: string, intentType: IntentType): number {
  let score = 0

  const sections = {
    P: content.includes('## [P]') || content.includes('## [문제]'),
    A: content.includes('## [A]') || content.includes('## [공감]'),
    S: content.includes('## [S]') || content.includes('## [솔루션]'),
    O: content.includes('## [O]') || content.includes('## [오퍼]'),
    N: content.includes('## [N]') || content.includes('## [좁혀]'),
    A2: content.includes('## [A2]') || content.includes('## [액션]'),
  }

  const weights = PASONA_WEIGHTS[intentType]

  // High-weight sections should be present
  const highWeightSections = Object.entries(weights)
    .filter(([_, w]) => w >= 20)
    .map(([section]) => section)

  let highWeightPresent = 0
  for (const section of highWeightSections) {
    if (sections[section as keyof typeof sections]) {
      highWeightPresent++
    }
  }

  // High-weight sections should comprise majority
  if (highWeightPresent === highWeightSections.length) {
    score += 3
  } else if (highWeightPresent >= highWeightSections.length - 1) {
    score += 2
  } else if (highWeightPresent > 0) {
    score += 1
  }

  // Medium-weight sections present (>10)
  const mediumWeightSections = Object.entries(weights)
    .filter(([_, w]) => w > 10 && w < 20)
    .map(([section]) => section)

  let mediumWeightPresent = 0
  for (const section of mediumWeightSections) {
    if (sections[section as keyof typeof sections]) {
      mediumWeightPresent++
    }
  }

  if (mediumWeightPresent === mediumWeightSections.length) {
    score += 2
  } else if (mediumWeightPresent > 0) {
    score += 1
  }

  // Structure quality
  const totalSections = Object.values(sections).filter(Boolean).length
  if (totalSections >= 4) {
    score += 2
  } else if (totalSections >= 2) {
    score += 1
  }

  return Math.min(7, score)
}

/**
 * Required Elements: Event-specific content requirements
 * Score: 0-7
 */
function calculateRequiredElements(
  content: string,
  keyword: string,
  intentType: IntentType
): number {
  let score = 0

  const lowerContent = content.toLowerCase()

  // Event context must be clear
  const eventContext = extractEventContext(keyword)
  if (eventContext && lowerContent.includes(eventContext.toLowerCase())) {
    score += 2
  } else {
    score += 0.5
  }

  // Dates/timeline should be mentioned
  if (
    /\d{1,2}(월|\/|-)\d{1,2}|(\d{4}년)/g.test(content) ||
    lowerContent.includes('시간') ||
    lowerContent.includes('기간')
  ) {
    score += 1.5
  }

  // Practical advice for the event
  const practicalTerms = ['준비', '필요', '추천', '선택', '방법', '가이드']
  let practicalCount = 0
  for (const term of practicalTerms) {
    if (lowerContent.includes(term)) practicalCount++
  }

  if (practicalCount >= 2) {
    score += 1.5
  } else if (practicalCount > 0) {
    score += 1
  }

  // Intent-specific requirements
  switch (intentType) {
    case 'AD':
      // Should have product/deal info
      if (lowerContent.includes('가격') || lowerContent.includes('할인') || lowerContent.includes('세트')) {
        score += 1.5
      }
      break
    case 'REVIEW':
      // Should have specific recommendations
      if (lowerContent.includes('추천') || lowerContent.includes('별점') || lowerContent.includes('순위')) {
        score += 1.5
      }
      break
    case 'COMPARE':
      // Should compare options
      if (lowerContent.includes('vs') || lowerContent.includes('차이') || lowerContent.includes('비교')) {
        score += 1.5
      }
      break
  }

  return Math.min(7, score)
}

/**
 * Forbidden Elements: Quality restrictions
 * Score: 0-7 (higher is better - fewer forbidden elements)
 */
function calculateForbiddenElements(content: string, keyword: string): number {
  let penalty = 0
  const lowerContent = content.toLowerCase()

  // Excessive promotional language (-1 per excessive mention)
  const promotionalTerms = ['클릭', '지금', '지금 바로', '오늘만', '최고', '최고의', '제일']
  let promotionalCount = 0
  for (const term of promotionalTerms) {
    promotionalCount += (lowerContent.match(new RegExp(term, 'g')) || []).length
  }
  if (promotionalCount > 10) {
    penalty += 2
  } else if (promotionalCount > 5) {
    penalty += 1
  }

  // Keyword stuffing (>3% density)
  const plainText = content
    .replace(/<[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const totalWords = plainText.split(/\s+/).filter(Boolean).length
  if (totalWords > 0) {
    const density = calculateKeywordDensity(content, keyword)
    if (density > 3) {
      penalty += 1
    }
  }

  // Misleading titles or promises
  const misleadingTerms = ['무료', '보장', '확정', '100%']
  let misleadingCount = 0
  for (const term of misleadingTerms) {
    if (lowerContent.includes(term)) misleadingCount++
  }
  if (misleadingCount > 3) {
    penalty += 1
  }

  // Grammatical errors (rough estimate from typos)
  const typoPatterns = /\s{2,}|([a-z])\1{3,}|[.,]{2,}/g
  const typoCount = (content.match(typoPatterns) || []).length
  if (typoCount > 5) {
    penalty += 1
  }

  // Broken formatting
  const unclosedHtml = (content.match(/<[^/>]*(?!>)/g) || []).length
  if (unclosedHtml > 5) {
    penalty += 1
  }

  return Math.min(7, Math.max(0, 7 - penalty))
}

/**
 * Persona Tone: Content tone matches blog grade
 * Score: 0-6
 */
function calculatePersonaTone(content: string, blogGrade: Grade): number {
  let score = 0

  const lowerContent = content.toLowerCase()
  const wordCount = content.split(/\s+/).filter(Boolean).length

  // Grade-specific tone expectations
  switch (blogGrade) {
    case 'S':
      // Premium, authoritative, sophisticated
      if (
        lowerContent.includes('전문') ||
        lowerContent.includes('분석') ||
        lowerContent.includes('심층')
      ) {
        score += 2
      }
      if (wordCount > 1500) {
        score += 1
      }
      if (
        !lowerContent.includes('쉽게') &&
        !lowerContent.includes('간단히') &&
        !lowerContent.includes('누구나')
      ) {
        score += 1
      }
      break

    case 'A':
      // Quality, balanced
      if (
        lowerContent.includes('추천') ||
        lowerContent.includes('개인의견') ||
        lowerContent.includes('분석')
      ) {
        score += 2
      }
      if (wordCount > 1000) {
        score += 1
      }
      if (!lowerContent.includes('최고') && !lowerContent.includes('최고의')) {
        score += 1
      }
      break

    case 'B':
      // Accessible, helpful
      if (
        lowerContent.includes('방법') ||
        lowerContent.includes('추천') ||
        lowerContent.includes('도움')
      ) {
        score += 2
      }
      if (wordCount > 800) {
        score += 1
      }
      if (lowerContent.includes('쉽게') || lowerContent.includes('간단')) {
        score += 1
      }
      break

    case 'C':
      // Casual, engaging
      if (lowerContent.includes('재미') || lowerContent.includes('꿀팁') || lowerContent.includes('꼭')) {
        score += 2
      }
      if (wordCount > 500) {
        score += 1
      }
      if (lowerContent.includes('재밌') || lowerContent.includes('신기')) {
        score += 1
      }
      break

    case 'D':
      // Basic, quick
      score += 2 // Lower bar
      if (wordCount > 300) {
        score += 1
      }
      if (!lowerContent.includes('복잡')) {
        score += 1
      }
      break
  }

  return Math.min(6, score)
}

/**
 * SEO Compliance: H2 structure, meta hints, keyword placement
 * Score: 0-5
 */
function calculateSEOCompliance(content: string, keyword: string): number {
  let score = 0

  // H2 with keyword
  const h2Regex = /##\s+(.+)/g
  let h2WithKeyword = 0
  let match
  while ((match = h2Regex.exec(content)) !== null) {
    if (match[1].toLowerCase().includes(keyword.toLowerCase())) {
      h2WithKeyword++
    }
  }

  if (h2WithKeyword > 0) {
    score += 2
  } else {
    score += 1
  }

  // H2/H3 structure
  const h2Count = (content.match(/^##\s/gm) || []).length
  const h3Count = (content.match(/^###\s/gm) || []).length

  if (h2Count >= 2 && h3Count >= h2Count) {
    score += 2
  } else if (h2Count > 0) {
    score += 1
  }

  // Keyword in opening paragraph
  const lines = content.split('\n')
  if (lines.length > 2) {
    const firstPara = (lines[0] + ' ' + lines[1]).toLowerCase()
    if (firstPara.includes(keyword.toLowerCase())) {
      score += 1
    }
  }

  return Math.min(5, score)
}

/**
 * AI Search Optimization: FAQ, dense content, semantic clarity
 * Score: 0-5
 */
function calculateAISearchOptimization(content: string, keyword: string): number {
  let score = 0

  // FAQ presence
  const faqCount = (content.match(/<details>/gi) || []).length
  if (faqCount >= 2) {
    score += 2
  } else if (faqCount > 0) {
    score += 1
  }

  // Keyword density in good range
  const density = calculateKeywordDensity(content, keyword)
  if (density >= 1 && density <= 2) {
    score += 1.5
  } else if (density > 0) {
    score += 0.5
  }

  // Schema markup or semantic HTML
  if (
    content.includes('schema.org') ||
    content.includes('application/ld+json') ||
    content.includes('<details>')
  ) {
    score += 1.5
  }

  return Math.min(5, score)
}

/**
 * Ad Code Compliance: Proper ad section markers and compliance
 * Score: 0-5
 */
function calculateAdCodeCompliance(content: string): number {
  let score = 0

  // Ad section markers present
  if (content.includes('google_ad_section_start') && content.includes('google_ad_section_end')) {
    score += 2
  } else if (content.includes('google_ad_section')) {
    score += 1
  }

  // Proper ad section ratio
  const adMatch = content.match(/google_ad_section_start[\s\S]*?google_ad_section_end/g)
  if (adMatch) {
    const adLength = adMatch.reduce((sum, m) => sum + m.length, 0)
    const ratio = (adLength / content.length) * 100
    if (ratio >= 3 && ratio <= 20) {
      score += 2
    } else if (ratio > 0) {
      score += 1
    }
  }

  // No misplaced ad code
  if (!content.includes('onclick') || !content.match(/onclick.*ad/gi)) {
    score += 1
  }

  return Math.min(5, score)
}

/**
 * Helper: Check if keyword is event-related
 */
function checkIfEventKeyword(keyword: string): boolean {
  const lowerKeyword = keyword.toLowerCase()
  const eventTerms = ['이벤트', '행사', '축제', '시즌', '명절', '휴가', '여행', '쇼핑']

  for (const term of eventTerms) {
    if (lowerKeyword.includes(term)) {
      return true
    }
  }

  // Check against ANNUAL_EVENTS
  for (const eventMonth of ANNUAL_EVENTS) {
    for (const event of eventMonth.events) {
      if (lowerKeyword.includes(event.toLowerCase())) {
        return true
      }
    }
  }

  return false
}

/**
 * Helper: Extract event context from keyword
 */
function extractEventContext(keyword: string): string | null {
  const lowerKeyword = keyword.toLowerCase()

  // Check ANNUAL_EVENTS
  for (const eventMonth of ANNUAL_EVENTS) {
    for (const event of eventMonth.events) {
      if (lowerKeyword.includes(event.toLowerCase())) {
        return event
      }
    }
  }

  // Extract seasonal context
  const seasonalTerms = [
    '봄',
    '여름',
    '가을',
    '겨울',
    '설날',
    '추석',
    '크리스마스',
    '발렌타인',
  ]
  for (const term of seasonalTerms) {
    if (lowerKeyword.includes(term.toLowerCase())) {
      return term
    }
  }

  return null
}
