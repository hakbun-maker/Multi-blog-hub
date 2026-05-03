/**
 * GET /api/stats/forecast
 *
 * 다음 30일 수익 예측 + 작년 대비 + 월 목표 진척도.
 *
 * 모델: 단순 선형 회귀 (최근 30일 일별 수익 → 다음 30일 합 예측)
 *       데이터 부족 시 폴백(평균 × 30) 사용.
 *
 * 응답:
 *   {
 *     predictedNext30: number,     // 예측 합 (USD)
 *     last30: number,              // 실제 합
 *     vsLastYear: number | null,   // 작년 동기 대비 % (데이터 없으면 null)
 *     goalProgress: number | null, // 0~1 (월 목표 미설정 시 null)
 *     monthlyGoal: number | null,
 *     achievability: number | null, // 0~1 (목표 + 예측 다 있을 때만)
 *     dailySeries: { date, value }[], // 차트용
 *     errors: [...]
 *   }
 *
 * 캐시: 1시간 TTL, ?refresh=1로 무효화
 */

import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getOrCompute, invalidate } from '@/lib/stats/cache'
import { getValidGoogleToken } from '@/lib/google/token-refresh'
import { generateAdsenseDailyReport } from '@/lib/google/adsense'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'forecast'
const CACHE_TTL_MS = 60 * 60 * 1000

interface ForecastPayload {
  predictedNext30: number
  last30: number
  vsLastYear: number | null
  goalProgress: number | null
  monthlyGoal: number | null
  achievability: number | null
  dailySeries: { date: string; value: number }[]
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

  const result = await getOrCompute<ForecastPayload>(
    client,
    user.id,
    CACHE_KEY,
    CACHE_TTL_MS,
    async () => computeForecast(client, user.id),
  )

  return NextResponse.json(result)
}

async function computeForecast(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<ForecastPayload> {
  const errors: ForecastPayload['errors'] = []
  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const today = new Date()
  const last30Start = fmt(addDays(today, -30))
  const last30End = fmt(today)
  const yearAgoStart = fmt(addDays(today, -395))
  const yearAgoEnd = fmt(addDays(today, -365))

  // 토큰 + AdSense account id
  const [accessToken, tokenRowRes, userRowRes] = await Promise.all([
    getValidGoogleToken(userId),
    supabaseAdmin
      .from('user_oauth_tokens')
      .select('adsense_account_id')
      .eq('user_id', userId)
      .eq('provider', 'google_analytics')
      .maybeSingle(),
    supabaseAdmin
      .from('users')
      .select('monthly_revenue_goal')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const adsenseAccountId = (tokenRowRes.data?.adsense_account_id as string | null) ?? null
  const monthlyGoal = (userRowRes.data?.monthly_revenue_goal as number | null) ?? null

  if (!accessToken) {
    errors.push({ source: 'adsense', message: 'Google access token 없음' })
    return emptyPayload(monthlyGoal, errors)
  }
  if (!adsenseAccountId) {
    errors.push({ source: 'adsense', message: 'AdSense 계정 미연결' })
    return emptyPayload(monthlyGoal, errors)
  }

  // 일별 수익 (현재 30일 + 작년 동기 30일) 병렬
  const [currentDaily, lastYearDaily] = await Promise.all([
    generateAdsenseDailyReport(adsenseAccountId, accessToken, last30Start, last30End)
      .catch(err => {
        errors.push({ source: 'adsense', message: err instanceof Error ? err.message : '일별 리포트 실패' })
        return {} as Record<string, number>
      }),
    generateAdsenseDailyReport(adsenseAccountId, accessToken, yearAgoStart, yearAgoEnd)
      .catch(() => ({} as Record<string, number>)),
  ])

  const dailySeries = Object.entries(currentDaily)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const last30 = dailySeries.reduce((acc, x) => acc + x.value, 0)

  // 선형 회귀 (y = a + b*x, x는 0..n-1)
  const predictedNext30 = predictNext30(dailySeries.map(d => d.value))

  const lastYearTotal = Object.values(lastYearDaily).reduce((acc, v) => acc + v, 0)
  const vsLastYear = lastYearTotal > 0 ? ((last30 - lastYearTotal) / lastYearTotal) * 100 : null

  let goalProgress: number | null = null
  let achievability: number | null = null
  if (monthlyGoal && monthlyGoal > 0) {
    goalProgress = Math.min(last30 / monthlyGoal, 1)
    if (predictedNext30 > 0) {
      achievability = Math.min(predictedNext30 / monthlyGoal, 1)
    }
  }

  return {
    predictedNext30: round2(predictedNext30),
    last30: round2(last30),
    vsLastYear: vsLastYear === null ? null : round2(vsLastYear),
    goalProgress,
    monthlyGoal,
    achievability,
    dailySeries: dailySeries.map(d => ({ date: d.date, value: round2(d.value) })),
    errors,
  }
}

/**
 * 단순 선형 회귀 — 최근 N일 일별 수익을 받아 다음 30일 합을 예측.
 * 데이터 < 7개면 단순 평균 * 30으로 폴백.
 */
function predictNext30(values: number[]): number {
  if (values.length === 0) return 0
  if (values.length < 7) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    return avg * 30
  }
  const n = values.length
  const xs = Array.from({ length: n }, (_, i) => i)
  const meanX = (n - 1) / 2
  const meanY = values.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  const intercept = meanY - slope * meanX
  // 다음 30일 합 = sum(intercept + slope * (n + i)) for i in 0..29
  let total = 0
  for (let i = 0; i < 30; i++) {
    total += Math.max(0, intercept + slope * (n + i))
  }
  return total
}

function emptyPayload(monthlyGoal: number | null, errors: ForecastPayload['errors']): ForecastPayload {
  return {
    predictedNext30: 0,
    last30: 0,
    vsLastYear: null,
    goalProgress: null,
    monthlyGoal,
    achievability: null,
    dailySeries: [],
    errors,
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
