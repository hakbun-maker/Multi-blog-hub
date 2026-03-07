import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'
import { createImageAdapter } from '@/lib/ai/adapter'
import { uploadImageFromBase64 } from '@/lib/storage/uploadImage'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { prompt, count = 1, aspectRatio = '16:9' } = body as {
    prompt: string
    count?: number
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt는 필수입니다.' }, { status: 400 })
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
      prompt,
      count: Math.min(Math.max(count, 1), 4),
      aspectRatio,
    })

    if (!images || images.length === 0) {
      return NextResponse.json({ error: '이미지가 생성되지 않았습니다. 프롬프트를 수정해보세요.' }, { status: 500 })
    }

    // Supabase Storage에 업로드 후 공개 URL 반환
    const urls = await Promise.all(
      images.map(img => uploadImageFromBase64(img.base64, img.mimeType, user.id))
    )

    return NextResponse.json({ images: urls.map(url => ({ url })) })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '이미지 생성 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
