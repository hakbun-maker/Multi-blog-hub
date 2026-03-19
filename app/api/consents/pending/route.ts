import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getPendingConsents } from '@/lib/consent/server'

export async function GET() {
  // 미동의 / 재동의 필요 목록 조회
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    // 미동의 동의 목록 조회
    const pendingConsents = await getPendingConsents(user.id)

    return NextResponse.json({
      data: {
        user_id: user.id,
        pending: pendingConsents,
        count: pendingConsents.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
