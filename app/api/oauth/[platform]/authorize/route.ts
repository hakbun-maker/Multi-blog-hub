import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { OAUTH_CONFIGS, getOAuthCredentials, getRedirectUri } from '@/lib/sns/oauth-config'
import type { SNSPlatform } from '@/lib/sns/oauth-config'
import { randomBytes } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform as SNSPlatform

  // 플랫폼 유효성 검사
  if (!OAUTH_CONFIGS[platform]) {
    return NextResponse.json(
      { error: '지원하지 않는 플랫폼입니다.' },
      { status: 400 }
    )
  }

  // 인증 확인
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  // blogId 필수
  const blogId = request.nextUrl.searchParams.get('blogId')
  if (!blogId) {
    return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })
  }

  try {
    const { clientId, config } = getOAuthCredentials(platform)
    const redirectUri = getRedirectUri(platform)

    // CSRF 방지를 위한 state 생성 (userId + blogId + random 포함)
    const stateData = JSON.stringify({
      userId: user.id,
      blogId,
      nonce: randomBytes(16).toString('hex'),
    })
    const state = Buffer.from(stateData).toString('base64url')

    // 플랫폼별 인증 URL 구성
    let authUrl: string

    if (platform === 'twitter') {
      // Twitter OAuth 2.0 with PKCE
      const codeChallenge = randomBytes(32).toString('base64url')
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes.join(' '),
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'plain',
      })
      authUrl = `${config.authorizeUrl}?${authParams.toString()}`
    } else {
      // Instagram / Threads (Meta OAuth)
      const authParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes.join(','),
        response_type: 'code',
        state,
      })
      authUrl = `${config.authorizeUrl}?${authParams.toString()}`
    }

    return NextResponse.redirect(authUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth 인증 시작 실패'
    console.error(`OAuth authorize error (${platform}):`, message)
    // 환경변수 미설정 등의 에러는 설정 페이지로 리디렉트
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${baseUrl}/blogs/${blogId}/settings?tab=sns&error=${encodeURIComponent(message)}`
    )
  }
}
