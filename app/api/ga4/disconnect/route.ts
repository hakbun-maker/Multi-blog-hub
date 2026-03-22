import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('user_oauth_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'google_analytics')

  if (error) {
    return NextResponse.json({ error: '연결 해제 실패: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
