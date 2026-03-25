import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/blog/',
        disallow: ['/dashboard/', '/editor/', '/settings/', '/api/', '/login', '/signup'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
