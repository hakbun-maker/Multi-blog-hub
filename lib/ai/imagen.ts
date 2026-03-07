/**
 * Google 이미지 생성 어댑터
 *
 * 1순위: Imagen 3 (imagen-3.0-generate-001) — 일부 지역/키에서 사용 불가
 * 2순위: Gemini 2.0 Flash Image Generation — 동일 API 키, 더 넓은 가용성
 *
 * 인증: Google AI Studio API Key (AIzaSy...)
 */

export interface GenerateImageParams {
  prompt: string
  negativePrompt?: string
  count?: number          // 1~4
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
}

export interface GeneratedImage {
  base64: string
  mimeType: string
}

export class ImagenAdapter {
  readonly provider = 'imagen' as const
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const { prompt, negativePrompt, count = 1, aspectRatio = '16:9' } = params

    // 1순위: Imagen 3
    try {
      return await this._generateWithImagen3(prompt, negativePrompt, count, aspectRatio)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // 404 = 지역/키 미지원 → Gemini Flash로 폴백
      if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
        return await this._generateWithGeminiFlash(prompt, aspectRatio, count)
      }
      throw err
    }
  }

  /** Imagen 3 (predict 엔드포인트) */
  private async _generateWithImagen3(
    prompt: string,
    negativePrompt: string | undefined,
    count: number,
    aspectRatio: string
  ): Promise<GeneratedImage[]> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt, ...(negativePrompt ? { negativePrompt } : {}) }],
          parameters: {
            sampleCount: Math.min(Math.max(count, 1), 4),
            aspectRatio,
            safetyFilterLevel: 'BLOCK_SOME',
            personGeneration: 'ALLOW_ADULT',
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        `Imagen API 오류 (${res.status}): ${
          (err as { error?: { message?: string } })?.error?.message ?? res.statusText
        }`
      )
    }

    const data = (await res.json()) as {
      predictions?: { bytesBase64Encoded?: string; mimeType?: string }[]
    }
    return (data.predictions ?? []).map(p => ({
      base64: p.bytesBase64Encoded ?? '',
      mimeType: p.mimeType ?? 'image/png',
    }))
  }

  /**
   * Gemini 2.0 Flash Image Generation (generateContent 엔드포인트)
   * Imagen 3를 사용할 수 없는 지역/키에서 자동으로 사용됩니다.
   * count만큼 순차 요청합니다 (Gemini Flash는 1회에 1장 생성).
   */
  private async _generateWithGeminiFlash(
    prompt: string,
    aspectRatio: string,
    count: number
  ): Promise<GeneratedImage[]> {
    const aspectHint: Record<string, string> = {
      '16:9': 'landscape 16:9 aspect ratio',
      '9:16': 'portrait 9:16 aspect ratio',
      '1:1': 'square 1:1 aspect ratio',
      '4:3': '4:3 aspect ratio',
      '3:4': '3:4 portrait aspect ratio',
    }
    const fullPrompt = `${prompt}. ${aspectHint[aspectRatio] ?? ''}`

    const results: GeneratedImage[] = []
    const total = Math.min(Math.max(count, 1), 4)

    for (let i = 0; i < total; i++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          `Gemini Image API 오류 (${res.status}): ${
            (err as { error?: { message?: string } })?.error?.message ?? res.statusText
          }`
        )
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
      }

      const parts = data.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.data) {
          results.push({
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType ?? 'image/png',
          })
        }
      }
    }

    if (results.length === 0) {
      throw new Error('이미지가 생성되지 않았습니다. 프롬프트를 영어로 수정하거나 다른 내용을 시도해보세요.')
    }
    return results
  }

  async testConnection(): Promise<boolean> {
    try {
      const images = await this.generateImage({
        prompt: 'A simple blue circle on white background',
        count: 1,
        aspectRatio: '1:1',
      })
      return images.length > 0 && images[0].base64.length > 0
    } catch {
      return false
    }
  }
}

export async function createImagenAdapter(apiKey: string): Promise<ImagenAdapter> {
  return new ImagenAdapter(apiKey)
}
