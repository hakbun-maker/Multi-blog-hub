import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'
const APP_HOSTS = ['multi-blog-hub.vercel.app', 'localhost']

export default function robots(): MetadataRoute.Robots {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const rootHost = host.split(':')[0]

  const isCustomDomain =
    !APP_HOSTS.includes(rootHost) &&
    !rootHost.endsWith('.vercel.app') &&
    rootHost !== ''

  // 커스텀 도메인이면 해당 도메인의 sitemap을 참조
  const sitemapUrl = isCustomDomain
    ? `https://${rootHost}/sitemap.xml`
    : `${APP_URL}/sitemap.xml`

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/editor/', '/settings/', '/api/', '/login', '/signup'],
      },
    ],
    sitemap: sitemapUrl,
  }
}
