import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'
const APP_HOSTS = ['multi-blog-hub.vercel.app', 'localhost']

export default async function sitemap({ params }: { params: { slug: string } }): Promise<MetadataRoute.Sitemap> {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const rootHost = host.split(':')[0]

  const isCustomDomain =
    !APP_HOSTS.includes(rootHost) &&
    !rootHost.endsWith('.vercel.app') &&
    rootHost !== ''

  // 커스텀 도메인이면 해당 도메인 루트 사용, 아니면 메인도메인 하위 경로
  const baseUrl = isCustomDomain
    ? `https://${rootHost}`
    : `${APP_URL}/blog/${params.slug}`

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: blog } = await supabase
    .from('blogs')
    .select('id, created_at')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!blog) return []

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, published_at')
    .eq('blog_id', blog.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ]

  for (const post of posts ?? []) {
    entries.push({
      url: `${baseUrl}/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  return entries
}
