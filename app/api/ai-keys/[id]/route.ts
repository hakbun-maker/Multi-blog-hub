import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'
import { testProviderConnection, ApiProvider } from '@/lib/utils/api-key-helpers'

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

/** POST: API 키 연결 테스트 또는 활성 토글 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* empty body → default to test */ }
  const action = body.action || 'test'

  if (action === 'test') {
    return handleTestConnection(supabase, user.id, params.id)
  }

  return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 })
}

async function handleTestConnection(supabase: any, userId: string, keyId: string) {
  const { data: keyRow, error } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key, encrypted_secret')
    .eq('id', keyId)
    .eq('user_id', userId)
    .single()

  if (error || !keyRow) {
    return NextResponse.json({ success: false, message: '키를 찾을 수 없습니다.' }, { status: 404 })
  }

  try {
    const apiKey = decrypt(keyRow.encrypted_key)
    const apiSecret = keyRow.encrypted_secret ? decrypt(keyRow.encrypted_secret) : undefined

    const result = await testProviderConnection(
      keyRow.provider as ApiProvider,
      apiKey,
      apiSecret
    )

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({
      success: false,
      message: '키 복호화에 실패했습니다. 다시 등록해주세요.',
    })
  }
}
