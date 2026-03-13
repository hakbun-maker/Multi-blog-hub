import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const blogId = searchParams.get('blogId')
  if (!blogId) return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('blog_id', blogId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { blogId, name } = body
  if (!blogId || !name?.trim()) {
    return NextResponse.json({ error: 'blogId와 name은 필수입니다.' }, { status: 400 })
  }

  const slug = name.trim().toLowerCase()
    .replace(/[^a-z0-9가-힣\s]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '') || 'category'

  // 다음 sort_order 계산
  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('blog_id', blogId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  const nextOrder = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('categories')
    .insert({ blog_id: blogId, name: name.trim(), slug, sort_order: nextOrder })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 카테고리입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
