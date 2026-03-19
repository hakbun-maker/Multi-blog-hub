/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IntentType, BlogLanguage } from '@/types/monetize'

export interface PostProcessResult {
  content: string
  jsonLd: string
  keywordDensity: number
  adSectionRatio: number
}

/** L3 후처리: 광고 태그 검증 + JSON-LD + 키워드 밀도 */
export function postProcess(params: {
  content: string
  keyword: string
  intentType: IntentType
  language: BlogLanguage
  blogUrl?: string
}): PostProcessResult {
  let content = params.content

  // 1. Verify/add ad section tags
  content = ensureAdSections(content)

  // 2. Check keyword density
  const keywordDensity = calculateKeywordDensity(content, params.keyword)

  // 3. Calculate ad section ratio
  const adSectionRatio = calculateAdSectionRatio(content)

  // 4. Generate JSON-LD
  const jsonLd = generateJsonLd(content, params.keyword, params.blogUrl)

  return { content, jsonLd, keywordDensity, adSectionRatio }
}

function ensureAdSections(content: string): string {
  if (!content.includes('google_ad_section_start')) {
    // Find [S] and [O] sections and wrap
    content = content.replace(
      /(## \[S\][\s\S]*?)(\n## \[O\])/,
      '$1\n<!-- google_ad_section_start(name=solution) -->\n$2'
    )
    content = content.replace(
      /(## \[N\][\s\S]*?)(\n## \[A2?\])/,
      '<!-- google_ad_section_end -->\n$1$2'
    )
  }
  return content
}

export function calculateKeywordDensity(content: string, keyword: string): number {
  const plainText = content.replace(/<[^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const totalWords = plainText.split(/\s+/).filter(Boolean).length
  if (totalWords === 0) return 0

  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const keywordCount = (plainText.match(regex) || []).length

  return Math.round((keywordCount / totalWords) * 100 * 100) / 100
}

function calculateAdSectionRatio(content: string): number {
  const adSectionMatch = content.match(/google_ad_section_start[\s\S]*?google_ad_section_end/g)
  if (!adSectionMatch) return 0

  const adLength = adSectionMatch.reduce((sum, match) => sum + match.length, 0)
  return Math.round((adLength / content.length) * 100 * 100) / 100
}

function generateJsonLd(content: string, keyword: string, blogUrl?: string): string {
  // Extract FAQ from <details> tags
  const faqRegex = /<details>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)\s*<\/details>/g
  const faqs: { question: string; answer: string }[] = []
  let match
  while ((match = faqRegex.exec(content)) !== null) {
    faqs.push({ question: match[1].trim(), answer: match[2].trim() })
  }

  const schemas: any[] = []

  // Article schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: keyword,
    url: blogUrl || '',
    datePublished: new Date().toISOString(),
  })

  // FAQ schema
  if (faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    })
  }

  return `<script type="application/ld+json">${JSON.stringify(schemas)}</script>`
}
