import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('keyword_pool')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { keywords } = await request.json()
  if (!keywords?.length) return NextResponse.json({ error: '키워드를 입력하세요.' }, { status: 400 })

  const rows = (keywords as string[]).map(k => ({
    user_id: user.id,
    keyword: k.trim(),
    status: 'pending',
  }))

  const { data, error } = await supabase
    .from('keyword_pool')
    .upsert(rows, { onConflict: 'user_id,keyword', ignoreDuplicates: true })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
