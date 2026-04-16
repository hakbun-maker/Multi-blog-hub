import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'
const APP_HOSTS = ['multi-blog-hub.vercel.app', 'localhost']

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const rootHost = host.split(':')[0]

  const isCustomDomain =
    !APP_HOSTS.includes(rootHost) &&
    !rootHost.endsWith('.vercel.app') &&
    rootHost !== ''

  // 커스텀 도메인이면 해당 도메인 기준 sitemap만
  if (isCustomDomain) {
    return {
      rules: [{ userAgent: '*', allow: '/' }],
      sitemap: `https://${rootHost}/sitemap.xml`,
    }
  }

  // 메인 도메인: 메인 sitemap + 각 블로그별 sitemap 모두 참조
  const sitemaps: string[] = [`${APP_URL}/sitemap.xml`]

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: blogs } = await supabase
      .from('blogs')
      .select('slug')
      .eq('is_active', true)
      .is('custom_domain', null)

    if (blogs) {
      for (const blog of blogs) {
        sitemaps.push(`${APP_URL}/blog/${blog.slug}/sitemap.xml`)
      }
    }
  } catch {
    // DB 실패해도 메인 sitemap은 유지
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/editor/', '/settings/', '/api/', '/login', '/signup'],
      },
    ],
    sitemap: sitemaps,
  }
}
