import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { mergeAdsConfig, type UserAdsConfig } from '@/lib/ads/types'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('users')
    .select('ads_config')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: mergeAdsConfig(data?.ads_config as Partial<UserAdsConfig> | null) })
}

export async function PUT(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  // 입력 검증 — 알려진 필드만 통과시키고 나머지는 무시 (jsonb 오염 방지)
  const merged = mergeAdsConfig(body as Partial<UserAdsConfig>)

  const { error } = await supabase
    .from('users')
    .update({ ads_config: merged })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: merged })
}
