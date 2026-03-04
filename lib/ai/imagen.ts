/**
 * Google Imagen 어댑터
 *
 * Google Imagen 3 API를 사용한 이미지 생성
 * API 문서: https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
 *
 * 인증: Google AI Studio API Key (Gemini API Key와 동일)
 * - 엔드포인트: https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict
 */

export interface GenerateImageParams {
  prompt: string
  negativePrompt?: string
  count?: number          // 1~4
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
}

export interface GeneratedImage {
  base64: string          // base64 인코딩된 PNG 이미지
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [
            {
              prompt,
              ...(negativePrompt ? { negativePrompt } : {}),
            },
          ],
          parameters: {
            sampleCount: Math.min(Math.max(count, 1), 4),
            aspectRatio,
            safetyFilterLevel: 'BLOCK_SOME',
            personGeneration: 'ALLOW_ADULT',
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(
        `Imagen API 오류 (${response.status}): ${
          (err as { error?: { message?: string } })?.error?.message ?? response.statusText
        }`
      )
    }

    const data = (await response.json()) as {
      predictions?: { bytesBase64Encoded?: string; mimeType?: string }[]
    }

    return (data.predictions ?? []).map(p => ({
      base64: p.bytesBase64Encoded ?? '',
      mimeType: p.mimeType ?? 'image/png',
    }))
  }

  /**
   * API 키 유효성 검증
   * 작은 1:1 이미지 1장 생성 시도로 테스트
   */
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
