import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/** 공개 API: 블로그 slug로 블로그 정보 + 발행글 + 카테고리 조회 (인증 불필요) */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const categorySlug = searchParams.get('category')

  if (!slug) return NextResponse.json({ error: 'slug 필요' }, { status: 400 })

  // 블로그 조회
  const { data: blog, error: blogErr } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (blogErr || !blog) {
    console.error('[public/blog] blog query error:', blogErr?.message, 'slug:', slug)
    return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 카테고리 조회 (서비스 롤 키로 RLS 우회)
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name, slug, sort_order')
    .eq('blog_id', blog.id)
    .order('sort_order', { ascending: true })

  // 카테고리 필터링: slug가 있으면 해당 카테고리의 글만
  let categoryId: string | null = null
  if (categorySlug && categories) {
    const found = categories.find(c => c.slug === categorySlug)
    if (found) categoryId = found.id
  }

  // 발행글 조회
  let postsQuery = supabase
    .from('posts')
    .select('*')
    .eq('blog_id', blog.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (categoryId) {
    postsQuery = postsQuery.eq('category_id', categoryId)
  }

  const { data: posts, error: postsErr } = await postsQuery

  if (postsErr) {
    console.error('[public/blog] posts query error:', postsErr.message, 'blog_id:', blog.id)
  }

  return NextResponse.json({ blog, posts: posts ?? [], categories: categories ?? [] })
}
