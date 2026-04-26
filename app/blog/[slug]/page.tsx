import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import type { LayoutConfig } from '@/components/blogs/LayoutTab'
import { DEFAULT_LAYOUT_CONFIG } from '@/components/blogs/LayoutTab'
import BlogTrackingScripts from '@/components/blog-public/TrackingScripts'
import AdSlotServer from '@/components/blog-public/AdSlotServer'

// ISR: 30분마다 백그라운드 갱신 (새 글 반영을 위해 글 페이지보다 짧게)
export const revalidate = 1800

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

// ─── 타입 ───

interface Blog {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  custom_domain?: string | null
  layout_config?: Partial<LayoutConfig> | null
}

interface Post {
  id: string
  title: string
  slug: string
  meta_description?: string
  published_at: string
  content_html?: string
}

interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
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

function extractFirstImage(html?: string): string | null {
  if (!html) return null
  const match = html.match(/<img[^>]+src="([^"]+)"/)
  return match?.[1] ?? null
}

function stripHtml(html?: string): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

const HEADER_HEIGHT: Record<string, string> = {
  compact: 'py-4',
  normal: 'py-8',
  tall: 'py-12',
}

const SNS_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  blog: 'Blog',
}

function getFontLink(font: string): { href: string; preconnect?: string } | null {
  switch (font) {
    case 'Pretendard':
      return { href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css', preconnect: 'https://cdn.jsdelivr.net' }
    case 'Noto Sans KR':
      return { href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap', preconnect: 'https://fonts.googleapis.com' }
    case 'NanumGothic':
      return { href: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap', preconnect: 'https://fonts.googleapis.com' }
    default:
      return null
  }
}

// ─── 데이터 패치 (서버) ───

async function fetchBlogData(slug: string, categorySlug?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // 카테고리용 service role 클라이언트
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 블로그 조회
  const { data: blog } = await supabase
    .from('blogs')
    .select('id, name, slug, description, color, custom_domain, layout_config')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!blog) return null

  // 카테고리 + 포스트 병렬 조회
  const [{ data: catData }, { data: postsData }] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('id, name, slug, sort_order')
      .eq('blog_id', blog.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('posts')
      .select('id, title, slug, meta_description, published_at, content_html')
      .eq('blog_id', blog.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
  ])

  const categories = (catData ?? []) as Category[]
  let posts = (postsData ?? []) as Post[]

  // 카테고리 필터 (이미 로드된 데이터에서 필터링)
  if (categorySlug && categories.length) {
    const found = categories.find((c: Category) => c.slug === categorySlug)
    if (found) {
      // 카테고리 필터가 있으면 별도 쿼리 (이미 로드된 전체 목록 대신)
      const { data: filteredPosts } = await supabase
        .from('posts')
        .select('id, title, slug, meta_description, published_at, content_html')
        .eq('blog_id', blog.id)
        .eq('status', 'published')
        .eq('category_id', found.id)
        .order('published_at', { ascending: false })
      posts = (filteredPosts ?? []) as Post[]
    }
  }

  return { blog: blog as Blog, posts, categories }
}

// ─── 메인 페이지 (서버 컴포넌트) ───

export default async function PublicBlogPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { category?: string }
}) {
  const data = await fetchBlogData(params.slug, searchParams.category)
  if (!data) notFound()

  const { blog, posts, categories } = data
  const cfg = mergeConfig(blog.layout_config)
  const color = blog.color ?? '#3b82f6'
  const activeCategory = searchParams.category ?? ''
  const fontInfo = getFontLink(cfg.layout.font)

  const hasSidebar = cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'left_sidebar' || cfg.layout.preset === 'both_sidebar'
  const isMagazine = cfg.layout.preset === 'magazine'
  const customDomain = blog.custom_domain
  const encodedBlogSlug = encodeURIComponent(blog.slug)
  // canonical과 일치 — 커스텀 도메인 우선
  const blogUrl = customDomain
    ? `https://${customDomain}`
    : `${APP_URL}/blog/${encodedBlogSlug}`
  // 모든 내부 링크 base — 커스텀 도메인이면 루트, 아니면 /blog/{slug}
  const blogHomePath = customDomain ? '/' : `/blog/${encodedBlogSlug}`
  const postLinkBase = customDomain ? '/' : `/blog/${encodedBlogSlug}/`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: blog.name,
    url: blogUrl,
    ...(blog.description ? { description: blog.description } : {}),
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cfg.layout.bg_color, fontFamily: `"${cfg.layout.font}", sans-serif`, fontSize: `${cfg.layout.font_size}px`, lineHeight: cfg.layout.line_height, maxWidth: '100vw', overflowX: 'hidden' }}>

      {/* JSON-LD 구조화 데이터 */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 폰트 로드 (preconnect + preload로 렌더 블로킹 방지) */}
      {fontInfo?.preconnect && <link rel="preconnect" href={fontInfo.preconnect} crossOrigin="anonymous" />}
      {fontInfo && <link rel="preload" as="style" href={fontInfo.href} />}
      {fontInfo && <link rel="stylesheet" href={fontInfo.href} />}

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
        className={`border-b border-gray-200 ${cfg.header.sticky ? 'sticky top-0 z-10 backdrop-blur' : ''}`}
        style={{ backgroundColor: cfg.header.bg_color, color: cfg.header.text_color }}
      >
        <div className={`mx-auto px-4 ${HEADER_HEIGHT[cfg.header.height] ?? 'py-8'}`} style={{ maxWidth: cfg.layout.max_width }}>
          {cfg.header.logo_type === 'image' && cfg.header.logo_image_url ? (
            <img src={cfg.header.logo_image_url} alt={blog.name} className="h-20 w-auto max-w-[260px] object-contain mb-3" />
          ) : (
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
              <h1 className="text-2xl font-bold">{blog.name}</h1>
            </div>
          )}
          {blog.description && (
            <p className={`opacity-70 ${cfg.header.logo_type === 'image' && cfg.header.logo_image_url ? '' : 'ml-7'}`}>{blog.description}</p>
          )}
          <p className={`text-sm opacity-50 mt-2 ${cfg.header.logo_type === 'image' && cfg.header.logo_image_url ? '' : 'ml-7'}`}>{posts.length}개의 글</p>
          {cfg.header.nav_items.length > 0 && (
            <nav className="flex gap-4 mt-4 ml-7">
              {cfg.header.nav_items.map((item, idx) => (
                <a key={idx} href={item.url} className="text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.header.text_color }}>
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* 카테고리 필터 */}
      {categories.length > 0 && (
        <div className="border-b border-gray-100" style={{ backgroundColor: cfg.header.bg_color }}>
          <div className="mx-auto px-4" style={{ maxWidth: cfg.layout.max_width }}>
            <div className="flex gap-1 overflow-x-auto py-2 -mb-px scrollbar-hide">
              <Link
                href={blogHomePath}
                className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                  !activeCategory ? 'font-semibold text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={!activeCategory ? { backgroundColor: color } : undefined}
              >
                전체
              </Link>
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`${blogHomePath}?category=${encodeURIComponent(cat.slug)}`}
                  className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                    activeCategory === cat.slug ? 'font-semibold text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  style={activeCategory === cat.slug ? { backgroundColor: color } : undefined}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 상단 광고 */}
      {cfg.ads.top_banner.enabled && cfg.ads.top_banner.code && (
        <div className="relative w-full bg-gray-50 py-2 overflow-hidden">
          <AdSlotServer code={cfg.ads.top_banner.code} className="w-full text-center" />
        </div>
      )}

      {/* 글 목록 */}
      <main className="flex-1 w-full overflow-hidden">
        <div className={`mx-auto px-4 py-8 ${hasSidebar ? 'lg:flex lg:gap-8' : ''}`} style={{ maxWidth: cfg.layout.max_width }}>

          {(cfg.layout.preset === 'left_sidebar' || cfg.layout.preset === 'both_sidebar') && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-4 space-y-4">
                {cfg.ads.left_sidebar_ad.enabled && cfg.ads.left_sidebar_ad.code && (
                  <AdSlotServer code={cfg.ads.left_sidebar_ad.code} />
                )}
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {posts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">아직 발행된 글이 없습니다.</div>
            ) : isMagazine ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {posts.map(post => {
                  const thumbnail = extractFirstImage(post.content_html)
                  const excerpt = post.meta_description || stripHtml(post.content_html).slice(0, 100)
                  const date = new Date(post.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                  return (
                    <Link key={post.id} href={`${postLinkBase}${encodeURIComponent(post.slug)}`}
                      className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                      {thumbnail && (
                        <div className="w-full h-40">
                          <img src={thumbnail} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="p-4">
                        <h2 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">{post.title}</h2>
                        {excerpt && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{excerpt}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map(post => {
                  const thumbnail = extractFirstImage(post.content_html)
                  const excerpt = post.meta_description || stripHtml(post.content_html).slice(0, 150)
                  const date = new Date(post.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                  return (
                    <Link key={post.id} href={`${postLinkBase}${encodeURIComponent(post.slug)}`}
                      className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                      <div className="flex">
                        <div className="flex-1 p-5">
                          <h2 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h2>
                          {excerpt && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{excerpt}</p>}
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                          </div>
                        </div>
                        {thumbnail && (
                          <div className="w-24 sm:w-40 flex-shrink-0">
                            <img src={thumbnail} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {(cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'both_sidebar') && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-4 space-y-4">
                {cfg.ads.right_sidebar_ad.enabled && cfg.ads.right_sidebar_ad.code && (
                  <AdSlotServer code={cfg.ads.right_sidebar_ad.code} />
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* 하단 광고 */}
      {cfg.ads.footer_ad.enabled && cfg.ads.footer_ad.code && (
        <div className="hidden lg:block w-full bg-gray-50 py-2">
          <AdSlotServer code={cfg.ads.footer_ad.code} className="w-full text-center" />
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
              <Link href={blogHomePath} className="hover:opacity-80">{blog.name}</Link>
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
