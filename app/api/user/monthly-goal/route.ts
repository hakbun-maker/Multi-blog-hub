/**
 * 월 수익 목표 (USD) — 통계 페이지 forecast 섹션에서 진척도/달성 가능성 계산에 사용.
 *
 * GET  → { monthlyGoal: number | null }
 * PUT  → body: { monthlyGoal: number | null } → 저장 후 동일 응답
 *
 * RLS: users 테이블의 id = auth.uid() 정책에 의해 자기 row만 read/write 가능.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { invalidate } from '@/lib/stats/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select('monthly_revenue_goal')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    monthlyGoal: (data?.monthly_revenue_goal as number | null) ?? null,
  })
}

export async function PUT(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { monthlyGoal?: unknown }
  const raw = body.monthlyGoal

  let value: number | null = null
  if (raw === null || raw === '' || raw === undefined) {
    value = null
  } else {
    const num = Number(raw)
    if (!Number.isFinite(num) || num < 0 || num > 1_000_000) {
      return NextResponse.json({ error: 'monthlyGoal 값 무효 (0~1,000,000 USD)' }, { status: 400 })
    }
    value = num
  }

  const { error } = await supabase
    .from('users')
    .update({ monthly_revenue_goal: value })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // forecast 캐시 무효화 — 다음 호출 시 새 목표로 진척도 재계산
  // SupabaseClient 타입을 createClient에서 받은 것 그대로 전달
  await invalidate(supabase as Parameters<typeof invalidate>[0], user.id, 'forecast')

  return NextResponse.json({ monthlyGoal: value })
}
