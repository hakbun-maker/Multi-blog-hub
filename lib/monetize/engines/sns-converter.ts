import type { IntentType } from '@/types/monetize'

export interface SNSConversionResult {
  text: string
  hashtags: string[]
  characterCount: number
  platform: 'instagram' | 'twitter' | 'threads'
}

const PLATFORM_LIMITS = {
  instagram: { charLimit: 2200, hashtagLimit: 30, requiresImage: true },
  twitter: { charLimit: 280, hashtagLimit: 2, requiresImage: false },
  threads: { charLimit: 500, hashtagLimit: 5, requiresImage: false },
} as const

/**
 * SNS Converter: Blog post → platform-specific content
 * Uses PASONA P→A→S teaser + CTA format
 */
export async function convertToSNS(params: {
  content: string
  keyword: string
  platform: 'instagram' | 'twitter' | 'threads'
  intentType: IntentType
  aiApiKey: string
  aiModel?: string
}): Promise<SNSConversionResult> {
  const model = params.aiModel || 'claude-sonnet-4-20250514'
  const limits = PLATFORM_LIMITS[params.platform]

  // Build PASONA-based teaser prompt
  const pasonaPrompt = buildSNSPasonaPrompt(params)

  // Call Claude to generate teaser
  const teaserText = await callClaudeAPI(params.aiApiKey, model, pasonaPrompt)

  // Generate platform-specific hashtags
  const hashtagPrompt = buildHashtagPrompt({
    keyword: params.keyword,
    content: teaserText,
    hashtagLimit: limits.hashtagLimit,
    platform: params.platform,
  })

  const hashtagsRaw = await callClaudeAPI(params.aiApiKey, model, hashtagPrompt)
  const hashtags = parseHashtags(hashtagsRaw, limits.hashtagLimit)

  // Trim content if needed and add hashtags
  const finalText = trimToLimit(teaserText, limits.charLimit - hashtagsToString(hashtags).length)
  const charCount = finalText.length + hashtagsToString(hashtags).length

  return {
    text: finalText,
    hashtags,
    characterCount: charCount,
    platform: params.platform,
  }
}

function buildSNSPasonaPrompt(params: {
  content: string
  keyword: string
  platform: string
  intentType: IntentType
}): string {
  const { content, keyword, platform, intentType } = params

  // Extract P→A→S from the content (simplified extraction)
  const lines = content.split('\n').filter((l) => l.trim())
  const firstThirdIdx = Math.ceil(lines.length / 3)
  const firstThird = lines.slice(0, firstThirdIdx).join(' ')

  const problemMatch = firstThird.match(/(문제|문제점|어려움|고민|걱정)[\s\S]{0,200}/i)
  const problem = problemMatch ? problemMatch[0] : ''

  const solutionLines = lines.slice(firstThirdIdx)
  const solutionMatch = solutionLines.join(' ').match(/(해결|방법|솔루션|답|대안)[\s\S]{0,200}/i)
  const solution = solutionMatch ? solutionMatch[0] : ''

  const callToActionMap: Record<string, string> = {
    instagram: '지금 팔로우하고 더 알아보기 👆',
    twitter: '더 자세히 읽기 →',
    threads: '전문 가이드 확인하기',
  }

  return `당신은 숙련된 SNS 마케터입니다.

블로그 글을 ${platform} 형식의 짧은 포스트로 변환합니다.
- 키워드: "${keyword}"
- Intent: ${intentType}
- 플랫폼: ${platform}

원본 블로그 글:
${content}

요청사항:
1. PASONA 구조 활용 (Problem → Agitation → Solution)
2. 문제점: "${problem || content.slice(0, 100)}"
3. 해결책: "${solution || content.slice(100, 200)}"
4. 행동유도: "${callToActionMap[platform as keyof typeof callToActionMap]}"
5. 명확하고 임팩트 있는 문체
6. ${platform === 'twitter' ? '280자 이내' : platform === 'instagram' ? '2200자 이내' : '500자 이내'}

변환된 포스트만 반환 (추가 설명 없이):`.trim()
}

function buildHashtagPrompt(params: {
  keyword: string
  content: string
  hashtagLimit: number
  platform: string
}): string {
  return `키워드 "${params.keyword}"과 다음 텍스트를 바탕으로 ${params.platform} 적합 해시태그를 ${params.hashtagLimit}개 생성하세요.

텍스트: ${params.content}

요청사항:
1. 정확히 ${params.hashtagLimit}개의 해시태그 생성
2. 각 해시태그는 # 기호로 시작
3. 공백으로 구분
4. 인기 있고 관련성 높은 태그 선택
5. 해시태그만 반환 (다른 설명 제외)

해시태그:`.trim()
}

async function callClaudeAPI(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(`Claude API error: ${res.status} - ${(errorData as any).error?.message || 'Unknown'}`)
  }

  const data = await res.json()
  return (data as any).content?.[0]?.text || ''
}

function parseHashtags(raw: string, limit: number): string[] {
  const hashtags = raw
    .split(/\s+/)
    .filter((tag) => tag.startsWith('#'))
    .map((tag) => tag.replace(/^#+/, '').toLowerCase())
    .filter((tag) => tag.length > 0)
    .slice(0, limit)

  // Ensure we have tags (fallback to generic ones)
  if (hashtags.length === 0) {
    return Array.from({ length: Math.min(limit, 3) }, (_, i) => `tag${i + 1}`)
  }

  return hashtags
}

function trimToLimit(text: string, charLimit: number): string {
  if (text.length <= charLimit) return text

  const trimmed = text.slice(0, charLimit)
  const lastSpace = trimmed.lastIndexOf(' ')
  return lastSpace > charLimit * 0.8 ? trimmed.slice(0, lastSpace) : trimmed
}

function hashtagsToString(hashtags: string[]): string {
  return ' ' + hashtags.map((tag) => `#${tag}`).join(' ')
}
