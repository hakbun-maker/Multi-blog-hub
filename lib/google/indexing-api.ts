import type { SupabaseClient } from '@supabase/supabase-js'
import { decrypt, encrypt } from '@/lib/utils/encryption'

// provider 값 상수화 — typo로 인한 silent miss 방지
const PROVIDER = 'google_indexing' as const

async function refreshAccessToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string,
): Promise<{ token: string | null; errorCode?: string; errorDetail?: string }> {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return { token: null, errorCode: 'env_missing', errorDetail: 'GOOGLE_ANALYTICS_CLIENT_ID/SECRET 환경변수 누락' }
  }

  console.log('[Indexing API] 토큰 갱신 시도:', {
    userId,
    clientIdPrefix: clientId.slice(0, 12) + '...',
    refreshTokenPrefix: refreshToken.slice(0, 8) + '...',
    refreshTokenLength: refreshToken.length,
  })

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

  if (!res.ok) {
    const errorBody = await res.text()
    let parsed: { error?: string; error_description?: string } = {}
    try {
      parsed = JSON.parse(errorBody)
    } catch { /* not JSON */ }
    console.error('[Indexing API] 토큰 갱신 실패:', {
      userId,
      status: res.status,
      statusText: res.statusText,
      googleError: parsed.error,
      googleErrorDescription: parsed.error_description,
      rawBody: errorBody.slice(0, 500),
    })
    return {
      token: null,
      errorCode: parsed.error,
      errorDetail: parsed.error_description || errorBody.slice(0, 200),
    }
  }

  const data = await res.json()
  const newAccessToken = data.access_token as string

  console.log('[Indexing API] 토큰 갱신 성공:', {
    userId,
    expiresIn: data.expires_in,
    hasNewRefreshToken: !!data.refresh_token,
  })

  // DB에 갱신된 토큰 저장 — 호출자가 전달한 인증 client로 update (RLS 통과)
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  const { error: updateErr } = await supabase
    .from('user_oauth_tokens')
    .update({
      encrypted_access_token: encrypt(newAccessToken),
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', PROVIDER)

  if (updateErr) {
    console.error('[Indexing API] 토큰 갱신 후 DB update 실패:', updateErr)
  }

  return { token: newAccessToken }
}

/**
 * Google Indexing API에 URL 알림 제출.
 *
 * @param supabase 호출자가 인증한 supabase client (cookie 기반 createClient or service role 둘 다 가능)
 *                 cookie 기반은 RLS의 `user_id = auth.uid()`로 본인 row를 조회/갱신할 수 있음
 *                 service role은 RLS 우회로 모든 row 접근 가능
 * @param userId 글 작성자(=토큰 소유자) user_id
 * @param url    색인 요청할 글 URL
 */
export async function submitUrlToGoogle(
  supabase: SupabaseClient,
  userId: string,
  url: string,
): Promise<{ ok: boolean; error?: string; needsConnection?: boolean }> {
  console.log('[Indexing API] 호출:', {
    userId,
    url,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40),
  })

  // 토큰 조회 — 전달받은 client로 (RLS 통과 또는 우회)
  const { data: token, error: tokenErr } = await supabase
    .from('user_oauth_tokens')
    .select('encrypted_access_token, encrypted_refresh_token, token_expires_at, provider, google_account_id')
    .eq('user_id', userId)
    .eq('provider', PROVIDER)
    .single()

  if (tokenErr || !token) {
    // 진단: 같은 user_id의 모든 provider row 조회 (어떤 provider로 저장됐는지 확인)
    const { data: allRows, error: allErr } = await supabase
      .from('user_oauth_tokens')
      .select('provider, google_account_id, token_expires_at')
      .eq('user_id', userId)

    console.error('[Indexing API] 토큰 조회 실패:', {
      userId,
      lookingFor: PROVIDER,
      tokenError: tokenErr ? { code: tokenErr.code, message: tokenErr.message, details: tokenErr.details } : null,
      allRowsCount: allRows?.length ?? 0,
      allRowsProviders: allRows?.map(r => ({ provider: r.provider, account: r.google_account_id })),
      allRowsError: allErr ? { code: allErr.code, message: allErr.message } : null,
    })

    // PGRST116: row 없음 → needsConnection
    const isNotFound = !tokenErr || tokenErr.code === 'PGRST116'
    return {
      ok: false,
      error: isNotFound ? 'GSC 미연결' : `DB 조회 오류: ${tokenErr?.message}`,
      needsConnection: isNotFound,
    }
  }

  console.log('[Indexing API] 토큰 상태:', {
    userId,
    url,
    hasAccessToken: !!token.encrypted_access_token,
    hasRefreshToken: !!token.encrypted_refresh_token,
    tokenExpiresAt: token.token_expires_at,
    isExpired: token.token_expires_at ? new Date(token.token_expires_at) <= new Date() : null,
    minutesUntilExpiry: token.token_expires_at
      ? Math.round((new Date(token.token_expires_at).getTime() - Date.now()) / 60000)
      : null,
  })

  let accessToken = decrypt(token.encrypted_access_token)

  // 토큰 만료 확인 → 갱신 (만료 5분 전부터 미리 갱신해 race 회피)
  const isExpiringSoon = token.token_expires_at
    && new Date(token.token_expires_at).getTime() <= Date.now() + 5 * 60 * 1000
  if (isExpiringSoon) {
    if (!token.encrypted_refresh_token) {
      console.error('[Indexing API] refresh_token 없음:', { userId })
      return { ok: false, error: '재연결 필요 (refresh_token 없음)', needsConnection: true }
    }
    const refreshToken = decrypt(token.encrypted_refresh_token)
    const refreshResult = await refreshAccessToken(supabase, userId, refreshToken)
    if (!refreshResult.token) {
      const isPermanent = refreshResult.errorCode === 'invalid_grant'
      const detail = refreshResult.errorDetail
        ? ` (${refreshResult.errorCode}: ${refreshResult.errorDetail})`
        : ''
      // invalid_grant는 영구 무효 → DB에서 죽은 토큰 row 삭제 (다음 호출부터 GSC 미연결로 깔끔히 처리)
      if (isPermanent) {
        const { error: delErr } = await supabase
          .from('user_oauth_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('provider', PROVIDER)
        console.warn('[Indexing API] invalid_grant 토큰 자동 삭제:', {
          userId,
          deleteError: delErr?.message,
          message: '재연결 필요 — UI에서 GSC를 다시 연결하세요',
        })
      }
      return {
        ok: false,
        error: isPermanent ? `재연결 필요${detail}` : `토큰 갱신 실패${detail}`,
        needsConnection: isPermanent,
      }
    }
    accessToken = refreshResult.token
  }

  // Google Indexing API 호출
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`[Indexing API] 호출 실패 ${url}:`, { status: res.status, body: err.slice(0, 500) })
    if (res.status === 401) {
      // 401: 토큰 만료/무효. refresh_token이 있으면 강제 갱신 후 1회 재시도
      if (token.encrypted_refresh_token) {
        const refreshToken = decrypt(token.encrypted_refresh_token)
        const refreshResult = await refreshAccessToken(supabase, userId, refreshToken)
        if (refreshResult.token) {
          const retry = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshResult.token}`,
            },
            body: JSON.stringify({ url, type: 'URL_UPDATED' }),
          })
          if (retry.ok) {
            console.log(`[Indexing API] 재시도 성공: ${url}`)
            return { ok: true }
          }
          const retryErr = await retry.text()
          return { ok: false, error: `Indexing API 재시도 실패: ${retry.status} ${retryErr.slice(0, 200)}` }
        }
        const isPermanent = refreshResult.errorCode === 'invalid_grant'
        return {
          ok: false,
          error: isPermanent ? '재연결 필요 (invalid_grant)' : '토큰 갱신 실패 (401 후)',
          needsConnection: isPermanent,
        }
      }
      return { ok: false, error: '인증 실패 (401) — 재연결 필요', needsConnection: true }
    }
    if (res.status === 403) {
      return {
        ok: false,
        error: 'Indexing API 오류: 403 — Google Cloud Console에서 "Web Search Indexing API" 활성화 필요',
      }
    }
    return { ok: false, error: `Indexing API 오류: ${res.status}` }
  }

  console.log(`[Indexing API] 색인 요청 성공: ${url}`)
  return { ok: true }
}
