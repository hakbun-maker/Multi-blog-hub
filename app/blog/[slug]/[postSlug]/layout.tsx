import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

// ISR: 1시간마다 백그라운드 갱신
export const revalidate = 3600

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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 블로그 조회
  const { data: blog } = await supabase
    .from('blogs')
    .select('id, name, slug, blog_type')
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

  const BLOG_TYPE_KW: Record<string, string[]> = {
    legal: ['법률', '법률상담', 'legal'],
    finance: ['금융', '재테크', 'finance'],
    medical: ['의료', '건강', 'medical', 'health'],
    'it-tech': ['IT', '기술', 'technology'],
    education: ['교육', '학습', 'education'],
    'beauty-fashion': ['뷰티', '패션', 'beauty', 'fashion'],
    food: ['음식', '맛집', '요리', 'food'],
    travel: ['여행', 'travel'],
    parenting: ['육아', '자녀교육', 'parenting'],
    lifestyle: ['라이프스타일', 'lifestyle'],
    'real-estate': ['부동산', '부동산투자', 'real estate'],
    business: ['비즈니스', '경영', 'business'],
    entertainment: ['엔터테인먼트', 'entertainment'],
    sports: ['스포츠', 'sports'],
    pets: ['반려동물', '펫', 'pets'],
    automotive: ['자동차', 'automotive'],
    interior: ['인테리어', '홈데코', 'interior'],
    news: ['뉴스', 'news'],
    science: ['과학', 'science'],
  }

  const postKeywords = post.keyword
    ? post.keyword.split(',').map((k: string) => k.trim()).filter(Boolean)
    : []
  const typeKeywords = blog.blog_type ? (BLOG_TYPE_KW[blog.blog_type] ?? []) : []
  const keywords = [...postKeywords, ...typeKeywords].length > 0
    ? [...postKeywords, ...typeKeywords]
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
