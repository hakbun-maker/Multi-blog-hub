import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { submitUrlToGoogle } from '@/lib/google/indexing-api'
import { resubmitSitemapForBlog } from '@/lib/google/gsc-site'

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
  const categoryId = searchParams.get('categoryId')
  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 플랜 월간 글쓰기 제한 체크
  const { getUserPlanContext, canCreatePost } = await import('@/lib/plan/server')
  const planCtx = await getUserPlanContext()
  if (planCtx) {
    const check = canCreatePost(planCtx)
    if (!check.allowed) {
      return NextResponse.json({ error: check.message, code: 'PLAN_LIMIT_POSTS' }, { status: 403 })
    }
  }

  const body = await request.json()
  const { blogId, title, htmlContent, status, tags, seoMeta, categoryId } = body

  // 발행 시에만 blogId 필수
  if (status === 'published' && !blogId) {
    return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })
  }

  const finalTitle = (title && title.trim()) ? title : '제목없음'
  // slug 생성: 한글 + ASCII + 확장 라틴 문자(악센트 등) 모두 지원
  const slug = finalTitle
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // 악센트 분리 후 제거 (é→e, ü→u)
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now()

  // categoryId가 없으면 블로그의 기본 카테고리 사용 (서버 fallback)
  let resolvedCategoryId = categoryId || null
  if (!resolvedCategoryId && blogId) {
    const { data: blogData } = await supabase
      .from('blogs')
      .select('default_category_id')
      .eq('id', blogId)
      .single()
    resolvedCategoryId = blogData?.default_category_id ?? null
  }

  // SEO 필드 안전 트렁케이션 (DB varchar 제한 대응, adapter에서 이미 처리되지만 2중 안전장치)
  const safeSeoTitle = (seoMeta?.title ?? '').slice(0, 60)
  const safeMetaDesc = (seoMeta?.description ?? '').slice(0, 160)

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...(blogId ? { blog_id: blogId } : {}),
      ...(resolvedCategoryId ? { category_id: resolvedCategoryId } : {}),
      user_id: user.id,
      title: finalTitle,
      slug,
      content_html: htmlContent ?? '',
      status: status ?? 'draft',
      keyword: Array.isArray(tags) ? tags.join(',') : '',
      seo_title: safeSeoTitle,
      meta_description: safeMetaDesc,
      ...(status === 'published' && { published_at: new Date().toISOString() }),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 글 발행 시 Google Indexing API 자동 호출
  let indexing: { requested: boolean; ok?: boolean; error?: string } = { requested: false }

  if (status === 'published' && data && blogId) {
    try {
      const { data: blog } = await supabase
        .from('blogs')
        .select('slug, custom_domain, layout_config')
        .eq('id', blogId)
        .single()

      if (blog) {
        const tracking = (blog.layout_config as Record<string, unknown>)?.tracking as Record<string, unknown> | undefined
        if (tracking?.gsc_auto_index) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'
          // canonical과 sitemap이 percent-encoded 형태이므로 URL도 동일하게
          const blogBase = blog.custom_domain
            ? `https://${blog.custom_domain}`
            : `${appUrl}/blog/${encodeURIComponent(blog.slug)}`
          const postUrl = `${blogBase}/${encodeURIComponent(data.slug)}`

          const result = await submitUrlToGoogle(user.id, postUrl)
          indexing = { requested: true, ok: result.ok, error: result.error }
          if (!result.ok) console.error('Google Indexing 실패:', result.error)

          // 발행 후 sitemap 재제출 (GSC가 새 URL을 빠르게 발견하도록 신호)
          // 비동기 fire-and-forget — 실패해도 발행 결과에 영향 없음
          resubmitSitemapForBlog(user.id, {
            id: blogId,
            slug: blog.slug,
            custom_domain: blog.custom_domain,
          }).catch(err => console.error('Sitemap 재제출 실패 (무시):', err))
        }
      }
    } catch (e) {
      console.error('Google Indexing 처리 중 오류:', e)
      indexing = { requested: true, ok: false, error: 'Indexing API 호출 중 오류 발생' }
    }
  }

  return NextResponse.json({ data, indexing }, { status: 201 })
}
