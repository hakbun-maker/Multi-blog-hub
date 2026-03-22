import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface LayoutProps {
  children: React.ReactNode
  params: { slug: string }
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const supabase = createClient()
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

  return {
    title: blog.name,
    description: blog.description || undefined,
    verification,
    other: {
      ...(tracking?.naver_code ? { 'naver-site-verification': tracking.naver_code } : {}),
    },
  }
}

export default function BlogSlugLayout({ children }: LayoutProps) {
  return <>{children}</>
}
