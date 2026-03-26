import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 커스텀 도메인 없는 활성 블로그만 (커스텀 도메인 블로그는 자체 sitemap 보유)
  const { data: blogs } = await supabase
    .from('blogs')
    .select('slug, created_at')
    .eq('is_active', true)
    .is('custom_domain', null)

  // 커스텀 도메인 없는 블로그의 발행글만
  const blogSlugs = (blogs ?? []).map(b => b.slug)
  if (blogSlugs.length === 0) return []

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, published_at, blog_id, blogs!inner(slug, custom_domain)')
    .eq('status', 'published')
    .is('blogs.custom_domain', null)
    .order('published_at', { ascending: false })

  const entries: MetadataRoute.Sitemap = []

  // 블로그 목록 페이지
  for (const blog of blogs ?? []) {
    entries.push({
      url: `${APP_URL}/blog/${blog.slug}`,
      lastModified: blog.created_at ? new Date(blog.created_at) : new Date(),
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
