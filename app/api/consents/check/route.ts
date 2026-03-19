import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasValidConsent } from '@/lib/consent/server'
import type { ConsentType } from '@/types/consent'

export async function GET(request: NextRequest) {
  // 특정 동의가 유효한지 확인
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    // Query 파라미터에서 consent type 추출
    const type = request.nextUrl.searchParams.get('type')

    if (!type) {
      return NextResponse.json(
        { error: 'type 쿼리 파라미터는 필수입니다.' },
        { status: 400 }
      )
    }

    // 동의 유효성 확인
    const isValid = await hasValidConsent(user.id, type as ConsentType)

    return NextResponse.json({
      data: {
        consent_type: type,
        user_id: user.id,
        valid: isValid,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
