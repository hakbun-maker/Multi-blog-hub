import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
  const { name, description, customDomain, aiCharacterConfig, aiProvider, isActive, color, url, defaultCategoryId, blogType } = body

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
      ...(blogType !== undefined && { blog_type: blogType }),
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
