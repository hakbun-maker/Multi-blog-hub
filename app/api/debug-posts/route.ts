import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // 1. Direct fetch to PostgREST
  const directRes = await fetch(
    `${url}/rest/v1/blogs?slug=eq.moneycopyway&is_active=eq.true&select=id,slug,name`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    }
  )
  const directBlogs = await directRes.json()
  const blogId = directBlogs?.[0]?.id

  let directPosts: unknown[] = []
  if (blogId) {
    const postsRes = await fetch(
      `${url}/rest/v1/posts?blog_id=eq.${blogId}&status=eq.published&select=id,title,slug&order=published_at.desc&limit=5`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    )
    directPosts = await postsRes.json()
  }

  // 2. Supabase client
  const supabase = createClient(url, key, {
    global: { fetch: (u, o) => fetch(u, { ...o, cache: 'no-store' }) },
  })

  const { data: blog, error: blogErr } = await supabase
    .from('blogs')
    .select('id, slug, name')
    .eq('slug', 'moneycopyway')
    .eq('is_active', true)
    .single()

  let clientPosts: unknown[] = []
  let postsErr = null
  if (blog) {
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, slug')
      .eq('blog_id', blog.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5)
    clientPosts = data ?? []
    postsErr = error
  }

  return NextResponse.json({
    direct: { blogs: directBlogs, posts: directPosts },
    client: { blog, blogErr, posts: clientPosts, postsErr },
    env: { hasUrl: !!url, hasKey: !!key, keyPrefix: key?.slice(0, 20) },
  })
}
