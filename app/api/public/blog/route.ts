import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** 공개 API: 블로그 slug로 블로그 정보 + 발행글 조회 (인증 불필요) */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

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

  // 발행글 조회
  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select('*')
    .eq('blog_id', blog.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (postsErr) {
    console.error('[public/blog] posts query error:', postsErr.message, 'blog_id:', blog.id)
  }

  return NextResponse.json({ blog, posts: posts ?? [] })
}
