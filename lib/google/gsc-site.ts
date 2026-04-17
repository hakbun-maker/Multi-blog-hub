/**
 * Google Search Console 사이트 자동 등록 유틸리티
 *
 * 순차적 등록 흐름:
 * 1. Site Verification API → 인증 토큰(메타태그) 요청
 * 2. 블로그 layout_config에 메타태그 자동 저장 → 페이지에 삽입
 * 3. Site Verification API → 소유권 확인 요청
 * 4. Webmasters API → 사이트 추가
 * 5. Webmasters API → 사이트맵 제출
 */

import { createClient } from '@supabase/supabase-js'
import { decrypt, encrypt } from '@/lib/utils/encryption'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** OAuth 토큰 조회 + 만료 시 자동 갱신 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = getServiceSupabase()

  const { data: token } = await supabase
    .from('user_oauth_tokens')
    .select('encrypted_access_token, encrypted_refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_indexing')
    .single()

  if (!token) return null

  let accessToken = decrypt(token.encrypted_access_token)

  // 토큰 만료 시 갱신
  if (token.token_expires_at && new Date(token.token_expires_at) <= new Date()) {
    if (!token.encrypted_refresh_token) return null
    const refreshToken = decrypt(token.encrypted_refresh_token)

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
    accessToken = data.access_token

    await supabase
      .from('user_oauth_tokens')
      .update({
        encrypted_access_token: encrypt(accessToken),
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'google_indexing')
  }

  return accessToken
}

/** 블로그의 GSC 사이트 URL 생성 */
export function getBlogSiteUrl(blog: { slug: string; custom_domain?: string | null }): string {
  return blog.custom_domain
    ? `https://${blog.custom_domain}`
    : `${APP_URL}/blog/${blog.slug}`
}

// ─── Step 1: 소유권 인증 토큰 요청 ─────────────────────────────────────────

/** Google Site Verification API로 META 태그 토큰 요청 */
async function getVerificationToken(accessToken: string, siteUrl: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const res = await fetch('https://www.googleapis.com/siteVerification/v1/token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site: { type: 'SITE', identifier: siteUrl },
      verificationMethod: 'META',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`SiteVerification getToken error (${res.status}):`, errText)
    return { ok: false, error: `인증 토큰 요청 실패 (${res.status})` }
  }

  const data = await res.json()
  // data.token = '<meta name="google-site-verification" content="xxxxx" />'
  // content 값만 추출
  const match = data.token?.match(/content="([^"]+)"/)
  const tokenValue = match ? match[1] : data.token

  return { ok: true, token: tokenValue }
}

// ─── Step 2: 메타태그를 블로그에 저장 ───────────────────────────────────────

async function saveVerificationTokenToBlog(blogId: string, token: string): Promise<void> {
  const supabase = getServiceSupabase()

  const { data: blogData } = await supabase
    .from('blogs')
    .select('layout_config')
    .eq('id', blogId)
    .single()

  const layoutConfig = (blogData?.layout_config ?? {}) as Record<string, unknown>
  const tracking = (layoutConfig.tracking ?? {}) as Record<string, unknown>

  await supabase
    .from('blogs')
    .update({
      layout_config: {
        ...layoutConfig,
        tracking: {
          ...tracking,
          gsc_code: token,
        },
      },
    })
    .eq('id', blogId)
}

// ─── Step 3: 소유권 확인 요청 ─────────────────────────────────────────────

async function verifySiteOwnership(accessToken: string, siteUrl: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=META', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site: { type: 'SITE', identifier: siteUrl },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`SiteVerification verify error (${res.status}):`, errText)
    return { ok: false, error: `소유권 확인 실패 (${res.status}): 메타태그가 사이트에 반영되었는지 확인하세요.` }
  }

  return { ok: true }
}

// ─── Step 4: GSC에 사이트 추가 ──────────────────────────────────────────────

async function addSiteToGSC(accessToken: string, siteUrl: string): Promise<{ ok: boolean; error?: string }> {
  const encoded = encodeURIComponent(siteUrl)
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    console.error(`GSC addSite error (${res.status}):`, errText)
    return { ok: false, error: `GSC 사이트 추가 실패 (${res.status})` }
  }

  return { ok: true }
}

// ─── Step 5: 사이트맵 제출 ──────────────────────────────────────────────────

async function submitSitemapToGSC(accessToken: string, siteUrl: string): Promise<{ ok: boolean; error?: string }> {
  const sitemapUrl = `${siteUrl}/sitemap.xml`
  const encodedSite = encodeURIComponent(siteUrl)
  const encodedSitemap = encodeURIComponent(sitemapUrl)

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    console.error(`GSC submitSitemap error (${res.status}):`, errText)
    return { ok: false, error: `사이트맵 제출 실패 (${res.status})` }
  }

  return { ok: true }
}

// ─── 통합: 순차적 등록 플로우 ─────────────────────────────────────────────

export interface GSCRegistrationResult {
  ok: boolean
  step: 'token' | 'save' | 'verify' | 'site' | 'sitemap' | 'complete'
  error?: string
  details?: {
    verificationToken?: string
    siteUrl?: string
    needsRedeploy?: boolean
  }
}

/** 블로그를 GSC에 순차적으로 등록 (소유권 확인 포함) */
export async function registerBlogToGSC(
  userId: string,
  blog: { id: string; slug: string; custom_domain?: string | null }
): Promise<GSCRegistrationResult> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return { ok: false, step: 'token', error: 'Google 계정이 연결되지 않았습니다.' }

  const siteUrl = getBlogSiteUrl(blog)

  // Step 1: 인증 토큰 요청
  const tokenResult = await getVerificationToken(accessToken, siteUrl)
  if (!tokenResult.ok || !tokenResult.token) {
    return { ok: false, step: 'token', error: tokenResult.error }
  }

  // Step 2: 메타태그를 블로그에 저장
  await saveVerificationTokenToBlog(blog.id, tokenResult.token)

  // Step 3: 소유권 확인 (메타태그가 페이지에 반영된 후 가능)
  // ISR 캐시로 인해 즉시 반영이 안 될 수 있음 — 재시도 로직
  let verifyResult = await verifySiteOwnership(accessToken, siteUrl)

  if (!verifyResult.ok) {
    // ISR 캐시 때문에 실패할 수 있으므로 5초 후 재시도
    await new Promise(resolve => setTimeout(resolve, 5000))
    verifyResult = await verifySiteOwnership(accessToken, siteUrl)
  }

  if (!verifyResult.ok) {
    // 메타태그는 저장했지만 아직 반영 안 됨
    return {
      ok: false,
      step: 'verify',
      error: '메타태그가 저장되었지만 아직 사이트에 반영되지 않았습니다. 잠시 후 다시 시도하세요.',
      details: { verificationToken: tokenResult.token, siteUrl, needsRedeploy: true },
    }
  }

  // Step 4: GSC에 사이트 추가
  const addResult = await addSiteToGSC(accessToken, siteUrl)
  if (!addResult.ok) return { ok: false, step: 'site', error: addResult.error }

  // Step 5: 사이트맵 제출
  const sitemapResult = await submitSitemapToGSC(accessToken, siteUrl)

  // layout_config에 상태 기록
  const supabase = getServiceSupabase()
  const { data: blogData } = await supabase
    .from('blogs')
    .select('layout_config')
    .eq('id', blog.id)
    .single()

  const layoutConfig = (blogData?.layout_config ?? {}) as Record<string, unknown>
  const tracking = (layoutConfig.tracking ?? {}) as Record<string, unknown>

  await supabase
    .from('blogs')
    .update({
      layout_config: {
        ...layoutConfig,
        tracking: {
          ...tracking,
          gsc_auto_index: true,
          gsc_verified: true,
          ...(sitemapResult.ok ? { sitemap_submitted_at: new Date().toISOString() } : {}),
        },
      },
    })
    .eq('id', blog.id)

  if (!sitemapResult.ok) {
    return { ok: false, step: 'sitemap', error: sitemapResult.error }
  }

  return { ok: true, step: 'complete', details: { siteUrl } }
}

/** 사용자의 모든 블로그를 GSC에 일괄 등록 */
export async function registerAllBlogsToGSC(userId: string): Promise<{
  results: { blogId: string; blogName: string; ok: boolean; step?: string; error?: string }[]
}> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return { results: [] }

  const supabase = getServiceSupabase()
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, name, slug, custom_domain')
    .eq('user_id', userId)

  if (!blogs?.length) return { results: [] }

  const results: { blogId: string; blogName: string; ok: boolean; step?: string; error?: string }[] = []

  for (const blog of blogs) {
    const result = await registerBlogToGSC(userId, blog)
    results.push({
      blogId: blog.id,
      blogName: blog.name,
      ok: result.ok,
      step: result.step,
      error: result.error,
    })
  }

  return { results }
}
