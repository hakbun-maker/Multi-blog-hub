import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'
const APP_HOSTS = ['multi-blog-hub.vercel.app', 'localhost']

export default function robots({ params }: { params: { slug: string } }): MetadataRoute.Robots {
  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const rootHost = host.split(':')[0]

  const isCustomDomain =
    !APP_HOSTS.includes(rootHost) &&
    !rootHost.endsWith('.vercel.app') &&
    rootHost !== ''

  const baseUrl = isCustomDomain
    ? `https://${rootHost}`
    : `${APP_URL}/blog/${params.slug}`

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
