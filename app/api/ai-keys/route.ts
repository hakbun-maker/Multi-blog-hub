import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/utils/encryption'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('ai_api_keys')
    .select('id, provider, is_active, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { provider, apiKey } = body

  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'provider와 apiKey는 필수입니다.' }, { status: 400 })
  }
  if (!['claude', 'openai', 'gemini'].includes(provider)) {
    return NextResponse.json({ error: '지원하지 않는 AI 공급자입니다.' }, { status: 400 })
  }

  const encryptedKey = encrypt(apiKey)

  const { data, error } = await supabase
    .from('ai_api_keys')
    .upsert({
      user_id: user.id,
      provider,
      encrypted_key: encryptedKey,
      is_active: true,
    }, { onConflict: 'user_id,provider' })
    .select('id, provider, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
