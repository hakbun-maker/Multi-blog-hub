import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

// ISR: 30분마다 백그라운드 갱신
export const revalidate = 1800

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

interface LayoutProps {
  children: React.ReactNode
  params: { slug: string }
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: blog } = await supabase
    .from('blogs')
    .select('name, description, layout_config, custom_domain')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!blog) return {}

  const lc = blog.layout_config as Record<string, unknown> | null
  const tracking = lc?.tracking as Record<string, string> | undefined
  const header = lc?.header as Record<string, string | null> | undefined
  const logoImageUrl = header?.logo_image_url || null
  const faviconUrl = header?.favicon_url || null

  const verification: Record<string, string> = {}
  if (tracking?.gsc_code) verification.google = tracking.gsc_code
  if (tracking?.naver_code) verification.other = tracking.naver_code

  // 커스텀 도메인이 있으면 해당 도메인 기준, 없으면 앱 도메인 기준 (slug 한글 인코딩)
  const url = blog.custom_domain
    ? `https://${blog.custom_domain}`
    : `${APP_URL}/blog/${encodeURIComponent(params.slug)}`

  return {
    title: blog.name,
    description: blog.description || undefined,
    verification,
    ...(faviconUrl ? {
      icons: { icon: faviconUrl, apple: faviconUrl },
    } : {}),
    openGraph: {
      type: 'website',
      title: blog.name,
      description: blog.description || undefined,
      url,
      siteName: blog.name,
      ...(logoImageUrl ? { images: [{ url: logoImageUrl, width: 1200, height: 630, alt: blog.name }] } : {}),
    },
    twitter: {
      card: logoImageUrl ? 'summary_large_image' : 'summary',
      title: blog.name,
      description: blog.description || undefined,
      ...(logoImageUrl ? { images: [logoImageUrl] } : {}),
    },
    alternates: {
      canonical: url,
    },
    other: {
      ...(tracking?.naver_code ? { 'naver-site-verification': tracking.naver_code } : {}),
    },
  }
}

export default function BlogSlugLayout({ children }: LayoutProps) {
  return <>{children}</>
}
