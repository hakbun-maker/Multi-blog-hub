/**
 * 파이프라인 항목 수정/삭제 API
 * PATCH: 키워드, 블로그, 발행일정 수정
 * DELETE: 항목 삭제
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const updateData: Record<string, unknown> = {}

  if (body.keyword_text !== undefined) updateData.keyword_text = body.keyword_text
  if (body.assigned_blog_id !== undefined) {
    updateData.assigned_blog_id = body.assigned_blog_id
    updateData.assigned_blog_name = body.assigned_blog_name ?? null
  }
  if (body.scheduled_date !== undefined) updateData.scheduled_date = body.scheduled_date
  if (body.scheduled_time !== undefined) updateData.scheduled_time = body.scheduled_time

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: '수정할 필드가 없습니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('keyword_pipeline')
    .update(updateData)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('keyword_pipeline')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
