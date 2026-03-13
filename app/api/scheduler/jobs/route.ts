import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function calcNextRunAt(hour: number, minute: number, frequency: string): Date {
  const now = new Date()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  if (next <= now) {
    if (frequency === 'daily') next.setDate(next.getDate() + 1)
    else if (frequency === 'weekly') next.setDate(next.getDate() + 7)
    else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
    else next.setDate(next.getDate() + 1)
  }
  return next
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('scheduler_jobs')
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

  const body = await request.json()
  const { name, blogIds, frequency, runHour, runMinute, postsPerRun, imageCount } = body

  if (!blogIds?.length) return NextResponse.json({ error: '블로그를 선택하세요.' }, { status: 400 })

  const nextRunAt = calcNextRunAt(runHour ?? 9, runMinute ?? 0, frequency ?? 'daily')

  const { data, error } = await supabase
    .from('scheduler_jobs')
    .insert({
      user_id: user.id,
      name: name ?? '자동화 규칙',
      blog_ids: blogIds,
      frequency: frequency ?? 'daily',
      run_hour: runHour ?? 9,
      run_minute: runMinute ?? 0,
      posts_per_run: postsPerRun ?? 1,
      image_count: imageCount ?? 0,
      status: 'active',
      next_run_at: nextRunAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
