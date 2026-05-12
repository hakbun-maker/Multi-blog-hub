/**
 * GET  /api/notifications        — 사용자의 미해결 알림 목록 + 미읽음 카운트
 * PATCH /api/notifications/[id]  — read/dismiss 처리 (별도 [id] 라우트)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unreadCount = (data ?? []).filter(n => n.read_at === null).length

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount,
  })
}

/**
 * POST — 트리거에서 직접 호출하지 않고 별도 헬퍼(lib/notifications/trigger.ts)에서 사용.
 * 외부 클라이언트가 알림 직접 생성할 일은 없음.
 */
