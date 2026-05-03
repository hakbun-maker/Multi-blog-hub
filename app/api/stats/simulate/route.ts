/**
 * POST /api/stats/simulate
 *
 * 시뮬레이션 — 슬라이더 4종 변경 시 30/60/90일 수익 예측.
 *
 * 입력: { publishesPerWeek, totalAdSlots, medicalCategoryRatio, rewriteCount }
 *   - publishesPerWeek: 0~50 (현재 발행 빈도 기준 변화)
 *   - totalAdSlots: 0~6 (활성화할 총 슬롯 수)
 *   - medicalCategoryRatio: 0~1 (의료/법률 등 프리미엄 카테고리 비중)
 *   - rewriteCount: 0~10 (하위 글 재작성 수)
 *
 * 모델: 룰 기반 (학습 데이터 부족 시 폴백 동작 — 향후 진짜 회귀로 교체 가능)
 *   baseline = 최근 30일 실제 수익
 *   각 슬라이더에 multiplier 적용 → 30/60/90일 합 예측
 *
 * 출력: { revenue30d, revenue60d, revenue90d, confidence, basis }
 *
 * 캐시 미적용 — 입력에 따라 매번 다른 결과
 */

import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { fetchAllSources } from '@/lib/stats/sources'
import { pickRevenueForBlog } from '@/lib/google/adsense'

export const dynamic = 'force-dynamic'

interface SimulateInput {
  publishesPerWeek: number
  totalAdSlots: number      // 0~6
  medicalCategoryRatio: number  // 0~1
  rewriteCount: number      // 0~10
}

interface SimulatePayload {
  revenue30d: number
  revenue60d: number
  revenue90d: number
  confidence: number  // 0~1
  basis: {
    baseline30d: number
    publishMult: number
    slotMult: number
    categoryMult: number
    rewriteMult: number
    currentPublishesPerWeek: number
    currentMedicalRatio: number
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const input = (await request.json().catch(() => ({}))) as Partial<SimulateInput>
  const params = normalizeInput(input)

  const client = supabase as unknown as SupabaseClient
  const result = await computeSimulation(client, user.id, params)
  return NextResponse.json(result)
}

function normalizeInput(input: Partial<SimulateInput>): SimulateInput {
  const clamp = (v: number, min: number, max: number) =>
    Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min
  return {
    publishesPerWeek: clamp(input.publishesPerWeek ?? 3, 0, 50),
    totalAdSlots: clamp(input.totalAdSlots ?? 3, 0, 6),
    medicalCategoryRatio: clamp(input.medicalCategoryRatio ?? 0, 0, 1),
    rewriteCount: clamp(input.rewriteCount ?? 0, 0, 10),
  }
}

async function computeSimulation(
  supabaseAdmin: SupabaseClient,
  userId: string,
  input: SimulateInput,
): Promise<SimulatePayload> {
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const today = new Date()
  const startDate = fmt(addDays(today, -30))
  const endDate = fmt(today)

  // 베이스라인: 최근 30일 실제 수익 + 발행 빈도 + 카테고리 분포
  const [bundle, postsRes, blogsRes] = await Promise.all([
    fetchAllSources(supabaseAdmin, userId, {
      startDate, endDate,
      includeAdsense: true,
      includeGsc: false,
    }),
    supabaseAdmin
      .from('posts')
      .select('id, blog_id, category_id, published_at, status')
      .eq('user_id', userId)
      .eq('status', 'published')
      .gte('published_at', addDays(today, -30).toISOString()),
    supabaseAdmin
      .from('blogs')
      .select('id, custom_domain')
      .eq('user_id', userId)
      /* is_active 필터 제거 — 대시보드 동작 일치 */,
  ])

  const blogs = (blogsRes.data ?? []) as { id: string; custom_domain: string | null }[]
  const baseline30d = blogs.reduce((acc, b) => {
    const rev = pickRevenueForBlog(bundle.adsenseByDomain, [b.custom_domain, 'multi-blog-hub.vercel.app'])
    return acc + (rev?.estimatedEarnings ?? 0)
  }, 0)

  const recentPosts = (postsRes.data ?? []) as { category_id: string | null; published_at: string }[]
  const currentPublishesPerWeek = recentPosts.length / (30 / 7)

  // 카테고리 분포 — categories.name에서 medical/legal/finance/insurance 비중 추정
  const { data: catsData } = await supabaseAdmin
    .from('categories')
    .select('id, blog_id')
  const cats = (catsData ?? []) as { id: string; blog_id: string }[]
  const { data: blogsForType } = await supabaseAdmin
    .from('blogs')
    .select('id, blog_type')
    .eq('user_id', userId)
  const blogTypeById = new Map((blogsForType ?? []).map(b => [b.id as string, b.blog_type as string | null]))
  const premiumTypes = new Set(['medical', 'legal', 'finance', 'insurance'])
  const catBlogIdById = new Map(cats.map(c => [c.id, c.blog_id]))
  const premiumPosts = recentPosts.filter(p => {
    if (!p.category_id) return false
    const blogId = catBlogIdById.get(p.category_id)
    if (!blogId) return false
    const type = blogTypeById.get(blogId)
    return type ? premiumTypes.has(type) : false
  }).length
  const currentMedicalRatio = recentPosts.length > 0 ? premiumPosts / recentPosts.length : 0

  // ─── Multiplier 계산 ────────────────────────
  // 1) 발행 빈도: 1 publish/week 추가당 +5% (장기 효과)
  const publishDelta = input.publishesPerWeek - currentPublishesPerWeek
  const publishMult = Math.max(0.3, 1 + publishDelta * 0.05)

  // 2) 슬롯 수: 0=0× / 1=0.6× / 2=0.85× / 3=1.0× / 4=1.1× / 5=1.15× / 6=1.18×
  const slotTable = [0, 0.6, 0.85, 1.0, 1.1, 1.15, 1.18]
  const slotMult = slotTable[Math.round(input.totalAdSlots)] ?? 1.0

  // 3) 프리미엄 카테고리 비중: 0% → 1×, 50% → 1.5×, 100% → 2× (선형)
  const categoryDelta = input.medicalCategoryRatio - currentMedicalRatio
  const categoryMult = Math.max(0.5, 1 + categoryDelta * 1.0)

  // 4) 재작성: 1개당 +1% (즉시) ~ +3% (90일 누적)
  const rewriteMult30 = 1 + input.rewriteCount * 0.01
  const rewriteMult60 = 1 + input.rewriteCount * 0.02
  const rewriteMult90 = 1 + input.rewriteCount * 0.03

  // ─── 예측 ────────────────────────
  const monthlyBaseline = baseline30d
  const r30 = monthlyBaseline * publishMult * slotMult * categoryMult * rewriteMult30
  const r60 = (monthlyBaseline * 2) * publishMult * slotMult * categoryMult * rewriteMult60
  const r90 = (monthlyBaseline * 3) * publishMult * slotMult * categoryMult * rewriteMult90

  // confidence: 데이터 양에 따라
  let confidence = 0.4
  if (recentPosts.length >= 10) confidence += 0.1
  if (recentPosts.length >= 30) confidence += 0.1
  if (baseline30d > 0) confidence += 0.2
  if (baseline30d > 50) confidence += 0.1
  confidence = Math.min(confidence, 0.9)

  return {
    revenue30d: round2(r30),
    revenue60d: round2(r60),
    revenue90d: round2(r90),
    confidence: round4(confidence),
    basis: {
      baseline30d: round2(baseline30d),
      publishMult: round4(publishMult),
      slotMult: round4(slotMult),
      categoryMult: round4(categoryMult),
      rewriteMult: round4(rewriteMult30),
      currentPublishesPerWeek: round2(currentPublishesPerWeek),
      currentMedicalRatio: round4(currentMedicalRatio),
    },
  }
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
