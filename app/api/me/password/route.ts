import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // Google OAuth 사용자는 비밀번호 변경 불가
  const provider = user.app_metadata?.provider ?? 'email'
  if (provider !== 'email') {
    return NextResponse.json({ error: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.' }, { status: 400 })
  }

  const { newPassword } = await request.json()

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 })
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
