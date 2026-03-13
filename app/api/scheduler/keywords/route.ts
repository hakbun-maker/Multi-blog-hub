import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  const status = searchParams.get('status')

  let query = supabase
    .from('keyword_pool')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (jobId) query = query.eq('job_id', jobId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { keywords, jobId } = body  // keywords: string[]

  if (!keywords?.length) return NextResponse.json({ error: '키워드를 입력하세요.' }, { status: 400 })

  const rows = keywords.map((keyword: string) => ({
    user_id: user.id,
    keyword: keyword.trim(),
    job_id: jobId ?? null,
    status: 'pending',
  }))

  const { data, error } = await supabase
    .from('keyword_pool')
    .upsert(rows, { onConflict: 'user_id,keyword', ignoreDuplicates: true })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('keyword_pool')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
