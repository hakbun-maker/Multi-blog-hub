export type AIProvider = 'claude' | 'openai' | 'gemini'
export type ImageProvider = 'imagen'
export type AnyAIProvider = AIProvider | ImageProvider

export interface AICharacterConfig {
  name?: string
  tone?: string
  style?: string
  persona?: string
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
}

// 공통 프롬프트 빌더
export function buildPrompt(params: GeneratePostParams): string {
  const { keyword, relatedKeywords = [], characterConfig = {}, targetLength = 'medium' } = params
  const lengthMap = { short: '500~800자', medium: '1200~1800자', long: '2500~3500자' }

  return `당신은 SEO 최적화 블로그 글을 작성하는 전문 작가입니다.
${characterConfig.persona ? `캐릭터 설정: ${characterConfig.persona}` : ''}
${characterConfig.tone ? `글쓰기 톤: ${characterConfig.tone}` : ''}
${characterConfig.style ? `글쓰기 스타일: ${characterConfig.style}` : ''}

다음 조건으로 블로그 글을 작성하세요:
- 주제 키워드: ${keyword}
- 연관 키워드: ${relatedKeywords.join(', ') || '없음'}
- 목표 길이: ${lengthMap[targetLength]}
- 형식: 마크다운 (제목 #, 소제목 ##)
- SEO를 위해 키워드를 자연스럽게 포함

반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "글 제목",
  "content": "마크다운 본문 전체",
  "tags": ["태그1", "태그2", "태그3"],
  "seoTitle": "SEO 메타 제목 (60자 이내)",
  "seoDescription": "SEO 메타 설명 (160자 이내)"
}`
}

// 마크다운 → HTML 변환
export function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(?!<[hup])/gm, '')
    .trim()
}

export function parseAIResponse(text: string, blogId: string): GeneratedPost {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다.')

  const parsed = JSON.parse(jsonMatch[0])
  const content = parsed.content ?? ''
  return {
    blogId,
    title: parsed.title ?? '(제목 없음)',
    content,
    htmlContent: markdownToHtml(content),
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    seoMeta: {
      title: parsed.seoTitle ?? parsed.title ?? '',
      description: parsed.seoDescription ?? '',
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
