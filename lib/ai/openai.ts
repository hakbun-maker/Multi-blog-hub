import type { AIAdapter, AIProvider, GeneratePostParams, GeneratedPost } from './adapter'
import { buildPrompt, parseAIResponse } from './adapter'

export class OpenAIAdapter implements AIAdapter {
  provider: AIProvider = 'openai'

  constructor(private apiKey: string) {}

  async generatePost(params: GeneratePostParams): Promise<GeneratedPost> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildPrompt(params) }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API 오류: ${err.error?.message ?? response.statusText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    return parseAIResponse(text, params.blogId)
  }
}
