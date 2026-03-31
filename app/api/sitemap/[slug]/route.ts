import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: blog } = await supabase
    .from('blogs')
    .select('id, slug, custom_domain, created_at')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!blog) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { 'Content-Type': 'application/xml' } }
    )
  }

  const baseUrl = blog.custom_domain
    ? `https://${blog.custom_domain}`
    : `${APP_URL}/blog/${params.slug}`

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, published_at')
    .eq('blog_id', blog.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const latestPost = posts?.[0]
  const blogLastModified = latestPost?.published_at
    ? new Date(latestPost.published_at).toISOString()
    : new Date(blog.created_at).toISOString()

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  // 블로그 홈
  xml += `  <url>\n`
  xml += `    <loc>${baseUrl}</loc>\n`
  xml += `    <lastmod>${blogLastModified}</lastmod>\n`
  xml += `    <changefreq>daily</changefreq>\n`
  xml += `    <priority>1.0</priority>\n`
  xml += `  </url>\n`

  // 개별 포스트
  for (const post of posts ?? []) {
    const lastmod = post.published_at
      ? new Date(post.published_at).toISOString()
      : new Date().toISOString()
    xml += `  <url>\n`
    xml += `    <loc>${baseUrl}/${post.slug}</loc>\n`
    xml += `    <lastmod>${lastmod}</lastmod>\n`
    xml += `    <changefreq>weekly</changefreq>\n`
    xml += `    <priority>0.8</priority>\n`
    xml += `  </url>\n`
  }

  xml += `</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
