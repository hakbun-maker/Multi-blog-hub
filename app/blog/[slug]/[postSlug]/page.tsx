import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import type { LayoutConfig } from '@/components/blogs/LayoutTab'
import { DEFAULT_LAYOUT_CONFIG } from '@/components/blogs/LayoutTab'
import BlogTrackingScripts from '@/components/blog-public/TrackingScripts'
import AdSlotServer from '@/components/blog-public/AdSlotServer'
import ViewTracker from '@/components/blog-public/ViewTracker'
import { injectMidAdSlot, buildFaqPageJsonLd, isMonetizePost, shouldRenderJsonLd, type MonetizeMetaJson } from '@/lib/monetize/post-enhancer'

// ISR: 1시간마다 백그라운드 갱신 (크롤러/방문자에게 캐시된 빠른 응답 제공)
export const revalidate = 3600

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://multi-blog-hub.vercel.app'

// ─── 타입 ───

interface Blog {
  id: string
  name: string
  slug: string
  color?: string
  blog_type?: string | null
  custom_domain?: string | null
  adsense_slot_mid?: string | null
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
  monetize_meta?: Record<string, unknown> | null
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  published_at: string
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: blog } = await supabase
    .from('blogs')
    .select('id, name, slug, color, blog_type, custom_domain, adsense_slot_mid, layout_config')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!blog) return null

  const { data: post } = await supabase
    .from('posts')
    .select('id, title, slug, content_html, keyword, seo_title, meta_description, published_at, monetize_meta')
    .eq('blog_id', blog.id)
    .eq('slug', postSlug)
    .eq('status', 'published')
    .single()

  if (!post) return null

  const cfg = mergeConfig((blog as Blog).layout_config)
  let relatedPosts: RelatedPost[] = []

  if (cfg.related_posts.enabled) {
    const { data: related } = await supabase
      .from('posts')
      .select('id, title, slug, published_at')
      .eq('blog_id', blog.id)
      .eq('status', 'published')
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(cfg.related_posts.count)
    relatedPosts = (related ?? []) as RelatedPost[]
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
  const fontInfo = getFontLink(cfg.layout.font)
  const date = new Date(post.published_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const tags = post.keyword ? post.keyword.split(',').map(t => t.trim()).filter(Boolean) : []
  const customDomain = (blog as Blog & { custom_domain?: string | null }).custom_domain

  let contentHtml = post.content_html || ''
  // 본문 이미지에 lazy loading 추가
  contentHtml = contentHtml.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"')
  if (cfg.ads.in_article.enabled && cfg.ads.in_article.code) {
    contentHtml = injectInArticleAd(contentHtml, cfg.ads.in_article.code)
  }

  const hasSidebar = cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'left_sidebar' || cfg.layout.preset === 'both_sidebar'
  const relatedPostsCfg = cfg.related_posts
  // canonical과 일치시키기 위해 인코딩 + 커스텀 도메인 우선
  const encodedPostSlug = encodeURIComponent(decodedPostSlug)
  const encodedBlogSlug = encodeURIComponent(blog.slug)
  const postUrl = customDomain
    ? `https://${customDomain}/${encodedPostSlug}`
    : `${APP_URL}/blog/${encodedBlogSlug}/${encodedPostSlug}`
  // 관련글 링크 base — 커스텀 도메인이면 루트 기준, 아니면 /blog/{slug}/
  const relatedLinkBase = customDomain
    ? '/'
    : `/blog/${encodedBlogSlug}/`

  // 본문 중간 — 첫 H2 직후에 관련글 인라인 박스 삽입 (PageRank 전파 + 체류시간 향상)
  if (relatedPosts.length >= 2) {
    const firstH2EndMatch = contentHtml.match(/<h2[^>]*>[\s\S]*?<\/h2>/i)
    if (firstH2EndMatch) {
      const insertAt = (firstH2EndMatch.index ?? 0) + firstH2EndMatch[0].length
      // 첫 H2 직후 관련글 2개 인라인 — 색인 도움
      const inlineRelated = relatedPosts.slice(0, 2).map(p => {
        const link = `${relatedLinkBase}${encodeURIComponent(p.slug)}`
        const escapedTitle = p.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `<li style="margin-bottom:6px;"><a href="${link}" style="color:#2563eb;text-decoration:none;">📌 ${escapedTitle}</a></li>`
      }).join('')
      const inlineBox = `<aside style="background:#f8fafc;border-left:3px solid #3b82f6;padding:12px 16px;margin:20px 0;border-radius:4px;"><p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 8px 0;">함께 읽으면 좋은 글</p><ul style="margin:0;padding-left:18px;font-size:14px;">${inlineRelated}</ul></aside>`
      contentHtml = contentHtml.slice(0, insertAt) + inlineBox + contentHtml.slice(insertAt)
    }
  }

  // 수익화 글 후처리: S단계 직후 광고 슬롯 + FAQPage JSON-LD
  const monetizeMeta = isMonetizePost(post.monetize_meta) ? (post.monetize_meta as MonetizeMetaJson) : null
  let monetizeFaqJsonLd: object | null = null
  if (monetizeMeta) {
    // 광고 슬롯 자동 삽입 (S단계 직후 첫 H2 뒤)
    const adsenseSlotMid = (blog as Blog & { adsense_slot_mid?: string | null }).adsense_slot_mid ?? null
    const pubId = cfg.ads.adsense_pub_id ?? null
    contentHtml = injectMidAdSlot(contentHtml, adsenseSlotMid, pubId)

    // FAQPage JSON-LD (useJsonLd 토글 ON일 때만)
    if (shouldRenderJsonLd(monetizeMeta)) {
      monetizeFaqJsonLd = buildFaqPageJsonLd(contentHtml)
    }
  }
  const thumbnail = extractFirstImage(post.content_html)
  const description = post.meta_description || stripHtml(post.content_html).slice(0, 160)

  const BLOG_TYPE_SECTION: Record<string, string> = {
    legal: 'Legal', finance: 'Finance', medical: 'Health & Medical', 'it-tech': 'Technology',
    education: 'Education', 'beauty-fashion': 'Beauty & Fashion', food: 'Food & Cooking',
    travel: 'Travel', parenting: 'Parenting', lifestyle: 'Lifestyle', 'real-estate': 'Real Estate',
    business: 'Business', entertainment: 'Entertainment', sports: 'Sports', pets: 'Pets',
    automotive: 'Automotive', interior: 'Interior Design', news: 'News', science: 'Science',
  }

  const articleSection = blog.blog_type ? BLOG_TYPE_SECTION[blog.blog_type] : undefined

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
    ...(articleSection ? { articleSection } : {}),
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cfg.layout.bg_color, fontFamily: `"${cfg.layout.font}", sans-serif`, maxWidth: '100vw', overflowX: 'hidden' }}>

      {/* JSON-LD 구조화 데이터 (BlogPosting) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* JSON-LD FAQPage (수익화 글 + useJsonLd ON일 때만) */}
      {monetizeFaqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(monetizeFaqJsonLd) }} />
      )}

      {/* 폰트 로드 (preconnect + preload로 렌더 블로킹 방지) */}
      {fontInfo?.preconnect && <link rel="preconnect" href={fontInfo.preconnect} crossOrigin="anonymous" />}
      {fontInfo && <link rel="preload" as="style" href={fontInfo.href} />}
      {fontInfo && <link rel="stylesheet" href={fontInfo.href} />}

      {/* 트래킹 스크립트 (클라이언트) */}
      <BlogTrackingScripts tracking={cfg.tracking} adsensePubId={cfg.ads.adsense_pub_id} />

      {/* 자체 조회수 트래커 (ISR 캐시 우회 — 클라이언트에서 핑) */}
      <ViewTracker postId={post.id} />

      {/* 공지 바 */}
      {cfg.header.notice_bar.enabled && cfg.header.notice_bar.text && (
        <div className="text-center text-sm py-2 px-4" style={{ backgroundColor: cfg.header.notice_bar.bg_color }}>
          {cfg.header.notice_bar.text}
        </div>
      )}

      {/* 헤더 — AdSense 문맥 분석 제외 */}
      {/* google_ad_section_start(weight=ignore) */}
      <header
        className={`border-b border-gray-100 ${cfg.header.sticky ? 'sticky top-0 z-10 backdrop-blur' : ''}`}
        style={{ backgroundColor: cfg.header.bg_color, color: cfg.header.text_color }}
      >
        <div className={`mx-auto px-4 ${HEADER_HEIGHT[cfg.header.height] ?? 'py-3'} flex items-center gap-3`} style={{ maxWidth: cfg.layout.max_width }}>
          <Link href={customDomain ? '/' : `/blog/${encodedBlogSlug}`} className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.header.text_color }}>
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
      {/* google_ad_section_end */}

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
          </div>

          {cfg.ads.below_title.enabled && cfg.ads.below_title.code && (
            <div className="hidden lg:block mb-6">
              <AdSlotServer code={cfg.ads.below_title.code} />
            </div>
          )}

          {/* Google AdSense Section Targeting: 본문 콘텐츠 영역 강조 */}
          <div
            className="prose prose-gray max-w-none overflow-hidden [&_img]:max-w-full [&_iframe]:max-w-full [&_ins]:max-w-full"
            dangerouslySetInnerHTML={{ __html: `<!-- google_ad_section_start -->${contentHtml}<!-- google_ad_section_end -->` }}
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
              <Link key={p.id} href={`${relatedLinkBase}${encodeURIComponent(p.slug)}`}
                className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all p-4">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{p.title}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{new Date(p.published_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 푸터 — AdSense 문맥 분석 제외 */}
      {/* google_ad_section_start(weight=ignore) */}
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
      {/* google_ad_section_end */}
    </div>
  )
}
