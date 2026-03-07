import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/utils/encryption'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('ai_api_keys')
    .select('id, provider, is_active, created_at, encrypted_key')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // encrypted_key를 노출하지 않고 마스킹된 키만 반환
  const masked = (data ?? []).map(k => {
    let maskedKey = '••••••••'
    try {
      const plain = decrypt(k.encrypted_key)
      maskedKey = plain.slice(0, 4) + '••••••••' + plain.slice(-4)
    } catch { /* 복호화 실패 시 기본 마스킹 */ }
    return { id: k.id, provider: k.provider, is_active: k.is_active, created_at: k.created_at, masked_key: maskedKey }
  })

  return NextResponse.json({ data: masked })
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
  if (!['claude', 'openai', 'gemini', 'imagen'].includes(provider)) {
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
