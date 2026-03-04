import type { AIAdapter, AIProvider, GeneratePostParams, GeneratedPost } from './adapter'
import { buildPrompt, parseAIResponse } from './adapter'

export class ClaudeAdapter implements AIAdapter {
  provider: AIProvider = 'claude'

  constructor(private apiKey: string) {}

  async generatePost(params: GeneratePostParams): Promise<GeneratedPost> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildPrompt(params) }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Claude API 오류: ${err.error?.message ?? response.statusText}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    return parseAIResponse(text, params.blogId)
  }
}
