import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { addVercelDomain, removeVercelDomain } from '@/lib/vercel'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { name, description, customDomain, aiCharacterConfig, aiProvider, isActive, color, url, defaultCategoryId } = body

  // 커스텀 도메인 변경 시 Vercel 자동 연동
  if (customDomain !== undefined) {
    // 기존 도메인 조회
    const { data: existing } = await supabase
      .from('blogs')
      .select('custom_domain')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    const oldDomain = existing?.custom_domain ?? null
    const newDomain = customDomain || null

    // 도메인이 변경된 경우
    if (oldDomain !== newDomain) {
      // 기존 도메인 Vercel에서 제거
      if (oldDomain) await removeVercelDomain(oldDomain)
      // 새 도메인 Vercel에 등록
      if (newDomain) {
        const result = await addVercelDomain(newDomain)
        if (!result.ok) {
          return NextResponse.json({ error: `도메인 등록 실패: ${result.error}` }, { status: 400 })
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('blogs')
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(customDomain !== undefined && { custom_domain: customDomain }),
      ...(aiCharacterConfig !== undefined && { ai_character_config: aiCharacterConfig }),
      ...(aiProvider !== undefined && { ai_provider: aiProvider }),
      ...(isActive !== undefined && { is_active: isActive }),
      ...(color !== undefined && { color }),
      ...(url !== undefined && { url }),
      ...(defaultCategoryId !== undefined && { default_category_id: defaultCategoryId }),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('blogs')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
