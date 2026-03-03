// AI 어댑터 인터페이스 - 07-coding-convention.md 기준
export interface AICharacterConfig {
  tone: string      // 친근한 | 전문적 | 유머러스 | 격식체
  style: string     // 정보성 | 스토리텔링 | 리뷰형 | 목록형
  persona: string   // 캐릭터 이름/설명
  language: string  // ko | en
}

export interface GeneratePostParams {
  keyword: string
  relatedKeywords: string[]
  characterConfig: AICharacterConfig
  imageCount: number
  blogId: string
}

export interface GeneratedPost {
  blogId: string
  title: string
  content: string
  htmlContent: string
  keywords: string[]
}

export interface AIAdapter {
  generatePost(params: GeneratePostParams): Promise<GeneratedPost>
}

export type AIProvider = 'claude' | 'openai' | 'gemini'

// 팩토리 함수 - 구현은 각 어댑터 파일에서
export async function createAIAdapter(
  provider: AIProvider,
  apiKey: string
): Promise<AIAdapter> {
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
