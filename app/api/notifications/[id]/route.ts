import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** PATCH /api/notifications/[id] — body: { action: 'read' | 'dismiss' | 'unread' } */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { action?: 'read' | 'dismiss' | 'unread' }
  const action = body.action

  let update: Record<string, string | null>
  if (action === 'read') update = { read_at: new Date().toISOString() }
  else if (action === 'unread') update = { read_at: null }
  else if (action === 'dismiss') update = { dismissed_at: new Date().toISOString(), read_at: new Date().toISOString() }
  else return NextResponse.json({ error: 'action 필수: read | unread | dismiss' }, { status: 400 })

  const { error } = await supabase
    .from('notifications')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** DELETE /api/notifications/[id] — 영구 삭제 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
