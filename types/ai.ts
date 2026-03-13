export type AIProvider = 'claude' | 'openai' | 'gemini'

export interface GeneratePostInput {
  keyword: string
  relatedKeywords?: string[]
  characterConfig?: {
    name?: string
    tone?: string
    style?: string
    persona?: string
  }
  imageCount?: number
  targetLength?: 'short' | 'medium' | 'long'
}

export interface GeneratedPost {
  title: string
  content: string        // markdown
  htmlContent: string    // HTML
  tags: string[]
  seoMeta: {
    title: string
    description: string
  }
}

export interface AIAdapter {
  provider: AIProvider
  generatePost(input: GeneratePostInput): Promise<GeneratedPost>
}
