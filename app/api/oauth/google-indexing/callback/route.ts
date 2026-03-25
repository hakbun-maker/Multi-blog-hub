import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { encrypt } from '@/lib/utils/encryption'

export async function GET(request: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()
  const debug: Record<string, unknown> = { step: 'start', baseUrl }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.json({ step: 'google_error', error })
  }

  if (!code || !state) {
    return NextResponse.json({ step: 'missing_params', hasCode: !!code, hasState: !!state })
  }

  let stateData: { userId: string; blogId: string }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch (e) {
    return NextResponse.json({ step: 'invalid_state', error: String(e) })
  }

  const { userId, blogId } = stateData
  debug.userId = userId
  debug.blogId = blogId

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  debug.hasSupabaseUrl = !!supabaseUrl
  debug.hasServiceKey = !!serviceKey

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ...debug, step: 'missing_env' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET!
    const redirectUri = `${baseUrl}/api/oauth/google-indexing/callback`
    debug.redirectUri = redirectUri

    // Step 1: Token exchange
    debug.step = 'token_exchange'
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return NextResponse.json({ ...debug, step: 'token_exchange_failed', status: tokenRes.status, error: errText })
    }

    const tokenData = await tokenRes.json()
    debug.step = 'token_ok'
    debug.hasAccessToken = !!tokenData.access_token
    debug.hasRefreshToken = !!tokenData.refresh_token
    debug.expiresIn = tokenData.expires_in

    // Step 2: Email fetch
    let googleEmail: string | null = null
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json()
        googleEmail = userInfo.email || null
      }
    } catch {
      // ignore
    }
    debug.googleEmail = googleEmail

    // Step 3: Encrypt
    debug.step = 'encrypting'
    const encryptedAccess = encrypt(tokenData.access_token)
    const encryptedRefresh = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null
    debug.step = 'encrypted'

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    // Step 4: DB upsert
    debug.step = 'db_upsert'
    const { data: dbData, error: dbError } = await supabase
      .from('user_oauth_tokens')
      .upsert({
        user_id: userId,
        provider: 'google_indexing',
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        token_expires_at: expiresAt,
        scopes: 'indexing',
        google_account_id: googleEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (dbError) {
      return NextResponse.json({ ...debug, step: 'db_error', dbError })
    }

    debug.step = 'success'
    debug.dbData = dbData

    // Step 5: Verify it was saved
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_oauth_tokens')
      .select('id, user_id, provider, google_account_id, connected_at, updated_at')
      .eq('user_id', userId)
      .eq('provider', 'google_indexing')
      .single()

    debug.verify = verifyError ? { error: verifyError } : verifyData

    // DEBUG MODE: Return JSON instead of redirect
    return NextResponse.json({
      ...debug,
      message: 'SUCCESS! 토큰 저장 완료. 이 메시지가 보이면 디버그 모드입니다.',
      redirectWouldBe: `${baseUrl}/blogs/${blogId}/settings?tab=layout&gsc_connected=true`,
    })
  } catch (err) {
    return NextResponse.json({
      ...debug,
      step: 'catch_error',
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
}
