import { createClient } from '@supabase/supabase-js'
import { decrypt, encrypt } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET!

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  if (!res.ok) return null

  const data = await res.json()
  const newAccessToken = data.access_token as string

  // DB에 갱신된 토큰 저장
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  await supabase
    .from('user_oauth_tokens')
    .update({
      encrypted_access_token: encrypt(newAccessToken),
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google_indexing')

  return newAccessToken
}

export async function submitUrlToGoogle(userId: string, url: string): Promise<{ ok: boolean; error?: string }> {
  // 토큰 조회
  const { data: token } = await supabase
    .from('user_oauth_tokens')
    .select('encrypted_access_token, encrypted_refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_indexing')
    .single()

  if (!token) {
    return { ok: false, error: 'Google Indexing 토큰이 없습니다.' }
  }

  let accessToken = decrypt(token.encrypted_access_token)

  // 토큰 만료 확인 → 갱신
  if (token.token_expires_at && new Date(token.token_expires_at) <= new Date()) {
    if (!token.encrypted_refresh_token) {
      return { ok: false, error: 'refresh_token이 없습니다.' }
    }
    const refreshToken = decrypt(token.encrypted_refresh_token)
    const newToken = await refreshAccessToken(userId, refreshToken)
    if (!newToken) {
      return { ok: false, error: '토큰 갱신 실패' }
    }
    accessToken = newToken
  }

  // Indexing API 호출
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      url,
      type: 'URL_UPDATED',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`Google Indexing API error for ${url}:`, err)
    if (res.status === 403) {
      return {
        ok: false,
        error: 'Indexing API 오류: 403 — Google Cloud Console에서 "Web Search Indexing API"를 활성화하세요. (APIs & Services > Enable APIs > "Indexing API" 검색 > 사용 설정)',
      }
    }
    return { ok: false, error: `Indexing API 오류: ${res.status}` }
  }

  console.log(`Google Indexing API: submitted ${url}`)
  return { ok: true }
}
