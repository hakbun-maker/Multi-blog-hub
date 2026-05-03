/**
 * GET /api/stats/hidden-gems
 *
 * 숨은 보석 후보 — 노출은 충분(≥1000)하지만 CTR이 낮은(<2%) 글.
 * AI에게 새 제목 3개를 받아 함께 반환.
 *
 * 응답:
 *   {
 *     gems: [{ postId, title, slug, blogId, blogSlug, impressions, clicks, ctr, position, suggestedTitles: [3] }],
 *     errors: [{ source, message }]
 *   }
 *
 * 캐시: 1시간 TTL, ?refresh=1로 무효화
 *
 * 비용 절감: 최대 5개 글까지만 AI 호출. AI 키 없으면 suggestedTitles 빈 배열.
 */

import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getOrCompute, invalidate } from '@/lib/stats/cache'
import { fetchAllSources } from '@/lib/stats/sources'
import { findHiddenGems, type GscRow } from '@/lib/google/gsc-search-analytics'
import { createAIAdapter, type AIProvider } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'hidden-gems'
const CACHE_TTL_MS = 60 * 60 * 1000
const MAX_GEMS = 5
const MIN_IMPR = 1000
const MAX_CTR = 0.02

interface Gem {
  postId: string
  title: string
  slug: string
  blogId: string
  blogSlug: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  suggestedTitles: string[]
}

interface HiddenGemsPayload {
  gems: Gem[]
  errors: { source: string; message: string }[]
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('refresh') === '1'

  const client = supabase as unknown as SupabaseClient

  if (forceRefresh) {
    await invalidate(client, user.id, CACHE_KEY)
  }

  const result = await getOrCompute<HiddenGemsPayload>(
    client,
    user.id,
    CACHE_KEY,
    CACHE_TTL_MS,
    async () => computeHiddenGems(client, user.id),
  )

  return NextResponse.json(result)
}

// ─── 내부 ──────────────────────────────────────────

async function computeHiddenGems(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<HiddenGemsPayload> {
  const errors: HiddenGemsPayload['errors'] = []

  // 1) GSC 현재 30일 + 사용자 글 동시 fetch
  const [bundle, postsRes] = await Promise.all([
    fetchAllSources(supabaseAdmin, userId, { days: 30, includeGsc: true, includeAdsense: false }),
    supabaseAdmin
      .from('posts')
      .select('id, title, slug, blog_id, status')
      .eq('user_id', userId)
      .eq('status', 'published'),
  ])

  for (const e of bundle.errors) errors.push({ source: e.source, message: e.message })

  // 2) 모든 GSC row 합쳐서 hidden gems 추출
  const allRows: GscRow[] = []
  for (const rows of Object.values(bundle.gscByBlog)) allRows.push(...rows)
  const gemRows = findHiddenGems(allRows, MIN_IMPR, MAX_CTR).slice(0, MAX_GEMS)

  // 3) URL slug → post 매칭
  const posts = (postsRes.data ?? []) as { id: string; title: string | null; slug: string | null; blog_id: string; status: string }[]
  const postBySlug = new Map<string, typeof posts[0]>()
  for (const p of posts) {
    if (p.slug) postBySlug.set(p.slug, p)
  }

  const { data: blogsData } = await supabaseAdmin
    .from('blogs')
    .select('id, slug')
    .eq('user_id', userId)
  const blogSlugById = new Map<string, string>()
  for (const b of (blogsData ?? []) as { id: string; slug: string }[]) blogSlugById.set(b.id, b.slug)

  const matched: Array<{ row: GscRow; post: typeof posts[0]; blogSlug: string }> = []
  for (const row of gemRows) {
    if (!row.page) continue
    const slug = extractSlugFromUrl(row.page)
    if (!slug) continue
    const post = postBySlug.get(slug) ?? postBySlug.get(decodeURIComponent(slug))
    if (!post) continue
    const blogSlug = blogSlugById.get(post.blog_id) ?? ''
    matched.push({ row, post, blogSlug })
  }

  // 4) AI로 제목 3개씩 생성 (비용 절감: 최대 MAX_GEMS개)
  const aiKey = await loadAiKey(supabaseAdmin, userId)
  const gems: Gem[] = []
  for (const { row, post, blogSlug } of matched) {
    let suggestedTitles: string[] = []
    if (aiKey) {
      try {
        suggestedTitles = await generateAlternativeTitles(post.title ?? '', aiKey.provider, aiKey.key)
      } catch (err) {
        errors.push({ source: 'ai', message: err instanceof Error ? err.message : 'AI 제목 생성 실패' })
      }
    }
    gems.push({
      postId: post.id,
      title: post.title ?? '(제목 없음)',
      slug: post.slug ?? '',
      blogId: post.blog_id,
      blogSlug,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
      suggestedTitles,
    })
  }

  if (!aiKey) errors.push({ source: 'ai', message: 'AI API 키 없음 — 제안 제목 생성 스킵' })

  return { gems, errors }
}

function extractSlugFromUrl(url: string): string | null {
  // '/' 또는 '?' 제거 후 마지막 segment
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '').replace(/\/+$/, '')
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? null
}

async function loadAiKey(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ provider: AIProvider; key: string } | null> {
  const { data } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('provider', ['claude', 'openai', 'gemini'])
    .limit(1)
    .maybeSingle()

  if (!data) return null
  try {
    return { provider: data.provider as AIProvider, key: decrypt(data.encrypted_key) }
  } catch {
    return null
  }
}

async function generateAlternativeTitles(
  originalTitle: string,
  provider: AIProvider,
  apiKey: string,
): Promise<string[]> {
  const adapter = await createAIAdapter(provider, apiKey)
  const prompt = `당신은 블로그 SEO 전문가입니다. 아래 제목의 글이 검색 노출은 충분한데 클릭률이 낮습니다. 클릭을 유도하는 새 제목 3개를 JSON 배열로만 응답하세요.

원래 제목: "${originalTitle}"

조건:
- 한국어
- 검색의도(키워드) 유지
- 호기심·이익·숫자 등 클릭 유도 요소 포함
- 30자 이내
- 클릭베이트 과장 금지

응답 형식 (JSON 배열만, 다른 텍스트 없이):
["제목1", "제목2", "제목3"]`

  const text = await adapter.generateText(prompt)
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0])
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === 'string').slice(0, 3)
    }
  } catch {
    return []
  }
  return []
}
