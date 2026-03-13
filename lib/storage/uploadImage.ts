import { createClient } from '@/lib/supabase/server'
import sharp from 'sharp'

const BUCKET = 'post-images'

/**
 * base64 이미지를 WebP로 변환 후 Supabase Storage에 업로드하고 공개 URL을 반환합니다.
 * 파일명: {userId}/{timestamp}-{random}.webp (ASCII 안전)
 * 이미지 SEO는 alt, title, figcaption의 한글 키워드로 처리됩니다.
 */
export async function uploadImageFromBase64(
  base64: string,
  mimeType: string,
  userId: string,
  imageTitle?: string
): Promise<string> {
  void imageTitle // SEO는 HTML alt/title/caption으로 처리
  const supabase = createClient()

  // WebP 변환
  const inputBuffer = Buffer.from(base64, 'base64')
  const webpBuffer = await sharp(inputBuffer)
    .webp({ quality: 85 })
    .toBuffer()

  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, webpBuffer, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (error) throw new Error(`Storage 업로드 실패: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}
