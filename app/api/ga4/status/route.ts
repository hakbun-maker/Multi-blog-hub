import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: token } = await supabase
    .from('user_oauth_tokens')
    .select('google_account_id, connected_at')
    .eq('user_id', user.id)
    .eq('provider', 'google_analytics')
    .single()

  return NextResponse.json({
    connected: !!token,
    googleAccountId: token?.google_account_id || null,
    connectedAt: token?.connected_at || null,
  })
}
