import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { name, sortOrder } = body

  const slug = name
    ? name.trim().toLowerCase().replace(/[^a-z0-9가-힣\s]+/g, '').replace(/\s+/g, '-').replace(/^-|-$/g, '') || 'category'
    : undefined

  const { data, error } = await supabase
    .from('categories')
    .update({
      ...(name !== undefined && { name: name.trim(), slug }),
      ...(sortOrder !== undefined && { sort_order: sortOrder }),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 이 카테고리에 속한 글 수 확인
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', params.id)

  const { searchParams } = new URL(request.url)
  const targetCategoryId = searchParams.get('targetCategoryId')

  if ((count ?? 0) > 0 && !targetCategoryId) {
    return NextResponse.json({
      error: '이 카테고리에 글이 있습니다. 글을 이동할 대상 카테고리를 지정해주세요.',
      postCount: count,
    }, { status: 400 })
  }

  // 글 이동 (targetCategoryId=none이면 미분류로)
  if ((count ?? 0) > 0 && targetCategoryId) {
    await supabase
      .from('posts')
      .update({ category_id: targetCategoryId === 'none' ? null : targetCategoryId })
      .eq('category_id', params.id)
  }

  // 블로그의 기본 카테고리가 이것이었으면 초기화
  await supabase
    .from('blogs')
    .update({ default_category_id: null })
    .eq('default_category_id', params.id)

  const { error } = await supabase.from('categories').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
