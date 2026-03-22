import { decrypt, encrypt } from '@/lib/utils/encryption'
import { createClient } from '@/lib/supabase/server'

/**
 * 유효한 Google OAuth 액세스 토큰을 반환합니다.
 * 만료된 경우 refresh_token으로 자동 갱신합니다.
 */
export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const supabase = createClient()

  const { data: tokenRow } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google_analytics')
    .single()

  if (!tokenRow) return null

  // 만료 5분 전까지는 기존 토큰 사용
  const expiresAt = tokenRow.token_expires_at
    ? new Date(tokenRow.token_expires_at)
    : null
  const isExpired = expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000

  if (!isExpired) {
    return decrypt(tokenRow.encrypted_access_token)
  }

  // refresh_token이 없으면 재연결 필요
  if (!tokenRow.encrypted_refresh_token) return null

  const refreshToken = decrypt(tokenRow.encrypted_refresh_token)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!res.ok) return null

  const data = await res.json()

  // 갱신된 토큰 DB 업데이트
  await supabase
    .from('user_oauth_tokens')
    .update({
      encrypted_access_token: encrypt(data.access_token),
      token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google_analytics')

  return data.access_token
}
