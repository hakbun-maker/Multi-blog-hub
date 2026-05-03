/**
 * GET /api/stats/diagnosis
 *
 * 진단 섹션 데이터:
 *  - ROI 랭킹 (Top 10 + Bottom 5)
 *  - 카테고리 파레토 (수익 합 + 누적 %)
 *  - 드릴다운 트리 (category → post)
 *
 * 글별 수익 산정 방식 (AdSense는 글 단위 데이터 없음 → 근사):
 *   postRevenue = blogRevenue × (post의 GA4 page views / 해당 블로그 GA4 page views 합)
 *
 * ROI 등급 (RPM 기준 USD):
 *   S ≥ 5.0, A ≥ 3.0, B ≥ 1.5, C ≥ 0.5, D < 0.5
 *
 * 캐시: 1시간 TTL, ?refresh=1로 무효화
 */

import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getOrCompute, invalidate } from '@/lib/stats/cache'
import { fetchAllSources } from '@/lib/stats/sources'
import { pickRevenueForBlog } from '@/lib/google/adsense'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'diagnosis'
const CACHE_TTL_MS = 60 * 60 * 1000

const TOP_N = 10
const BOTTOM_N = 5

interface PostRoi {
  postId: string
  title: string
  slug: string | null
  blogId: string
  blogName: string
  categoryId: string | null
  categoryName: string | null
  views: number
  revenue: number       // USD (할당 근사)
  rpm: number           // revenue / views * 1000
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
}

interface ParetoRow {
  categoryId: string | null
  categoryName: string
  revenue: number
  views: number
  share: number       // 0~1
  cumulative: number  // 0~1
}

interface DrilldownTree {
  categoryId: string | null
  categoryName: string
  revenue: number
  views: number
  posts: { postId: string; title: string; revenue: number; views: number }[]
}

interface DiagnosisPayload {
  roiRanking: { top: PostRoi[]; bottom: PostRoi[] }
  pareto: ParetoRow[]
  drilldown: DrilldownTree[]
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

  const result = await getOrCompute<DiagnosisPayload>(
    client,
    user.id,
    CACHE_KEY,
    CACHE_TTL_MS,
    async () => computeDiagnosis(client, user.id),
  )

  return NextResponse.json(result)
}

async function computeDiagnosis(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<DiagnosisPayload> {
  // 1) 데이터 수집 — 30일 GA4 page views + AdSense 도메인별 수익
  const [bundle, postsRes, blogsRes, catsRes] = await Promise.all([
    fetchAllSources(supabaseAdmin, userId, {
      days: 30,
      includeGa4Pages: true,
      includeAdsense: true,
      includeGsc: false,
    }),
    supabaseAdmin
      .from('posts')
      .select('id, title, slug, blog_id, category_id, status')
      .eq('user_id', userId)
      .eq('status', 'published'),
    supabaseAdmin
      .from('blogs')
      .select('id, name, slug, custom_domain')
      .eq('user_id', userId)
      /* is_active 필터 제거 — 대시보드 동작 일치 */,
    supabaseAdmin
      .from('categories')
      .select('id, name'),
  ])

  const posts = (postsRes.data ?? []) as { id: string; title: string | null; slug: string | null; blog_id: string; category_id: string | null }[]
  const blogs = (blogsRes.data ?? []) as { id: string; name: string; slug: string; custom_domain: string | null }[]
  const cats = (catsRes.data ?? []) as { id: string; name: string }[]
  const catNameById = new Map(cats.map(c => [c.id, c.name]))
  const blogById = new Map(blogs.map(b => [b.id, b]))

  // 2) 블로그별 수익 결정 + GA4 페이지뷰 합
  const blogRevenue = new Map<string, number>() // blogId → revenue
  const blogTotalViews = new Map<string, number>()
  for (const blog of blogs) {
    const rev = pickRevenueForBlog(bundle.adsenseByDomain, [
      blog.custom_domain,
      `multi-blog-hub.vercel.app`,
    ])
    blogRevenue.set(blog.id, rev?.estimatedEarnings ?? 0)
    const pageMap = bundle.ga4PagesByBlog[blog.id] ?? {}
    blogTotalViews.set(blog.id, Object.values(pageMap).reduce((a, b) => a + b, 0))
  }

  // 3) 글별 ROI 계산
  const postRois: PostRoi[] = []
  for (const post of posts) {
    const blog = blogById.get(post.blog_id)
    if (!blog || !post.slug) continue
    const pageMap = bundle.ga4PagesByBlog[post.blog_id] ?? {}
    const views = findViewsForSlug(pageMap, blog.slug, post.slug)
    if (views === 0) continue

    const totalBlogViews = blogTotalViews.get(post.blog_id) ?? 0
    const blogRev = blogRevenue.get(post.blog_id) ?? 0
    const revenue = totalBlogViews > 0 ? blogRev * (views / totalBlogViews) : 0
    const rpm = views > 0 ? (revenue / views) * 1000 : 0

    postRois.push({
      postId: post.id,
      title: post.title ?? '(제목 없음)',
      slug: post.slug,
      blogId: post.blog_id,
      blogName: blog.name,
      categoryId: post.category_id,
      categoryName: post.category_id ? (catNameById.get(post.category_id) ?? '미분류') : '미분류',
      views,
      revenue: round4(revenue),
      rpm: round4(rpm),
      grade: gradeForRpm(rpm),
    })
  }

  // 4) ROI 랭킹
  const sortedDesc = [...postRois].sort((a, b) => b.revenue - a.revenue)
  const top = sortedDesc.slice(0, TOP_N)
  const bottom = sortedDesc.slice(-BOTTOM_N).reverse()

  // 5) 카테고리 파레토
  const catAgg = new Map<string, { revenue: number; views: number }>()
  for (const p of postRois) {
    const key = p.categoryId ?? '__none__'
    const cur = catAgg.get(key) ?? { revenue: 0, views: 0 }
    cur.revenue += p.revenue
    cur.views += p.views
    catAgg.set(key, cur)
  }
  const totalRev = Array.from(catAgg.values()).reduce((a, b) => a + b.revenue, 0)
  const paretoSorted = Array.from(catAgg.entries())
    .map(([key, v]) => ({
      categoryId: key === '__none__' ? null : key,
      categoryName: key === '__none__' ? '미분류' : (catNameById.get(key) ?? '미분류'),
      revenue: round4(v.revenue),
      views: v.views,
      share: totalRev > 0 ? v.revenue / totalRev : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  let cumulative = 0
  const pareto: ParetoRow[] = paretoSorted.map(r => {
    cumulative += r.share
    return { ...r, cumulative: round4(cumulative) }
  })

  // 6) 드릴다운 트리 (category → posts)
  const drilldown: DrilldownTree[] = pareto.map(cat => {
    const postsInCat = postRois.filter(p =>
      cat.categoryId === null ? p.categoryId === null : p.categoryId === cat.categoryId,
    )
    return {
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      revenue: cat.revenue,
      views: cat.views,
      posts: postsInCat
        .sort((a, b) => b.revenue - a.revenue)
        .map(p => ({ postId: p.postId, title: p.title, revenue: p.revenue, views: p.views })),
    }
  })

  return {
    roiRanking: { top, bottom },
    pareto,
    drilldown,
    errors: bundle.errors.map(e => ({ source: e.source, message: e.message })),
  }
}

function findViewsForSlug(pageMap: Record<string, number>, blogSlug: string, postSlug: string): number {
  const candidates = [
    `/blog/${blogSlug}/${postSlug}`,
    `/blog/${blogSlug}/${postSlug}/`,
    `/${postSlug}`,
    `/${postSlug}/`,
  ]
  for (const c of candidates) {
    const v = pageMap[c]
    if (v) return v
  }
  // 디코딩 매칭
  for (const [path, v] of Object.entries(pageMap)) {
    try {
      if (decodeURIComponent(path) === `/blog/${blogSlug}/${postSlug}` ||
          decodeURIComponent(path) === `/${postSlug}`) return v
    } catch { /* 무시 */ }
  }
  return 0
}

function gradeForRpm(rpm: number): PostRoi['grade'] {
  if (rpm >= 5.0) return 'S'
  if (rpm >= 3.0) return 'A'
  if (rpm >= 1.5) return 'B'
  if (rpm >= 0.5) return 'C'
  return 'D'
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
