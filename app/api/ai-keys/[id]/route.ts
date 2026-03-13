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

/** PATCH: 활성/비활성 토글 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { is_active } = await request.json() as { is_active: boolean }

  const { data, error } = await supabase
    .from('ai_api_keys')
    .update({ is_active })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, provider, is_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/** POST: API 키 연결 테스트 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: keyRow, error } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !keyRow) return NextResponse.json({ success: false, message: '키를 찾을 수 없습니다.' })

  try {
    const apiKey = decrypt(keyRow.encrypted_key)
    const result = await testApiKey(keyRow.provider, apiKey)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ success: false, message: '키 복호화에 실패했습니다. 다시 등록해주세요.' })
  }
}

async function testApiKey(provider: string, apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      })
      return res.ok
        ? { success: true, message: 'Claude API 연결 성공' }
        : { success: false, message: `Claude API 오류 (${res.status})` }
    }
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return res.ok
        ? { success: true, message: 'OpenAI API 연결 성공' }
        : { success: false, message: `OpenAI API 오류 (${res.status})` }
    }
    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      return res.ok
        ? { success: true, message: 'Gemini API 연결 성공' }
        : { success: false, message: `Gemini API 오류 (${res.status})` }
    }
    if (provider === 'imagen') {
      // Gemini/Imagen은 같은 키 → 모델 목록 조회로 테스트
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      return res.ok
        ? { success: true, message: 'Imagen API 연결 성공 (Google AI Studio 키 확인됨)' }
        : { success: false, message: `Google API 오류 (${res.status})` }
    }
    return { success: false, message: '알 수 없는 공급자' }
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : 'API 연결 실패' }
  }
}
