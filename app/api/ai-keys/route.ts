import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/utils/encryption'

const SUPPORTED_PROVIDERS = [
  'claude',
  'openai',
  'gemini',
  'imagen',
  'naver_ad',
  'naver_search',
  'google_kwp',
  'coupang',
  'amazon',
] as const

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('ai_api_keys')
    .select('id, provider, is_active, created_at, encrypted_key, encrypted_secret')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const masked = (data ?? []).map(k => {
    let maskedKey = '••••••••'
    try {
      const plain = decrypt(k.encrypted_key)
      maskedKey = plain.slice(0, 4) + '••••••••' + plain.slice(-4)
    } catch { /* 복호화 실패 시 기본 마스킹 */ }

    return {
      id: k.id,
      provider: k.provider,
      is_active: k.is_active,
      created_at: k.created_at,
      masked_key: maskedKey,
      has_secret: !!k.encrypted_secret,
    }
  })

  return NextResponse.json({ data: masked })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { provider, apiKey, apiSecret } = await request.json()

  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'provider와 apiKey는 필수입니다.' }, { status: 400 })
  }
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: '지원하지 않는 프로바이더입니다.' }, { status: 400 })
  }

  const encryptedKey = encrypt(apiKey)
  const encryptedSecret = apiSecret ? encrypt(apiSecret) : null

  const { data, error } = await supabase
    .from('ai_api_keys')
    .upsert({
      user_id: user.id,
      provider,
      encrypted_key: encryptedKey,
      encrypted_secret: encryptedSecret,
      is_active: true,
    }, { onConflict: 'user_id,provider' })
    .select('id, provider, is_active, created_at, encrypted_secret')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: {
      id: data.id,
      provider: data.provider,
      is_active: data.is_active,
      created_at: data.created_at,
      has_secret: !!data.encrypted_secret,
    }
  }, { status: 201 })
}
