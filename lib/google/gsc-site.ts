/**
 * Google Search Console 사이트 자동 등록 유틸리티
 *
 * 순차적 등록 흐름:
 * 1. GSC Webmasters API → 사이트 추가 (미확인 상태)
 * 2. 소유권 확인은 별도 (블로그 설정에서 인증 코드 입력 → HTML 파일 자동 서빙)
 * 3. 사이트맵 제출
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

/** GSC에 사이트(속성) 추가 */
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

/** GSC 사이트 소유권 확인 상태 조회 */
async function checkSiteVerified(accessToken: string, siteUrl: string): Promise<boolean> {
  const encoded = encodeURIComponent(siteUrl)
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  if (!res.ok) return false
  const data = await res.json()
  return data.permissionLevel === 'siteOwner' || data.permissionLevel === 'siteFullUser'
}

/** 사이트맵 제출 */
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

// ─── 통합 등록 플로우 ─────────────────────────────────────────────

export interface GSCRegistrationResult {
  ok: boolean
  step: 'auth' | 'site' | 'verify' | 'sitemap' | 'complete'
  error?: string
  verified?: boolean
  siteUrl?: string
}

/**
 * 블로그를 GSC에 순차적으로 등록
 *
 * 흐름:
 * 1. OAuth 토큰 확인
 * 2. GSC에 사이트 추가
 * 3. 소유권 확인 상태 체크
 *    - 확인됨 → 사이트맵 제출
 *    - 미확인 → 안내 메시지 반환 (블로그 설정에서 인증 코드 입력 필요)
 * 4. 사이트맵 제출
 */
export async function registerBlogToGSC(
  userId: string,
  blog: { id: string; slug: string; custom_domain?: string | null }
): Promise<GSCRegistrationResult> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return { ok: false, step: 'auth', error: 'Google 계정이 연결되지 않았습니다.' }

  const siteUrl = getBlogSiteUrl(blog)

  // Step 1: GSC에 사이트 추가
  const addResult = await addSiteToGSC(accessToken, siteUrl)
  if (!addResult.ok) return { ok: false, step: 'site', error: addResult.error, siteUrl }

  // Step 2: 소유권 확인 상태 체크
  const isVerified = await checkSiteVerified(accessToken, siteUrl)

  const supabase = getServiceSupabase()
  const { data: blogData } = await supabase
    .from('blogs')
    .select('layout_config')
    .eq('id', blog.id)
    .single()

  const layoutConfig = (blogData?.layout_config ?? {}) as Record<string, unknown>
  const tracking = (layoutConfig.tracking ?? {}) as Record<string, unknown>

  if (!isVerified) {
    // 소유권 미확인 → 사이트는 추가했지만 인증이 필요
    await supabase
      .from('blogs')
      .update({
        layout_config: {
          ...layoutConfig,
          tracking: { ...tracking, gsc_auto_index: true },
        },
      })
      .eq('id', blog.id)

    return {
      ok: false,
      step: 'verify',
      verified: false,
      siteUrl,
      error: '사이트가 GSC에 추가되었지만 소유권 확인이 필요합니다. GSC에서 소유권 확인을 완료한 후 다시 등록/갱신을 클릭하세요.',
    }
  }

  // Step 3: 소유권 확인됨 → 사이트맵 제출
  const sitemapResult = await submitSitemapToGSC(accessToken, siteUrl)

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
    return { ok: false, step: 'sitemap', verified: true, siteUrl, error: sitemapResult.error }
  }

  return { ok: true, step: 'complete', verified: true, siteUrl }
}

/**
 * 단일 블로그 sitemap 재제출 (발행 시 호출)
 * - GSC가 sitemap을 다시 fetch하도록 신호
 * - 토큰/소유권 없으면 silently 실패
 */
export async function resubmitSitemapForBlog(
  userId: string,
  blog: { id: string; slug: string; custom_domain?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return { ok: false, error: 'no_token' }
  const siteUrl = getBlogSiteUrl(blog)
  return submitSitemapToGSC(accessToken, siteUrl)
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

/**
 * 일괄 적용: 모든 블로그에 자동색인 ON + 사이트맵 재제출
 * - layout_config.tracking.gsc_auto_index = true 강제
 * - 각 블로그 sitemap 즉시 재제출
 */
export async function bulkApplyAutoIndexAndSitemap(userId: string): Promise<{
  results: {
    blogId: string
    blogName: string
    autoIndexSet: boolean
    sitemapOk: boolean
    error?: string
  }[]
}> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) {
    return {
      results: [{
        blogId: '',
        blogName: '(no token)',
        autoIndexSet: false,
        sitemapOk: false,
        error: 'Google OAuth 토큰이 없습니다. 먼저 Google 계정을 연결하세요.',
      }],
    }
  }

  const supabase = getServiceSupabase()
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, name, slug, custom_domain, layout_config')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!blogs?.length) return { results: [] }

  const results: {
    blogId: string
    blogName: string
    autoIndexSet: boolean
    sitemapOk: boolean
    error?: string
  }[] = []

  for (const blog of blogs) {
    let autoIndexSet = false
    let sitemapOk = false
    let error: string | undefined

    // 1) tracking.gsc_auto_index = true 설정
    try {
      const layoutConfig = (blog.layout_config ?? {}) as Record<string, unknown>
      const tracking = (layoutConfig.tracking ?? {}) as Record<string, unknown>
      const updateRes = await supabase
        .from('blogs')
        .update({
          layout_config: {
            ...layoutConfig,
            tracking: { ...tracking, gsc_auto_index: true },
          },
        })
        .eq('id', blog.id)
      if (!updateRes.error) autoIndexSet = true
      else error = `자동색인 설정 실패: ${updateRes.error.message}`
    } catch (e) {
      error = e instanceof Error ? e.message : '자동색인 설정 오류'
    }

    // 2) 사이트맵 재제출
    try {
      const siteUrl = getBlogSiteUrl(blog)
      const result = await submitSitemapToGSC(accessToken, siteUrl)
      sitemapOk = result.ok
      if (!result.ok && !error) error = result.error

      // 성공 시 sitemap_submitted_at 업데이트
      if (result.ok) {
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
                sitemap_submitted_at: new Date().toISOString(),
              },
            },
          })
          .eq('id', blog.id)
      }
    } catch (e) {
      if (!error) error = e instanceof Error ? e.message : '사이트맵 제출 오류'
    }

    results.push({
      blogId: blog.id,
      blogName: blog.name,
      autoIndexSet,
      sitemapOk,
      error,
    })
  }

  return { results }
}
