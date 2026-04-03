import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 블로그별 글 수를 한 번에 조회 (N+1 방지)
  if (data && data.length > 0) {
    const blogIds = data.map(b => b.id)
    const { data: postCounts } = await supabase
      .from('posts')
      .select('blog_id, status')
      .in('blog_id', blogIds)

    if (postCounts) {
      const countMap: Record<string, { total: number; published: number }> = {}
      for (const p of postCounts) {
        if (!countMap[p.blog_id]) countMap[p.blog_id] = { total: 0, published: 0 }
        countMap[p.blog_id].total++
        if (p.status === 'published') countMap[p.blog_id].published++
      }
      for (const blog of data) {
        (blog as any).postCount = countMap[blog.id] ?? { total: 0, published: 0 }
      }
    }
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 플랜 블로그 수 제한 체크
  const { getUserPlanContext, canCreateBlog } = await import('@/lib/plan/server')
  const planCtx = await getUserPlanContext()
  if (planCtx) {
    const check = canCreateBlog(planCtx)
    if (!check.allowed) {
      return NextResponse.json({ error: check.message, code: 'PLAN_LIMIT_BLOGS' }, { status: 403 })
    }
  }

  const body = await request.json()
  const { name, slug, description, customDomain, subdomain, aiProvider, color } = body

  if (!name || !slug) {
    return NextResponse.json({ error: '이름과 슬러그는 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('blogs')
    .insert({
      user_id: user.id,
      name,
      slug,
      description,
      custom_domain: customDomain,
      subdomain: subdomain || slug,
      ai_provider: aiProvider ?? 'claude',
      color: color ?? '#3b82f6',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 슬러그입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Google Indexing OAuth가 연결되어 있으면 새 블로그를 GSC에 자동 등록
  try {
    const { registerBlogToGSC } = await import('@/lib/google/gsc-site')
    const result = await registerBlogToGSC(user.id, {
      id: data.id,
      slug: data.slug,
      custom_domain: data.custom_domain,
    })
    if (result.ok) {
      console.log(`GSC auto-register on blog create: ${data.slug}`)
    }
  } catch (e) {
    // GSC 등록 실패해도 블로그 생성은 성공으로 처리
    console.error('GSC auto-register on blog create error (non-blocking):', e)
  }

  return NextResponse.json({ data }, { status: 201 })
}
