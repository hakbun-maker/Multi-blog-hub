import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { encrypt } from '@/lib/utils/encryption'

export async function GET(request: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?error=missing_code_or_state`)
  }

  // state 디코딩
  let stateData: { userId: string; blogId: string }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings?error=invalid_state`)
  }

  const { userId, blogId } = stateData

  // 인증 확인
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return NextResponse.redirect(`${baseUrl}/settings?error=auth_mismatch`)
  }

  try {
    const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET!
    const redirectUri = `${baseUrl}/api/oauth/google-analytics/callback`

    // Code → Token 교환
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
      const err = await tokenRes.text()
      console.error('Google token exchange error:', err)
      throw new Error('Google 토큰 교환 실패')
    }

    const tokenData = await tokenRes.json()

    // Google 계정 이메일 조회 (표시용)
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
      // 이메일 조회 실패해도 진행
    }

    // 토큰 암호화
    const encryptedAccess = encrypt(tokenData.access_token)
    const encryptedRefresh = tokenData.refresh_token
      ? encrypt(tokenData.refresh_token)
      : null

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    // user_oauth_tokens 테이블에 upsert
    const { error: dbError } = await supabase
      .from('user_oauth_tokens')
      .upsert({
        user_id: user.id,
        provider: 'google_analytics',
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        token_expires_at: expiresAt,
        scopes: 'analytics.edit',
        google_account_id: googleEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (dbError) throw new Error('토큰 저장 실패: ' + dbError.message)

    // 블로그 레이아웃 설정 페이지로 리디렉트
    return NextResponse.redirect(
      `${baseUrl}/blogs/${blogId}/settings?tab=layout&ga_connected=true`
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth 콜백 처리 실패'
    console.error('Google Analytics OAuth callback error:', message)
    return NextResponse.redirect(
      `${baseUrl}/blogs/${blogId}/settings?tab=layout&error=${encodeURIComponent(message)}`
    )
  }
}
