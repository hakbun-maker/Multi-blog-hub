import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const blogId = request.nextUrl.searchParams.get('blogId')
  if (!blogId) return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })

  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID
  if (!clientId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${baseUrl}/blogs/${blogId}/settings?tab=layout&error=${encodeURIComponent('GOOGLE_ANALYTICS_CLIENT_ID 환경변수가 설정되지 않았습니다.')}`
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/oauth/google-indexing/callback`

  const stateData = JSON.stringify({
    userId: user.id,
    blogId,
    nonce: randomBytes(16).toString('hex'),
  })
  const state = Buffer.from(stateData).toString('base64url')

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/indexing https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent select_account',
    state,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`
  )
}
