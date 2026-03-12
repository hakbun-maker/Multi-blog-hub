export type AIProvider = 'claude' | 'openai' | 'gemini'
export type ImageProvider = 'imagen'
export type AnyAIProvider = AIProvider | ImageProvider

export interface AICharacterConfig {
  name?: string
  tone?: string
  style?: string
  persona?: string
  writingFormat?: string
  speechExamples?: string
}

export interface GeneratePostParams {
  keyword: string
  relatedKeywords?: string[]
  characterConfig?: AICharacterConfig
  imageCount?: number
  blogId: string
  targetLength?: 'short' | 'medium' | 'long'
}

export interface GeneratedPost {
  blogId: string
  title: string
  content: string       // markdown
  htmlContent: string   // HTML
  tags: string[]
  seoMeta: { title: string; description: string }
}

export interface AIAdapter {
  provider: AIProvider
  generatePost(params: GeneratePostParams): Promise<GeneratedPost>
  generateText(prompt: string): Promise<string>
}

// 공통 프롬프트 빌더
export function buildPrompt(params: GeneratePostParams): string {
  const { keyword, relatedKeywords = [], characterConfig = {}, targetLength = 'medium' } = params
  const lengthMap = { short: '500~800자', medium: '1200~1800자', long: '2500~3500자' }

  const sections = [
    '당신은 SEO 최적화 블로그 글을 작성하는 전문 작가입니다.',
    characterConfig.persona ? `\n## 페르소나\n${characterConfig.persona}` : '',
    characterConfig.tone ? `\n## 글쓰기 톤\n${characterConfig.tone}` : '',
    characterConfig.style ? `\n## 글쓰기 스타일\n${characterConfig.style}` : '',
    characterConfig.writingFormat ? `\n## 글쓰기 포맷\n${characterConfig.writingFormat}` : '',
    characterConfig.speechExamples ? `\n## 말투 예시 (이 말투를 참고하여 작성)\n${characterConfig.speechExamples}` : '',
  ].filter(Boolean).join('\n')

  return `${sections}

다음 조건으로 블로그 글을 작성하세요:
- 주제 키워드: ${keyword}
- 연관 키워드: ${relatedKeywords.join(', ') || '없음'}
- 목표 길이: ${lengthMap[targetLength]}
- 형식: 마크다운 (제목 #, 소제목 ##)
- SEO를 위해 키워드를 자연스럽게 포함

반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력:
- content 필드의 줄바꿈은 반드시 \\n으로 이스케이프
- 큰따옴표는 \\"로 이스케이프
{
  "title": "글 제목",
  "content": "마크다운 본문 전체 (줄바꿈은 \\n으로)",
  "tags": ["태그1", "태그2", "태그3"],
  "seoTitle": "SEO 메타 제목 (60자 이내)",
  "seoDescription": "SEO 메타 설명 (160자 이내)"
}`
}

// 마크다운 → HTML 변환
export function markdownToHtml(markdown: string): string {
  if (!markdown?.trim()) return ''

  const lines = markdown.split('\n')
  const htmlParts: string[] = []
  let inList = false
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const text = paragraphLines.join(' ').trim()
      if (text) htmlParts.push(`<p>${text}</p>`)
      paragraphLines = []
    }
  }

  const flushList = () => {
    if (inList) {
      htmlParts.push('</ul>')
      inList = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // 빈 줄 → 단락 구분
    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    // 헤딩
    const h3 = trimmed.match(/^### (.+)$/)
    if (h3) { flushParagraph(); flushList(); htmlParts.push(`<h3>${h3[1]}</h3>`); continue }
    const h2 = trimmed.match(/^## (.+)$/)
    if (h2) { flushParagraph(); flushList(); htmlParts.push(`<h2>${h2[1]}</h2>`); continue }
    const h1 = trimmed.match(/^# (.+)$/)
    if (h1) { flushParagraph(); flushList(); htmlParts.push(`<h1>${h1[1]}</h1>`); continue }

    // 리스트 아이템
    const li = trimmed.match(/^[-*] (.+)$/)
    if (li) {
      flushParagraph()
      if (!inList) { htmlParts.push('<ul>'); inList = true }
      htmlParts.push(`<li>${li[1]}</li>`)
      continue
    }

    // 일반 텍스트 → 단락에 축적
    flushList()
    paragraphLines.push(trimmed)
  }

  flushParagraph()
  flushList()

  // 인라인 스타일 적용
  return htmlParts.join('\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

export function parseAIResponse(text: string, blogId: string): GeneratedPost {
  // 1) 코드블록 제거 (```json ... ```)
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()

  // 2) JSON 파싱 시도
  let parsed: Record<string, unknown> | null = null

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    // 2a) 직접 파싱
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // 2b) 닫는 } 보충
      try {
        let candidate = jsonMatch[0]
        const opens = (candidate.match(/\{/g) ?? []).length
        const closes = (candidate.match(/\}/g) ?? []).length
        if (opens > closes) candidate += '}'.repeat(opens - closes)
        parsed = JSON.parse(candidate)
      } catch { /* 2c로 진행 */ }
    }
  }

  // 2c) JSON.parse 실패 → regex로 개별 필드 추출 (content의 이스케이프 문제 대응)
  if (!parsed) {
    const titleMatch = cleaned.match(/"title"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)
    const tagsMatch = cleaned.match(/"tags"\s*:\s*\[([\s\S]*?)\]/)
    const seoTitleMatch = cleaned.match(/"seoTitle"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)
    const seoDescMatch = cleaned.match(/"seoDescription"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)

    // content 추출: "content" 필드 시작 위치를 찾고, 다음 최상위 필드까지의 값을 가져옴
    let rawContent = ''
    const contentStart = cleaned.match(/"content"\s*:\s*"/)
    if (contentStart && contentStart.index !== undefined) {
      const valueStart = contentStart.index + contentStart[0].length
      // 이스케이프된 따옴표를 건너뛰며 content 값의 끝 따옴표를 찾음
      let i = valueStart
      while (i < cleaned.length) {
        if (cleaned[i] === '\\') { i += 2; continue }
        if (cleaned[i] === '"') break
        i++
      }
      rawContent = cleaned.slice(valueStart, i)
    }

    if (titleMatch || rawContent) {
      // 이스케이프된 문자 복원
      const content = rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      const tagStr = tagsMatch?.[1] ?? ''
      const tags = tagStr.match(/"((?:[^"\\]|\\.)*)"/g)?.map(t => t.replace(/^"|"$/g, '')) ?? []

      return {
        blogId,
        title: titleMatch?.[1]?.replace(/\\"/g, '"') ?? '(제목 없음)',
        content,
        htmlContent: markdownToHtml(content),
        tags,
        seoMeta: {
          title: seoTitleMatch?.[1]?.replace(/\\"/g, '"') ?? titleMatch?.[1] ?? '',
          description: seoDescMatch?.[1]?.replace(/\\"/g, '"') ?? '',
        },
      }
    }

    throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다. 다시 시도해주세요.')
  }

  const content = (parsed.content as string) ?? ''
  return {
    blogId,
    title: (parsed.title as string) ?? '(제목 없음)',
    content,
    htmlContent: markdownToHtml(content),
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    seoMeta: {
      title: (parsed.seoTitle as string) ?? (parsed.title as string) ?? '',
      description: (parsed.seoDescription as string) ?? '',
    },
  }
}

// 이미지 어댑터 팩토리
export async function createImageAdapter(provider: ImageProvider, apiKey: string) {
  switch (provider) {
    case 'imagen': {
      const { ImagenAdapter } = await import('./imagen')
      return new ImagenAdapter(apiKey)
    }
  }
}

// 텍스트 어댑터 팩토리
export async function createAIAdapter(provider: AIProvider, apiKey: string): Promise<AIAdapter> {
  switch (provider) {
    case 'claude': {
      const { ClaudeAdapter } = await import('./claude')
      return new ClaudeAdapter(apiKey)
    }
    case 'openai': {
      const { OpenAIAdapter } = await import('./openai')
      return new OpenAIAdapter(apiKey)
    }
    case 'gemini': {
      const { GeminiAdapter } = await import('./gemini')
      return new GeminiAdapter(apiKey)
    }
  }
}
