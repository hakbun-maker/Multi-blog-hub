import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, Calendar, Eye, Tag } from 'lucide-react'
import type { LayoutConfig } from '@/components/blogs/LayoutTab'
import { DEFAULT_LAYOUT_CONFIG } from '@/components/blogs/LayoutTab'
import BlogTrackingScripts from '@/components/blog-public/TrackingScripts'
import AdSlotServer from '@/components/blog-public/AdSlotServer'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

// ─── 타입 ───

interface Blog {
  id: string
  name: string
  slug: string
  color?: string
  layout_config?: Partial<LayoutConfig> | null
}

interface Post {
  id: string
  title: string
  slug: string
  content_html: string
  keyword?: string
  seo_title?: string
  meta_description?: string
  published_at: string
  view_count: number | null
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  published_at: string
  view_count: number | null
}

// ─── 유틸 ───

function mergeConfig(saved: Partial<LayoutConfig> | null | undefined): LayoutConfig {
  if (!saved) return { ...DEFAULT_LAYOUT_CONFIG }
  return {
    header: { ...DEFAULT_LAYOUT_CONFIG.header, ...saved.header },
    layout: { ...DEFAULT_LAYOUT_CONFIG.layout, ...saved.layout },
    ads: { ...DEFAULT_LAYOUT_CONFIG.ads, ...saved.ads },
    footer: { ...DEFAULT_LAYOUT_CONFIG.footer, ...saved.footer },
    tracking: { ...DEFAULT_LAYOUT_CONFIG.tracking, ...saved.tracking },
    related_posts: { ...DEFAULT_LAYOUT_CONFIG.related_posts, ...saved.related_posts },
  }
}

function getFontLink(font: string): string | null {
  switch (font) {
    case 'Pretendard':
      return 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css'
    case 'Noto Sans KR':
      return 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap'
    case 'NanumGothic':
      return 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap'
    default:
      return null
  }
}

function extractFirstImage(html?: string): string | null {
  if (!html) return null
  const match = html.match(/<img[^>]+src="([^"]+)"/)
  return match?.[1] ?? null
}

function stripHtml(html?: string): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

function injectInArticleAd(html: string, adCode: string): string {
  const marker = '</p>'
  const idx = html.indexOf(marker)
  if (idx === -1) return html
  const insertPos = idx + marker.length
  return html.slice(0, insertPos) + `<div class="my-6">${adCode}</div>` + html.slice(insertPos)
}

const HEADER_HEIGHT: Record<string, string> = {
  compact: 'py-2',
  normal: 'py-3',
  tall: 'py-5',
}

const SNS_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  blog: 'Blog',
}

// ─── 데이터 패치 (서버) ───

async function fetchPostData(slug: string, postSlug: string) {
  noStore()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }

  // 블로그 조회
  const blogRes = await fetch(
    `${supabaseUrl}/rest/v1/blogs?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=*&limit=1`,
    { headers, cache: 'no-store' },
  )
  const blogs = await blogRes.json()
  const blog = blogs?.[0]
  if (!blog) return null

  // 포스트 조회
  const postRes = await fetch(
    `${supabaseUrl}/rest/v1/posts?blog_id=eq.${blog.id}&slug=eq.${encodeURIComponent(postSlug)}&status=eq.published&select=id,title,slug,content_html,keyword,seo_title,meta_description,published_at,view_count&limit=1`,
    { headers, cache: 'no-store' },
  )
  const posts = await postRes.json()
  const post = posts?.[0]
  if (!post) return null

  const cfg = mergeConfig((blog as Blog).layout_config)
  let relatedPosts: RelatedPost[] = []

  if (cfg.related_posts.enabled) {
    const orderCol = cfg.related_posts.type === 'popular' ? 'view_count' : 'published_at'
    const relatedRes = await fetch(
      `${supabaseUrl}/rest/v1/posts?blog_id=eq.${blog.id}&status=eq.published&id=neq.${post.id}&select=id,title,slug,published_at,view_count&order=${orderCol}.desc&limit=${cfg.related_posts.count}`,
      { headers, cache: 'no-store' },
    )
    relatedPosts = (await relatedRes.json()) as RelatedPost[]
  }

  return { blog: blog as Blog, post: post as Post, relatedPosts }
}

// ─── 메인 페이지 (서버 컴포넌트) ───

export default async function PublicPostPage({ params }: { params: { slug: string; postSlug: string } }) {
  const decodedPostSlug = decodeURIComponent(params.postSlug)
  const data = await fetchPostData(params.slug, decodedPostSlug)
  if (!data) notFound()

  const { blog, post, relatedPosts } = data
  const cfg = mergeConfig(blog.layout_config)
  const color = blog.color ?? '#3b82f6'
  const fontLink = getFontLink(cfg.layout.font)
  const date = new Date(post.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const tags = post.keyword ? post.keyword.split(',').map(t => t.trim()).filter(Boolean) : []

  let contentHtml = post.content_html || ''
  if (cfg.ads.in_article.enabled && cfg.ads.in_article.code) {
    contentHtml = injectInArticleAd(contentHtml, cfg.ads.in_article.code)
  }

  const hasSidebar = cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'left_sidebar' || cfg.layout.preset === 'both_sidebar'
  const relatedPostsCfg = cfg.related_posts
  const postUrl = `${APP_URL}/blog/${blog.slug}/${decodedPostSlug}`
  const thumbnail = extractFirstImage(post.content_html)
  const description = post.meta_description || stripHtml(post.content_html).slice(0, 160)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.seo_title || post.title,
    description,
    url: postUrl,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: blog.name },
    publisher: { '@type': 'Organization', name: blog.name },
    ...(thumbnail ? { image: thumbnail } : {}),
    ...(tags.length > 0 ? { keywords: tags.join(', ') } : {}),
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cfg.layout.bg_color, fontFamily: `"${cfg.layout.font}", sans-serif`, maxWidth: '100vw', overflowX: 'hidden' }}>

      {/* JSON-LD 구조화 데이터 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 폰트 로드 */}
      {fontLink && <link rel="stylesheet" href={fontLink} />}

      {/* 트래킹 스크립트 (클라이언트) */}
      <BlogTrackingScripts tracking={cfg.tracking} adsensePubId={cfg.ads.adsense_pub_id} />

      {/* 공지 바 */}
      {cfg.header.notice_bar.enabled && cfg.header.notice_bar.text && (
        <div className="text-center text-sm py-2 px-4" style={{ backgroundColor: cfg.header.notice_bar.bg_color }}>
          {cfg.header.notice_bar.text}
        </div>
      )}

      {/* 헤더 */}
      <header
        className={`border-b border-gray-100 ${cfg.header.sticky ? 'sticky top-0 z-10 backdrop-blur' : ''}`}
        style={{ backgroundColor: cfg.header.bg_color, color: cfg.header.text_color }}
      >
        <div className={`mx-auto px-4 ${HEADER_HEIGHT[cfg.header.height] ?? 'py-3'} flex items-center gap-3`} style={{ maxWidth: cfg.layout.max_width }}>
          <Link href={`/blog/${blog.slug}`} className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.header.text_color }}>
            <ArrowLeft className="w-4 h-4" />
            {cfg.header.logo_type === 'image' && cfg.header.logo_image_url ? (
              <img src={cfg.header.logo_image_url} alt={blog.name} className="h-7 w-7 object-contain rounded" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            )}
            <span className="font-medium">{blog.name}</span>
          </Link>

          {cfg.header.nav_items.length > 0 && (
            <nav className="flex gap-4 ml-auto">
              {cfg.header.nav_items.map((item, idx) => (
                <a key={idx} href={item.url} className="text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.header.text_color }}>
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* 상단 광고 */}
      {cfg.ads.top_banner.enabled && cfg.ads.top_banner.code && (
        <div className="relative w-full bg-gray-50 py-2 overflow-hidden">
          <AdSlotServer code={cfg.ads.top_banner.code} className="w-full text-center" />
        </div>
      )}

      {/* 본문 영역 */}
      <div className={`flex-1 w-full overflow-hidden mx-auto px-4 ${hasSidebar ? 'lg:flex lg:gap-8' : ''}`} style={{ maxWidth: cfg.layout.max_width }}>

        {(cfg.layout.preset === 'left_sidebar' || cfg.layout.preset === 'both_sidebar') && (
          <aside className="hidden lg:block w-64 flex-shrink-0 py-10">
            <div className="sticky top-4 space-y-4">
              {cfg.ads.left_sidebar_ad.enabled && cfg.ads.left_sidebar_ad.code && (
                <AdSlotServer code={cfg.ads.left_sidebar_ad.code} />
              )}
            </div>
          </aside>
        )}

        <article className="flex-1 min-w-0 py-10" style={{ fontSize: `${cfg.layout.font_size}px`, lineHeight: cfg.layout.line_height }}>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            {post.seo_title || post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{date}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />{(post.view_count ?? 0).toLocaleString()}회
            </span>
          </div>

          {cfg.ads.below_title.enabled && cfg.ads.below_title.code && (
            <div className="hidden lg:block mb-6">
              <AdSlotServer code={cfg.ads.below_title.code} />
            </div>
          )}

          <div
            className="prose prose-gray max-w-none overflow-hidden [&_img]:max-w-full [&_iframe]:max-w-full [&_ins]:max-w-full"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-gray-100 flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              {tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {(cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'both_sidebar') && (
          <aside className="hidden lg:block w-64 flex-shrink-0 py-10">
            <div className="sticky top-4 space-y-4">
              {cfg.ads.right_sidebar_ad.enabled && cfg.ads.right_sidebar_ad.code && (
                <AdSlotServer code={cfg.ads.right_sidebar_ad.code} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 하단 광고 */}
      {cfg.ads.footer_ad.enabled && cfg.ads.footer_ad.code && (
        <div className="hidden lg:block w-full bg-gray-50 py-2">
          <AdSlotServer code={cfg.ads.footer_ad.code} className="w-full text-center" />
        </div>
      )}

      {/* 관련글 */}
      {relatedPosts.length > 0 && (
        <div className="mx-auto w-full px-4 py-8 border-t border-gray-100" style={{ maxWidth: cfg.layout.max_width }}>
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            {relatedPostsCfg.section_title || (relatedPostsCfg.type === 'recent' ? '최근 글' : '추천 글')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedPosts.map(p => (
              <Link key={p.id} href={`/blog/${blog.slug}/${p.slug}`}
                className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-4">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{p.title}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{new Date(p.published_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                  <span>{(p.view_count ?? 0).toLocaleString()}회</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer style={{ backgroundColor: cfg.footer.bg_color, color: cfg.footer.text_color }}>
        <div className="mx-auto px-4 py-6 lg:py-10" style={{ maxWidth: cfg.layout.max_width }}>
          {cfg.footer.column_data.length > 0 && (
            <div className={`grid gap-x-6 gap-y-4 mb-6 ${cfg.footer.columns === 1 ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-' + cfg.footer.columns}`}>
              {cfg.footer.column_data.map((col, idx) => (
                <div key={idx}>
                  {col.title && <h4 className="font-semibold mb-2 text-sm" style={{ color: cfg.footer.text_color }}>{col.title}</h4>}
                  <ul className="space-y-1">
                    {col.items.map((link, linkIdx) => (
                      <li key={linkIdx}>
                        <a href={link.url} className="text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.footer.text_color }}>{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {cfg.footer.sns.length > 0 && (
            <div className="flex gap-4 mb-4">
              {cfg.footer.sns.map((item, idx) => (
                <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.footer.text_color }}>
                  {SNS_LABELS[item.type] ?? item.type}
                </a>
              ))}
            </div>
          )}

          {cfg.footer.copyright ? (
            <p className="text-xs opacity-60">{cfg.footer.copyright}</p>
          ) : (
            <p className="text-xs opacity-60 text-center">
              <Link href={`/blog/${blog.slug}`} className="hover:opacity-80">
                &larr; {blog.name} 블로그로 돌아가기
              </Link>
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
