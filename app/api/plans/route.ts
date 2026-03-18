import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const [{ data: plans }, { data: features }, { data: discounts }] = await Promise.all([
    supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('plan_features').select('*'),
    supabase.from('discount_policies').select('*').eq('is_active', true),
  ])

  const plansWithFeatures = (plans ?? []).map(plan => ({
    ...plan,
    features: Object.fromEntries(
      (features ?? [])
        .filter(f => f.plan_id === plan.id)
        .map(f => [f.feature_key, f.enabled])
    ),
  }))

  const now = new Date().toISOString()
  const activeDiscounts = (discounts ?? []).filter(d => {
    if (d.start_at && d.start_at > now) return false
    if (d.end_at && d.end_at < now) return false
    return true
  })

  return NextResponse.json({ data: { plans: plansWithFeatures, discounts: activeDiscounts } })
}
