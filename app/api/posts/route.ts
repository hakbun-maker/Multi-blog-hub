import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const blogId = searchParams.get('blogId')
  const status = searchParams.get('status')

  let query = supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (blogId) query = query.eq('blog_id', blogId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { blogId, title, htmlContent, status, tags, seoMeta } = body

  // 발행 시에만 blogId 필수
  if (status === 'published' && !blogId) {
    return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })
  }

  const finalTitle = (title && title.trim()) ? title : '제목없음'
  const slug = finalTitle.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...(blogId ? { blog_id: blogId } : {}),
      user_id: user.id,
      title: finalTitle,
      slug,
      content_html: htmlContent ?? '',
      status: status ?? 'draft',
      keyword: Array.isArray(tags) ? tags.join(',') : '',
      seo_title: seoMeta?.title ?? '',
      meta_description: seoMeta?.description ?? '',
      ...(status === 'published' && { published_at: new Date().toISOString() }),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
