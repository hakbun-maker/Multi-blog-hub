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
      seo_title: seoMeta?.title ?? '',
      meta_description: seoMeta?.description ?? '',
      ...(status === 'published' && { published_at: new Date().toISOString() }),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
