import type { AIAdapter, AIProvider, GeneratePostParams, GeneratedPost } from './adapter'
import { buildPrompt, parseAIResponse } from './adapter'

export class GeminiAdapter implements AIAdapter {
  provider: AIProvider = 'gemini'

  constructor(private apiKey: string) {}

  async generatePost(params: GeneratePostParams): Promise<GeneratedPost> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(params) }] }],
          generationConfig: { maxOutputTokens: 4096 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Gemini API 오류: ${err.error?.message ?? response.statusText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return parseAIResponse(text, params.blogId)
  }
}
