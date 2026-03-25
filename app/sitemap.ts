import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 활성 블로그 조회
  const { data: blogs } = await supabase
    .from('blogs')
    .select('slug, created_at')
    .eq('is_active', true)

  // 발행글 조회
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, published_at, blog_id, blogs!inner(slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const entries: MetadataRoute.Sitemap = []

  // 블로그 목록 페이지
  for (const blog of blogs ?? []) {
    entries.push({
      url: `${APP_URL}/blog/${blog.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  // 개별 글 페이지
  for (const post of posts ?? []) {
    const blogSlug = (post as Record<string, unknown>).blogs
      ? ((post as Record<string, unknown>).blogs as { slug: string }).slug
      : null
    if (!blogSlug) continue

    entries.push({
      url: `${APP_URL}/blog/${blogSlug}/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
