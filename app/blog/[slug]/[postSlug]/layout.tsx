import { unstable_noStore as noStore } from 'next/cache'
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }

  // 블로그 조회
  const blogRes = await fetch(
    `${supabaseUrl}/rest/v1/blogs?slug=eq.${encodeURIComponent(params.slug)}&is_active=eq.true&select=id,name,slug&limit=1`,
    { headers, cache: 'no-store' },
  )
  const blogs = await blogRes.json()
  const blog = blogs?.[0]
  if (!blog) return {}

  // 글 조회
  const postRes = await fetch(
    `${supabaseUrl}/rest/v1/posts?blog_id=eq.${blog.id}&slug=eq.${encodeURIComponent(params.postSlug)}&status=eq.published&select=title,seo_title,meta_description,content_html,published_at,keyword&limit=1`,
    { headers, cache: 'no-store' },
  )
  const posts = await postRes.json()
  const post = posts?.[0]
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
