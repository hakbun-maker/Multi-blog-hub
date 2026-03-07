import { createClient } from '@/lib/supabase/server'

const BUCKET = 'post-images'

/**
 * base64 이미지를 Supabase Storage에 업로드하고 공개 URL을 반환합니다.
 * 파일 경로: {userId}/{timestamp}-{random}.{ext}
 */
export async function uploadImageFromBase64(
  base64: string,
  mimeType: string,
  userId: string
): Promise<string> {
  const supabase = createClient()

  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(base64, 'base64')

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) throw new Error(`Storage 업로드 실패: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}
