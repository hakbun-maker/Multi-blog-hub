import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data } = await supabase
    .from('users')
    .select('id, email, name, display_name, phone, country')
    .eq('id', user.id)
    .single()

  const auth_provider = user.app_metadata?.provider ?? 'email'

  return NextResponse.json({
    data: data ?? { email: user.email, name: null, display_name: null, phone: null, country: 'KR' },
    auth_provider,
  })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { name, display_name, phone, country } = body

  const updateFields: Record<string, string | null> = {}
  if (name !== undefined) updateFields.name = name
  if (display_name !== undefined) updateFields.display_name = display_name
  if (phone !== undefined) updateFields.phone = phone
  if (country !== undefined) updateFields.country = country

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: '변경할 필드가 없습니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('users')
    .update(updateFields)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 1. 사용자의 블로그 삭제
  await supabase.from('blogs').delete().eq('user_id', user.id)

  // 2. AI 키 삭제
  await supabase.from('ai_keys').delete().eq('user_id', user.id)

  // 3. 동의 기록 삭제
  await supabase.from('consent_logs').delete().eq('user_id', user.id)

  // 4. users 테이블에서 삭제
  const { error } = await supabase.from('users').delete().eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 5. Auth 사용자 로그아웃
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
