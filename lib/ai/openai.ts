import type { AIAdapter, AIProvider, GeneratePostParams, GeneratedPost } from './adapter'
import { buildPrompt, parseAIResponse } from './adapter'
import { pickThemeForBlogType } from '@/lib/utils/post-themes'

export class OpenAIAdapter implements AIAdapter {
  provider: AIProvider = 'openai'

  constructor(private apiKey: string) {}

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        // 수익화 글이 8192 토큰 초과해서 잘리는 문제 해결 (gpt-4o는 16k 출력 지원)
        max_tokens: 16384,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API 오류: ${err.error?.message ?? response.statusText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  async generatePost(params: GeneratePostParams): Promise<GeneratedPost> {
    const text = await this.callOpenAI(buildPrompt(params))
    const theme = pickThemeForBlogType(params.blogType).id
    return parseAIResponse(text, params.blogId, params.useToc ?? false, theme)
  }

  async generateText(prompt: string): Promise<string> {
    return this.callOpenAI(prompt)
  }
}
