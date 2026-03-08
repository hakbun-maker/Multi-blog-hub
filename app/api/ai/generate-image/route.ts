import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'
import { createImageAdapter, createAIAdapter } from '@/lib/ai/adapter'
import { uploadImageFromBase64 } from '@/lib/storage/uploadImage'

/** 한글이 포함되어 있는지 확인 */
function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)
}

/** AI를 사용하여 한글 프롬프트를 영어로 번역 */
async function translateToEnglish(
  text: string,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  // 사용자의 AI 키 조회 (번역용)
  const { data: aiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('provider', ['claude', 'openai', 'gemini'])
    .limit(1)

  if (!aiKeys?.length) return text // 번역 키 없으면 원문 반환

  try {
    const key = decrypt(aiKeys[0].encrypted_key)
    const adapter = await createAIAdapter(aiKeys[0].provider, key)
    const translated = await adapter.generateText(
      `Translate the following Korean image generation prompt to English. Output ONLY the translated prompt, nothing else:\n\n${text}`
    )
    return translated.trim() || text
  } catch {
    return text // 번역 실패 시 원문
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { prompt, count = 1, aspectRatio = '16:9', imageTitle } = body as {
    prompt: string
    count?: number
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
    imageTitle?: string
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt는 필수입니다.' }, { status: 400 })
  }

  // 한글 프롬프트인 경우 자동 영어 번역
  let finalPrompt = prompt.trim()
  if (containsKorean(finalPrompt)) {
    finalPrompt = await translateToEnglish(finalPrompt, supabase, user.id)
  }

  // 사용자의 imagen API 키 조회
  const { data: keyRow, error: keyError } = await supabase
    .from('ai_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('provider', 'imagen')
    .eq('is_active', true)
    .single()

  if (keyError || !keyRow) {
    return NextResponse.json(
      { error: 'Imagen API 키가 등록되지 않았습니다. 설정 > AI API에서 등록하세요.' },
      { status: 400 }
    )
  }

  let apiKey: string
  try {
    apiKey = decrypt(keyRow.encrypted_key)
  } catch {
    return NextResponse.json({ error: 'API 키 복호화에 실패했습니다. 키를 다시 등록해주세요.' }, { status: 500 })
  }

  try {
    const adapter = await createImageAdapter('imagen', apiKey)
    if (!adapter) {
      return NextResponse.json({ error: 'Imagen 어댑터 초기화에 실패했습니다.' }, { status: 500 })
    }

    const images = await adapter.generateImage({
      prompt: finalPrompt,
      count: Math.min(Math.max(count, 1), 4),
      aspectRatio,
    })

    if (!images || images.length === 0) {
      return NextResponse.json({ error: '이미지가 생성되지 않았습니다. 프롬프트를 수정해보세요.' }, { status: 500 })
    }

    // Supabase Storage에 WebP 변환 후 업로드, 공개 URL 반환
    const urls = await Promise.all(
      images.map(img => uploadImageFromBase64(img.base64, img.mimeType, user.id, imageTitle))
    )

    return NextResponse.json({ images: urls.map(url => ({ url })) })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '이미지 생성 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
