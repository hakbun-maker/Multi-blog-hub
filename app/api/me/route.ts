import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data } = await supabase.from('users').select('id, email, name').eq('id', user.id).single()
  return NextResponse.json({ data: data ?? { email: user.email, name: null } })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { name } = await request.json()
  const { data, error } = await supabase
    .from('users')
    .update({ name })
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
