import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

interface LayoutProps {
  children: React.ReactNode
  params: { slug: string; postSlug: string }
}

/** 첫 번째 이미지 URL 추출 */
function extractFirstImage(html?: string): string | null {
  if (!html) return null
  const match = html.match(/<img[^>]+src="([^"]+)"/)
  return match?.[1] ?? null
}

/** HTML 태그 제거 */
function stripHtml(html?: string): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  noStore()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (u: any, o: any) => fetch(u, { ...o, cache: 'no-store' }) } },
  )

  // 블로그 조회
  const { data: blog } = await supabase
    .from('blogs')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!blog) return {}

  // 글 조회
  const { data: post } = await supabase
    .from('posts')
    .select('title, seo_title, meta_description, content_html, published_at, keyword')
    .eq('blog_id', blog.id)
    .eq('slug', params.postSlug)
    .eq('status', 'published')
    .single()

  if (!post) return {}

  const title = post.seo_title || post.title
  const description = post.meta_description || stripHtml(post.content_html).slice(0, 160)
  const thumbnail = extractFirstImage(post.content_html)
  const url = `${APP_URL}/blog/${blog.slug}/${params.postSlug}`

  const keywords = post.keyword
    ? post.keyword.split(',').map((k: string) => k.trim()).filter(Boolean)
    : undefined

  return {
    title,
    description,
    keywords,
    authors: [{ name: blog.name }],
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: blog.name,
      publishedTime: post.published_at || undefined,
      ...(thumbnail ? { images: [{ url: thumbnail, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: thumbnail ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(thumbnail ? { images: [thumbnail] } : {}),
    },
    alternates: {
      canonical: url,
    },
  }
}

export default function PostLayout({ children }: LayoutProps) {
  return <>{children}</>
}
