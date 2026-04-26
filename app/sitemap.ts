import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 커스텀 도메인 없는 활성 블로그만 (커스텀 도메인 블로그는 자체 sitemap 보유)
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, slug, created_at')
    .eq('is_active', true)
    .is('custom_domain', null)

  if (!blogs || blogs.length === 0) return []

  const blogIds = blogs.map(b => b.id)
  const blogIdToSlug = new Map(blogs.map(b => [b.id, b.slug]))

  // 해당 블로그들의 발행글만 (join 없이 blog_id로 필터)
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, published_at, blog_id')
    .eq('status', 'published')
    .in('blog_id', blogIds)
    .order('published_at', { ascending: false })

  const entries: MetadataRoute.Sitemap = []

  // 블로그 목록 페이지 (slug에 한글이 있을 수 있어 인코딩)
  for (const blog of blogs) {
    entries.push({
      url: `${APP_URL}/blog/${encodeURIComponent(blog.slug)}`,
      lastModified: blog.created_at ? new Date(blog.created_at) : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  // 개별 글 페이지 (한글 슬러그 percent-encoding — sitemap 표준 준수)
  for (const post of posts ?? []) {
    const blogSlug = blogIdToSlug.get(post.blog_id)
    if (!blogSlug) continue

    entries.push({
      url: `${APP_URL}/blog/${encodeURIComponent(blogSlug)}/${encodeURIComponent(post.slug)}`,
      lastModified: post.published_at ? new Date(post.published_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
