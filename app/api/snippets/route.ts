import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const blogId = searchParams.get('blogId')

  let query = supabase
    .from('snippets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (blogId) query = query.eq('blog_id', blogId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { name, content, type, blogId } = body

  if (!name) return NextResponse.json({ error: '이름은 필수입니다.' }, { status: 400 })

  const { data, error } = await supabase
    .from('snippets')
    .insert({
      user_id: user.id,
      name,
      content: content ?? '',
      type: type ?? 'text',
      blog_id: blogId ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
