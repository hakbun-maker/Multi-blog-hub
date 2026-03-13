import type { AIAdapter, AIProvider, GeneratePostParams, GeneratedPost } from './adapter'
import { buildPrompt, parseAIResponse } from './adapter'

export class ClaudeAdapter implements AIAdapter {
  provider: AIProvider = 'claude'

  constructor(private apiKey: string) {}

  private async callClaude(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Claude API 오류: ${err.error?.message ?? response.statusText}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text ?? ''
  }

  async generatePost(params: GeneratePostParams): Promise<GeneratedPost> {
    const text = await this.callClaude(buildPrompt(params))
    return parseAIResponse(text, params.blogId)
  }

  async generateText(prompt: string): Promise<string> {
    return this.callClaude(prompt)
  }
}
