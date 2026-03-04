import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('ai_api_keys')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  // POST /api/ai-keys/:id/test → 실제 API 호출로 유효성 검증
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: keyRow, error } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !keyRow) return NextResponse.json({ error: '키를 찾을 수 없습니다.' }, { status: 404 })

  try {
    const apiKey = decrypt(keyRow.encrypted_key)
    const valid = await testApiKey(keyRow.provider, apiKey)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false, error: '복호화 실패' }, { status: 500 })
  }
}

async function testApiKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      })
      return res.ok
    }
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return res.ok
    }
    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      return res.ok
    }
    return false
  } catch {
    return false
  }
}
