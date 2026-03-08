import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { title, htmlContent, status, tags, seoMeta, blogId } = body

  // 제목이 비어 있으면 '제목없음' 기본값
  const finalTitle = title !== undefined ? ((title && title.trim()) ? title : '제목없음') : undefined

  const { data, error } = await supabase
    .from('posts')
    .update({
      ...(finalTitle !== undefined && { title: finalTitle }),
      ...(htmlContent !== undefined && { content_html: htmlContent }),
      ...(status !== undefined && { status }),
      ...(tags !== undefined && { keyword: Array.isArray(tags) ? tags.join(',') : '' }),
      ...(seoMeta !== undefined && { seo_title: seoMeta?.title ?? '', meta_description: seoMeta?.description ?? '' }),
      ...(blogId !== undefined && { blog_id: blogId }),
      ...(status === 'published' && { published_at: new Date().toISOString() }),
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
    .from('posts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
