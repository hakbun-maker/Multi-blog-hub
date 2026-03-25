import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { submitUrlToGoogle } from '@/lib/google/indexing-api'

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
  const { title, htmlContent, status, tags, seoMeta, blogId, categoryId } = body

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
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(status === 'published' && { published_at: new Date().toISOString() }),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 글 발행 시 Google Indexing API 자동 호출
  let indexing: { requested: boolean; ok?: boolean; error?: string } = { requested: false }

  if (status === 'published' && data) {
    try {
      const { data: blog } = await supabase
        .from('blogs')
        .select('slug, custom_domain, layout_config')
        .eq('id', data.blog_id)
        .single()

      if (blog) {
        const tracking = (blog.layout_config as Record<string, unknown>)?.tracking as Record<string, unknown> | undefined
        if (tracking?.gsc_auto_index) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'
          const blogBase = blog.custom_domain
            ? `https://${blog.custom_domain}`
            : `${appUrl}/blog/${blog.slug}`
          const postUrl = `${blogBase}/${data.slug}`

          const result = await submitUrlToGoogle(user.id, postUrl)
          indexing = { requested: true, ok: result.ok, error: result.error }
          if (!result.ok) console.error('Google Indexing 실패:', result.error)
        }
      }
    } catch (e) {
      console.error('Google Indexing 처리 중 오류:', e)
      indexing = { requested: true, ok: false, error: 'Indexing API 호출 중 오류 발생' }
    }
  }

  return NextResponse.json({ data, indexing })
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
