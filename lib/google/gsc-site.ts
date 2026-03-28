/**
 * Google Search Console 사이트 자동 등록 & 사이트맵 제출 유틸리티
 *
 * OAuth 스코프에 webmasters가 포함되어 있으므로
 * GSC Webmasters API v3를 사용하여 사이트를 자동 추가할 수 있음.
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

/** GSC에 사이트(속성)를 추가 */
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
    console.error(`GSC addSite error (${res.status}) for ${siteUrl}:`, errText)
    return { ok: false, error: `GSC 사이트 추가 실패 (${res.status})` }
  }

  console.log(`GSC: 사이트 추가 완료 - ${siteUrl}`)
  return { ok: true }
}

/** GSC에 사이트맵 제출 */
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
    console.error(`GSC submitSitemap error (${res.status}) for ${siteUrl}:`, errText)
    return { ok: false, error: `사이트맵 제출 실패 (${res.status})` }
  }

  console.log(`GSC: 사이트맵 제출 완료 - ${sitemapUrl}`)
  return { ok: true }
}

/** 단일 블로그를 GSC에 등록 + 사이트맵 제출 */
export async function registerBlogToGSC(
  userId: string,
  blog: { id: string; slug: string; custom_domain?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return { ok: false, error: 'Google 계정이 연결되지 않았습니다.' }

  const siteUrl = getBlogSiteUrl(blog)

  // 1. 사이트 추가
  const addResult = await addSiteToGSC(accessToken, siteUrl)
  if (!addResult.ok) return addResult

  // 2. 사이트맵 제출
  const sitemapResult = await submitSitemapToGSC(accessToken, siteUrl)

  // 3. 블로그 layout_config에 자동 색인 활성화 + 사이트맵 제출 시각 기록
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
          ...(sitemapResult.ok ? { sitemap_submitted_at: new Date().toISOString() } : {}),
        },
      },
    })
    .eq('id', blog.id)

  return { ok: true }
}

/** 사용자의 모든 블로그를 GSC에 일괄 등록 */
export async function registerAllBlogsToGSC(userId: string): Promise<{
  results: { blogId: string; blogName: string; ok: boolean; error?: string }[]
}> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return { results: [] }

  const supabase = getServiceSupabase()
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, name, slug, custom_domain, layout_config')
    .eq('user_id', userId)

  if (!blogs?.length) return { results: [] }

  const results = await Promise.allSettled(
    blogs.map(async (blog) => {
      const siteUrl = getBlogSiteUrl(blog)

      // 사이트 추가
      const addResult = await addSiteToGSC(accessToken, siteUrl)
      if (!addResult.ok) {
        return { blogId: blog.id, blogName: blog.name, ok: false, error: addResult.error }
      }

      // 사이트맵 제출
      const sitemapResult = await submitSitemapToGSC(accessToken, siteUrl)

      // layout_config 업데이트
      const layoutConfig = (blog.layout_config ?? {}) as Record<string, unknown>
      const tracking = (layoutConfig.tracking ?? {}) as Record<string, unknown>

      await supabase
        .from('blogs')
        .update({
          layout_config: {
            ...layoutConfig,
            tracking: {
              ...tracking,
              gsc_auto_index: true,
              ...(sitemapResult.ok ? { sitemap_submitted_at: new Date().toISOString() } : {}),
            },
          },
        })
        .eq('id', blog.id)

      return { blogId: blog.id, blogName: blog.name, ok: true }
    })
  )

  return {
    results: results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return { blogId: blogs[i].id, blogName: blogs[i].name, ok: false, error: r.reason?.message }
    }),
  }
}
