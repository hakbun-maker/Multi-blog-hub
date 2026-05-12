import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { submitUrlToGoogle } from '@/lib/google/indexing-api'
import { applyPostStyles } from '@/lib/utils/post-styles'
import { pickThemeForBlogType } from '@/lib/utils/post-themes'

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

  // htmlContent가 들어왔으면 블로그 타입에 맞는 테마로 표 인라인 스타일 후처리
  let styledHtml: string | undefined
  if (htmlContent !== undefined) {
    let blogType: string | null = null
    const targetBlogId = blogId
    if (targetBlogId) {
      const { data: bd } = await supabase
        .from('blogs').select('blog_type').eq('id', targetBlogId).single()
      blogType = bd?.blog_type ?? null
    } else {
      // blogId가 안 넘어오면 기존 글의 blog_id로 조회
      const { data: pd } = await supabase
        .from('posts').select('blog_id').eq('id', params.id).single()
      if (pd?.blog_id) {
        const { data: bd } = await supabase
          .from('blogs').select('blog_type').eq('id', pd.blog_id).single()
        blogType = bd?.blog_type ?? null
      }
    }
    const themeId = pickThemeForBlogType(blogType).id
    styledHtml = applyPostStyles(htmlContent ?? '', themeId)
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      ...(finalTitle !== undefined && { title: finalTitle }),
      ...(styledHtml !== undefined && { content_html: styledHtml }),
      ...(status !== undefined && { status }),
      ...(tags !== undefined && { keyword: Array.isArray(tags) ? tags.join(',') : '' }),
      ...(seoMeta !== undefined && { seo_title: (seoMeta?.title ?? '').slice(0, 60), meta_description: (seoMeta?.description ?? '').slice(0, 155) }),
      ...(blogId !== undefined && { blog_id: blogId }),
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(status === 'published' && { published_at: new Date().toISOString() }),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 글 발행 시 또는 발행 상태로 콘텐츠 수정 시 Google Indexing API 자동 호출
  // (재색인 트리거: status가 published이거나, 이미 published 상태인 글에 콘텐츠 변경 발생)
  let indexing: { requested: boolean; ok?: boolean; error?: string; needsConnection?: boolean } = { requested: false }

  const contentChanged = htmlContent !== undefined || title !== undefined
  const shouldReindex = (status === 'published') || (data?.status === 'published' && contentChanged)

  if (shouldReindex && data) {
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

          // RLS 통과를 위해 cookie 인증된 supabase client를 전달
          const result = await submitUrlToGoogle(supabase, user.id, postUrl)
          indexing = { requested: true, ok: result.ok, error: result.error, needsConnection: result.needsConnection }
          if (!result.ok && !result.needsConnection) console.error('Google Indexing 실패:', result.error)
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
