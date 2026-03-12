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
          generationConfig: {
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`Gemini API 오류: ${(err as { error?: { message?: string } })?.error?.message ?? response.statusText}`)
    }

    const data = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    // Gemini는 여러 parts를 반환할 수 있음 (thinking + response)
    const parts = data.candidates?.[0]?.content?.parts ?? []
    // 마지막 text part가 실제 응답
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].text) return parts[i].text!
    }
    return ''
  }

  async generatePost(params: GeneratePostParams): Promise<GeneratedPost> {
    const text = await this.callGemini(buildPrompt(params))
    return parseAIResponse(text, params.blogId)
  }

  async generateText(prompt: string): Promise<string> {
    return this.callGemini(prompt)
  }
}
