import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { name, blogIds, frequency, runHour, runMinute, postsPerRun, imageCount, status } = body

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (blogIds !== undefined) updates.blog_ids = blogIds
  if (frequency !== undefined) updates.frequency = frequency
  if (runHour !== undefined) updates.run_hour = runHour
  if (runMinute !== undefined) updates.run_minute = runMinute
  if (postsPerRun !== undefined) updates.posts_per_run = postsPerRun
  if (imageCount !== undefined) updates.image_count = imageCount
  if (status !== undefined) updates.status = status

  const { data, error } = await supabase
    .from('scheduler_jobs')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('scheduler_jobs')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
