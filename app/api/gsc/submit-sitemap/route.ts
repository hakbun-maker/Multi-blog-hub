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
    return NextResponse.json({ error: 'Google 계정이 연결되지 않았습니다.' }, { status: 400 })
  }

  let accessToken = decrypt(token.encrypted_access_token)

  // 토큰 만료 시 갱신
  if (token.token_expires_at && new Date(token.token_expires_at) <= new Date()) {
    if (!token.encrypted_refresh_token) {
      return NextResponse.json({ error: '토큰이 만료되었습니다. Google Indexing 연결을 해제하고 다시 연결해주세요.' }, { status: 400 })
    }
    const newToken = await refreshAccessToken(user.id, decrypt(token.encrypted_refresh_token))
    if (!newToken) {
      return NextResponse.json({ error: '토큰 갱신 실패. Google Indexing 연결을 해제하고 다시 연결해주세요.' }, { status: 400 })
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

  if (!res.ok) {
    const errText = await res.text()
    console.error(`GSC Sitemaps API error (${res.status}):`, errText)

    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(errText) } catch { /* ignore */ }
    const message = (parsed?.error as Record<string, unknown>)?.message as string ?? ''

    if (res.status === 403) {
      // API 미활성화
      if (message.includes('has not been used') || message.includes('disabled')) {
        return NextResponse.json({
          error: 'Google Cloud 프로젝트에서 Search Console API가 활성화되지 않았습니다. Google Cloud Console → API 및 서비스 → Search Console API를 활성화해주세요.',
          errorType: 'api_not_enabled',
        }, { status: 403 })
      }
      // 스코프 부족
      if (message.includes('insufficient') || message.includes('scope')) {
        return NextResponse.json({
          error: 'Google Indexing 연결 권한이 부족합니다. 위의 "연결 해제" 버튼을 눌러 Google Indexing 연결을 끊은 후 다시 연결해주세요.',
          errorType: 'insufficient_scope',
        }, { status: 403 })
      }
      // 사이트 미등록/권한 없음
      return NextResponse.json({
        error: `Google Search Console에 "${siteUrl}" 속성이 없거나 접근 권한이 없습니다. GSC에서 속성을 추가하고 소유권 확인을 완료한 후 다시 시도해주세요.`,
        errorType: 'no_gsc_property',
      }, { status: 403 })
    }

    if (res.status === 404) {
      return NextResponse.json({
        error: `Google Search Console에 "${siteUrl}" 속성이 등록되어 있지 않습니다. GSC에서 속성을 추가하고 소유권을 확인해주세요.`,
        errorType: 'no_gsc_property',
      }, { status: 404 })
    }

    return NextResponse.json({ error: `사이트맵 제출 실패 (${res.status}): ${message || errText}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sitemapUrl })
}
