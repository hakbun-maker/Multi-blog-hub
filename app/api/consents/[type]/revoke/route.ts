import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revokeConsent } from '@/lib/consent/server'
import type { ConsentType } from '@/types/consent'

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  // 특정 동의 철회
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const { type } = params
    const body = await request.json()
    const { reason } = body as { reason?: string }

    if (!type) {
      return NextResponse.json({ error: 'consent type은 필수입니다.' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: '철회 사유(reason)는 필수입니다.' }, { status: 400 })
    }

    // 동의 철회
    await revokeConsent(user.id, type as ConsentType, reason)

    return NextResponse.json({
      data: {
        user_id: user.id,
        consent_type: type,
        revoked_at: new Date().toISOString(),
        reason,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
