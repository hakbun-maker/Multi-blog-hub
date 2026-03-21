import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OAUTH_CONFIGS, getOAuthCredentials, getRedirectUri } from '@/lib/sns/oauth-config'
import type { SNSPlatform } from '@/lib/sns/oauth-config'
import { encrypt } from '@/lib/utils/encryption'

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform as SNSPlatform
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 플랫폼 유효성 검사
  if (!OAUTH_CONFIGS[platform]) {
    return NextResponse.redirect(`${baseUrl}/settings?error=unsupported_platform`)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  // 사용자가 인증을 거부한 경우
  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=sns&error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=missing_code_or_state`
    )
  }

  // state 디코딩
  let stateData: { userId: string; blogId: string }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings?error=invalid_state`)
  }

  const { userId, blogId } = stateData

  // 인증 확인 (현재 세션 사용자 = state의 userId)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return NextResponse.redirect(`${baseUrl}/settings?error=auth_mismatch`)
  }

  try {
    const { clientId, clientSecret, config } = getOAuthCredentials(platform)
    const redirectUri = getRedirectUri(platform)

    // Code → Access Token 교환
    let accessToken: string
    let additionalData: Record<string, string> = {}

    if (platform === 'twitter') {
      // Twitter OAuth 2.0 token exchange
      const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge', // PKCE plain method
        }).toString(),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        console.error('Twitter token exchange error:', err)
        throw new Error('Twitter 토큰 교환 실패')
      }

      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        additionalData.refreshToken = tokenData.refresh_token
      }
    } else if (platform === 'threads') {
      // Threads token exchange
      const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        }).toString(),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        console.error('Threads token exchange error:', err)
        throw new Error('Threads 토큰 교환 실패')
      }

      const tokenData = await tokenRes.json()
      accessToken = tokenData.access_token
      if (tokenData.user_id) {
        additionalData.platformUserId = tokenData.user_id
      }
    } else {
      // Instagram (Meta Graph API)
      const tokenRes = await fetch(config.tokenUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      // Meta uses GET with query params for token exchange
      const tokenUrl = new URL(config.tokenUrl)
      tokenUrl.searchParams.set('client_id', clientId)
      tokenUrl.searchParams.set('client_secret', clientSecret)
      tokenUrl.searchParams.set('redirect_uri', redirectUri)
      tokenUrl.searchParams.set('code', code)

      const metaRes = await fetch(tokenUrl.toString())

      if (!metaRes.ok) {
        const err = await metaRes.text()
        console.error('Instagram token exchange error:', err)
        throw new Error('Instagram 토큰 교환 실패')
      }

      const tokenData = await metaRes.json()
      accessToken = tokenData.access_token

      // Short-lived → Long-lived token 교환
      const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', clientId)
      longLivedUrl.searchParams.set('client_secret', clientSecret)
      longLivedUrl.searchParams.set('fb_exchange_token', accessToken)

      const llRes = await fetch(longLivedUrl.toString())
      if (llRes.ok) {
        const llData = await llRes.json()
        accessToken = llData.access_token || accessToken
      }
    }

    // Access Token 암호화 후 블로그 settings에 저장
    const encryptedToken = encrypt(accessToken)
    const encryptedRefreshToken = additionalData.refreshToken
      ? encrypt(additionalData.refreshToken)
      : undefined

    // 기존 블로그 설정 조회
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, settings')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()

    if (blogError || !blog) {
      throw new Error('블로그를 찾을 수 없습니다.')
    }

    const currentSettings = blog.settings || {}
    const currentSns = currentSettings.snsSettings || {}

    // 해당 플랫폼 설정 업데이트
    const updatedSns = {
      ...currentSns,
      [platform]: {
        ...currentSns[platform],
        enabled: true,
        accessToken: encryptedToken,
        ...(encryptedRefreshToken ? { refreshToken: encryptedRefreshToken } : {}),
        ...(additionalData.platformUserId ? { platformUserId: additionalData.platformUserId } : {}),
        connectedAt: new Date().toISOString(),
      },
    }

    // 블로그 설정 업데이트
    const { error: updateError } = await supabase
      .from('blogs')
      .update({
        settings: {
          ...currentSettings,
          snsSettings: updatedSns,
        },
      })
      .eq('id', blogId)

    if (updateError) {
      throw new Error('SNS 설정 저장 실패: ' + updateError.message)
    }

    // 블로그 설정의 SNS 탭으로 리디렉트 (성공)
    return NextResponse.redirect(
      `${baseUrl}/blogs/${blogId}/settings?tab=sns&connected=${platform}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth 콜백 처리 실패'
    console.error(`OAuth callback error (${platform}):`, message)
    return NextResponse.redirect(
      `${baseUrl}/blogs/${blogId}/settings?tab=sns&error=${encodeURIComponent(message)}`
    )
  }
}
