import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt, encrypt } from '@/lib/utils/encryption'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
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

  const supabase = createClient()
  await supabase
    .from('user_oauth_tokens')
    .update({
      encrypted_access_token: encrypt(data.access_token),
      token_expires_at: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'google_indexing')

  return data.access_token
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { blogId } = await request.json()
  if (!blogId) return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })

  // 블로그 정보 조회
  const { data: blog } = await supabase
    .from('blogs')
    .select('slug, custom_domain')
    .eq('id', blogId)
    .eq('user_id', user.id)
    .single()

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  // OAuth 토큰 조회
  const { data: token } = await supabase
    .from('user_oauth_tokens')
    .select('encrypted_access_token, encrypted_refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'google_indexing')
    .single()

  if (!token) {
    return NextResponse.json({ error: 'Google 연결이 필요합니다. 먼저 Google 계정을 연결해주세요.' }, { status: 400 })
  }

  let accessToken = decrypt(token.encrypted_access_token)

  // 토큰 만료 시 갱신
  if (token.token_expires_at && new Date(token.token_expires_at) <= new Date()) {
    if (!token.encrypted_refresh_token) {
      return NextResponse.json({ error: '토큰이 만료되었습니다. Google 계정을 재연결해주세요.' }, { status: 400 })
    }
    const newToken = await refreshAccessToken(user.id, decrypt(token.encrypted_refresh_token))
    if (!newToken) {
      return NextResponse.json({ error: '토큰 갱신 실패. Google 계정을 재연결해주세요.' }, { status: 400 })
    }
    accessToken = newToken
  }

  const siteUrl = blog.custom_domain
    ? `https://${blog.custom_domain}`
    : `${APP_URL}/blog/${blog.slug}`

  const sitemapUrl = `${siteUrl}/sitemap.xml`

  // GSC Sitemaps API: PUT으로 제출
  const encodedSiteUrl = encodeURIComponent(siteUrl)
  const encodedSitemapUrl = encodeURIComponent(sitemapUrl)

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps/${encodedSitemapUrl}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (res.status === 403) {
    return NextResponse.json({
      error: 'Google Indexing 연결을 재설정해주세요. (webmasters 권한 필요)',
      needsReconnect: true,
    }, { status: 403 })
  }

  if (!res.ok) {
    const errText = await res.text()
    console.error('GSC Sitemaps API error:', errText)
    // 404 = 사이트가 GSC에 아직 등록 안 됨
    if (res.status === 404) {
      return NextResponse.json({
        error: 'GSC에 사이트 속성이 없습니다. Google Search Console에서 먼저 속성을 추가하고 소유권을 확인해주세요.',
        needsProperty: true,
      }, { status: 404 })
    }
    return NextResponse.json({ error: `사이트맵 제출 실패 (${res.status})` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sitemapUrl })
}
