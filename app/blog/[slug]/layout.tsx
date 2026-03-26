import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

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
    .select('name, description, layout_config')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!blog) return {}

  const tracking = (blog.layout_config as Record<string, unknown>)?.tracking as Record<string, string> | undefined
  const verification: Record<string, string> = {}

  if (tracking?.gsc_code) {
    verification.google = tracking.gsc_code
  }
  if (tracking?.naver_code) {
    verification.other = tracking.naver_code
  }

  const url = `${APP_URL}/blog/${params.slug}`

  return {
    title: blog.name,
    description: blog.description || undefined,
    verification,
    openGraph: {
      type: 'website',
      title: blog.name,
      description: blog.description || undefined,
      url,
      siteName: blog.name,
    },
    twitter: {
      card: 'summary',
      title: blog.name,
      description: blog.description || undefined,
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
