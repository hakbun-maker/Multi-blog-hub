import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserPlanContext } from '@/lib/plan/server'

export async function GET() {
  const ctx = await getUserPlanContext()
  if (!ctx) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  return NextResponse.json({ data: ctx })
}

// 수익화 로켓 정식 출시 전 — 차단 대상 플랜 (UI와 동일하게 유지)
const BLOCKED_PLAN_IDS = new Set(['pro', 'growth', 'scale'])

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { planId, billingCycle } = await request.json()

  if (BLOCKED_PLAN_IDS.has(planId)) {
    return NextResponse.json(
      { error: '해당 플랜은 수익화 로켓 정식 출시 후 활성화됩니다.', code: 'PLAN_COMING_SOON' },
      { status: 403 }
    )
  }

  const { data: plan } = await supabase.from('plans').select('id').eq('id', planId).single()
  if (!plan) return NextResponse.json({ error: '존재하지 않는 플랜입니다.' }, { status: 400 })

  await supabase.from('users').update({ plan_id: planId }).eq('id', user.id)

  const { error } = await supabase.from('user_plans').upsert({
    user_id: user.id,
    plan_id: planId,
    billing_cycle: billingCycle ?? 'monthly',
    started_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: { planId, billingCycle } })
}
