import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

export const dynamic = 'force-dynamic'

export default async function sitemap(
  props: { params?: { slug?: string } }
): Promise<MetadataRoute.Sitemap> {
  try {
    const slug = props?.params?.slug
    if (!slug) return []

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: blog } = await supabase
      .from('blogs')
      .select('id, slug, custom_domain, created_at')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!blog) return []

    // 커스텀 도메인은 ASCII 이므로 인코딩 불필요, slug는 한글 가능 → 인코딩
    const baseUrl = blog.custom_domain
      ? `https://${blog.custom_domain}`
      : `${APP_URL}/blog/${encodeURIComponent(slug)}`

    const { data: posts } = await supabase
      .from('posts')
      .select('slug, published_at')
      .eq('blog_id', blog.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    const latestPost = posts?.[0]
    const blogLastModified = latestPost?.published_at
      ? new Date(latestPost.published_at)
      : new Date(blog.created_at)

    const entries: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: blogLastModified,
        changeFrequency: 'daily',
        priority: 1.0,
      },
    ]

    // 포스트 slug는 한글 가능 → percent-encoding (sitemap 표준)
    for (const post of posts ?? []) {
      entries.push({
        url: `${baseUrl}/${encodeURIComponent(post.slug)}`,
        lastModified: post.published_at ? new Date(post.published_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    return entries
  } catch {
    return []
  }
}
