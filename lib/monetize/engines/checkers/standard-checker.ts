import type { IntentType } from '@/types/monetize'
import { calculateKeywordDensity } from '../post-processor'
import { PASONA_WEIGHTS } from '../../constants'

export interface StandardCheckResult {
  discoveryScore: number // 0-17
  persuasionScore: number // 0-18
  conversionScore: number // 0-15
  totalScore: number
  breakdown: {
    // Discovery (0-17)
    seoBasics: number
    aiSearchOptimization: number
    // Persuasion (0-18)
    pasonaStructure: number
    intentAlignment: number
    readability: number
    // Conversion (0-15)
    adSections: number
    conversionInducement: number
  }
  weakAreas: string[]
}

export function checkStandard(params: {
  content: string
  keyword: string
  intentType: IntentType
  adCategory: string | null
}): StandardCheckResult {
  const { content, keyword, intentType, adCategory } = params
  const breakdown = {
    seoBasics: 0,
    aiSearchOptimization: 0,
    pasonaStructure: 0,
    intentAlignment: 0,
    readability: 0,
    adSections: 0,
    conversionInducement: 0,
  }

  // ========== DISCOVERY AXIS (0-17) ==========
  // SEO Basics (0-10)
  breakdown.seoBasics = calculateSEOBasics(content, keyword)

  // AI Search Optimization (0-7)
  breakdown.aiSearchOptimization = calculateAISearchOptimization(content, keyword)

  const discoveryScore = Math.min(17, breakdown.seoBasics + breakdown.aiSearchOptimization)

  // ========== PERSUASION AXIS (0-18) ==========
  // PASONA Structure (0-8)
  breakdown.pasonaStructure = calculatePasonaStructure(content, intentType)

  // Intent Alignment (0-5)
  breakdown.intentAlignment = calculateIntentAlignment(content, keyword, intentType)

  // Readability (0-5)
  breakdown.readability = calculateReadability(content)

  const persuasionScore = Math.min(
    18,
    breakdown.pasonaStructure + breakdown.intentAlignment + breakdown.readability
  )

  // ========== CONVERSION AXIS (0-15) ==========
  // Ad Sections (0-8)
  breakdown.adSections = calculateAdSections(content, adCategory)

  // Conversion Inducement (0-7)
  breakdown.conversionInducement = calculateConversionInducement(content, keyword)

  const conversionScore = Math.min(15, breakdown.adSections + breakdown.conversionInducement)

  const totalScore = Math.round(discoveryScore + persuasionScore + conversionScore)

  // Identify weak areas
  const weakAreas: string[] = []
  if (breakdown.seoBasics < 5) weakAreas.push('SEO 기본요소')
  if (breakdown.aiSearchOptimization < 3.5) weakAreas.push('AI 검색 최적화')
  if (breakdown.pasonaStructure < 4) weakAreas.push('PASONA 구조')
  if (breakdown.intentAlignment < 2.5) weakAreas.push('의도 적합성')
  if (breakdown.readability < 2.5) weakAreas.push('가독성')
  if (breakdown.adSections < 4) weakAreas.push('광고 섹션')
  if (breakdown.conversionInducement < 3.5) weakAreas.push('전환 유도')

  return {
    discoveryScore,
    persuasionScore,
    conversionScore,
    totalScore,
    breakdown,
    weakAreas,
  }
}

/**
 * SEO Basics: H2 with keyword, meta description hints, structure
 * Score: 0-10
 */
function calculateSEOBasics(content: string, keyword: string): number {
  let score = 0

  // H2 with keyword (max 3 points)
  const h2Regex = /##\s+(.+)/g
  let h2WithKeyword = 0
  let match
  while ((match = h2Regex.exec(content)) !== null) {
    if (match[1].toLowerCase().includes(keyword.toLowerCase())) {
      h2WithKeyword++
    }
  }
  score += Math.min(3, h2WithKeyword * 1)

  // Meta description hints: has title-like intro paragraph (max 2 points)
  const lines = content.split('\n')
  if (lines.length > 1 && lines[0].length > 20 && lines[0].length < 160) {
    score += 2
  }

  // Structure: H2/H3 count adequate (2-5 H2s for good structure) (max 3 points)
  const h2Count = (content.match(/^##\s/gm) || []).length
  if (h2Count >= 2 && h2Count <= 5) {
    score += 3
  } else if (h2Count > 1) {
    score += 2
  }

  // H3 count (at least 1 per H2) (max 2 points)
  const h3Count = (content.match(/^###\s/gm) || []).length
  if (h3Count >= h2Count) {
    score += 2
  } else if (h3Count > 0) {
    score += 1
  }

  return Math.min(10, score)
}

/**
 * AI Search Optimization: Keyword density, FAQ details tags, JSON-LD
 * Score: 0-7
 */
function calculateAISearchOptimization(content: string, keyword: string): number {
  let score = 0

  // Keyword density 1-2% (max 3 points)
  const density = calculateKeywordDensity(content, keyword)
  if (density >= 1 && density <= 2) {
    score += 3
  } else if (density > 0.5 && density < 3) {
    score += 2
  } else if (density > 0) {
    score += 1
  }

  // FAQ details tags (max 2 points)
  const detailsCount = (content.match(/<details>/gi) || []).length
  if (detailsCount >= 3) {
    score += 2
  } else if (detailsCount > 0) {
    score += 1
  }

  // JSON-LD schema presence (max 2 points)
  if (content.includes('schema.org') || content.includes('application/ld+json')) {
    score += 2
  } else if (content.includes('structured data')) {
    score += 1
  }

  return Math.min(7, score)
}

/**
 * PASONA Structure: Presence of [P], [A], [S], [O], [N], [A2] sections
 * Score: 0-8
 */
function calculatePasonaStructure(content: string, intentType: IntentType): number {
  let score = 0

  const sections = {
    P: content.includes('## [P]') || content.includes('## [문제]'),
    A: content.includes('## [A]') || content.includes('## [공감]'),
    S: content.includes('## [S]') || content.includes('## [솔루션]'),
    O: content.includes('## [O]') || content.includes('## [오퍼]'),
    N: content.includes('## [N]') || content.includes('## [좁혀]'),
    A2: content.includes('## [A2]') || content.includes('## [액션]'),
  }

  // Get expected weights for this intent type
  const weights = PASONA_WEIGHTS[intentType]
  const totalWeight = weights.P + weights.A + weights.S + weights.O + weights.N + weights.A2

  // Score based on presence of sections weighted by importance
  if (sections.P) score += (weights.P / totalWeight) * 8
  if (sections.A) score += (weights.A / totalWeight) * 8
  if (sections.S) score += (weights.S / totalWeight) * 8
  if (sections.O) score += (weights.O / totalWeight) * 8
  if (sections.N) score += (weights.N / totalWeight) * 8
  if (sections.A2) score += (weights.A2 / totalWeight) * 8

  // Normalize to max 8
  return Math.min(8, Math.round(score * 100) / 100)
}

/**
 * Intent Alignment: Content matches intent type characteristics
 * Score: 0-5
 */
function calculateIntentAlignment(
  content: string,
  keyword: string,
  intentType: IntentType
): number {
  let score = 0

  const lowerContent = content.toLowerCase()

  switch (intentType) {
    case 'AD':
      // Should have product/service mentions, pricing, calls to action
      if (lowerContent.includes('구매') || lowerContent.includes('가격') || lowerContent.includes('주문')) {
        score += 3
      }
      if (lowerContent.includes('지금') || lowerContent.includes('클릭')) {
        score += 2
      }
      break

    case 'REVIEW':
      // Should have comparison, pros/cons, personal experience
      if (
        lowerContent.includes('장점') ||
        lowerContent.includes('단점') ||
        lowerContent.includes('비교')
      ) {
        score += 3
      }
      if (lowerContent.includes('별점') || lowerContent.includes('평가')) {
        score += 2
      }
      break

    case 'COMPARE':
      // Should compare alternatives, have vs sections
      if (
        lowerContent.includes('vs') ||
        lowerContent.includes('차이') ||
        lowerContent.includes('다른점')
      ) {
        score += 3
      }
      if (lowerContent.includes('추천') || lowerContent.includes('선택')) {
        score += 2
      }
      break

    case 'CRITIC':
      // Should be critical, analysis-heavy
      if (lowerContent.includes('분석') || lowerContent.includes('비판') || lowerContent.includes('문제')) {
        score += 3
      }
      if (lowerContent.includes('개선') || lowerContent.includes('해결')) {
        score += 2
      }
      break

    case 'INFO':
      // Should be informative, how-to style
      if (lowerContent.includes('방법') || lowerContent.includes('가이드') || lowerContent.includes('단계')) {
        score += 3
      }
      if (lowerContent.includes('설명') || lowerContent.includes('정보')) {
        score += 2
      }
      break

    case 'TREND':
      // Should discuss trends, current relevance
      if (lowerContent.includes('트렌드') || lowerContent.includes('최신') || lowerContent.includes('2024')) {
        score += 3
      }
      if (lowerContent.includes('미래') || lowerContent.includes('예측')) {
        score += 2
      }
      break
  }

  return Math.min(5, score)
}

/**
 * Readability: Sentence/paragraph length, word breaks, formatting
 * Score: 0-5
 */
function calculateReadability(content: string): number {
  let score = 0

  // Remove markdown and HTML for readability analysis
  const plainText = content
    .replace(/#+ /g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  const sentences = plainText.match(/[.!?]/g) || []
  const paragraphs = plainText.split('\n\n').filter(p => p.trim().length > 0)
  const words = plainText.split(/\s+/).filter(Boolean)

  if (words.length === 0) return 0

  // Average sentence length should be 15-25 words
  const avgSentenceLength = words.length / sentences.length
  if (avgSentenceLength >= 15 && avgSentenceLength <= 25) {
    score += 2
  } else if (avgSentenceLength > 10 && avgSentenceLength < 35) {
    score += 1
  }

  // Should have multiple paragraphs
  if (paragraphs.length >= 4) {
    score += 1.5
  } else if (paragraphs.length >= 2) {
    score += 1
  }

  // Check for variety in formatting (lists, bold, etc)
  if (
    content.includes('- ') ||
    content.includes('* ') ||
    content.includes('**') ||
    content.includes('`')
  ) {
    score += 1.5
  }

  return Math.min(5, score)
}

/**
 * Ad Sections: google_ad_section tags, proper placement
 * Score: 0-8
 */
function calculateAdSections(content: string, adCategory: string | null): number {
  let score = 0

  // Has ad section markers (max 3 points)
  if (content.includes('google_ad_section_start') && content.includes('google_ad_section_end')) {
    score += 3
  } else if (content.includes('google_ad_section') || content.includes('<!-- Ad Section')) {
    score += 2
  }

  // Ad section ratio 5-15% of content (max 3 points)
  const adSectionRegex = /google_ad_section_start[\s\S]*?google_ad_section_end/g
  if (adSectionRegex.test(content)) {
    const adLength = (content.match(adSectionRegex) || []).reduce(
      (sum, match) => sum + match.length,
      0
    )
    const ratio = (adLength / content.length) * 100
    if (ratio >= 5 && ratio <= 15) {
      score += 3
    } else if (ratio > 0 && ratio < 20) {
      score += 2
    }
  }

  // Ad category specified (max 2 points)
  if (adCategory && adCategory.length > 0) {
    score += 2
  }

  return Math.min(8, score)
}

/**
 * Conversion Inducement: CTA, internal links, persuasive language
 * Score: 0-7
 */
function calculateConversionInducement(content: string, keyword: string): number {
  let score = 0

  const lowerContent = content.toLowerCase()

  // Clear CTA presence (max 2 points)
  if (
    lowerContent.includes('지금 시작') ||
    lowerContent.includes('클릭') ||
    lowerContent.includes('구매하기') ||
    lowerContent.includes('더보기')
  ) {
    score += 2
  } else if (lowerContent.includes('링크') || lowerContent.includes('바로가기')) {
    score += 1
  }

  // Internal link markers (max 2 points)
  if (content.includes('[') && content.includes('](')) {
    const linkCount = (content.match(/\[([^\]]+)\]\([^\)]+\)/g) || []).length
    if (linkCount >= 3) {
      score += 2
    } else if (linkCount > 0) {
      score += 1
    }
  }

  // Persuasive keywords: urgency, exclusivity, benefit
  let persuasiveCount = 0
  const persuasiveTerms = ['한정', '특별', '추천', '최고', '최상', '프리미엄', '혜택', '이점']
  for (const term of persuasiveTerms) {
    if (lowerContent.includes(term)) persuasiveCount++
  }

  if (persuasiveCount >= 3) {
    score += 2
  } else if (persuasiveCount > 0) {
    score += 1
  }

  // Keyword emphasis (bold/strong keyword)
  if (content.includes(`**${keyword}**`) || content.includes(`__${keyword}__`)) {
    score += 1
  }

  return Math.min(7, score)
}
