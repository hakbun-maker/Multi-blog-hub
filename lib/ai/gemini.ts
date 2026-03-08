import type { AIAdapter, AIProvider, GeneratePostParams, GeneratedPost } from './adapter'
import { buildPrompt, parseAIResponse } from './adapter'

export class GeminiAdapter implements AIAdapter {
  provider: AIProvider = 'gemini'

  constructor(private apiKey: string) {}

  private async callGemini(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Gemini API 오류: ${err.error?.message ?? response.statusText}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  async generatePost(params: GeneratePostParams): Promise<GeneratedPost> {
    const text = await this.callGemini(buildPrompt(params))
    return parseAIResponse(text, params.blogId)
  }

  async generateText(prompt: string): Promise<string> {
    return this.callGemini(prompt)
  }
}
