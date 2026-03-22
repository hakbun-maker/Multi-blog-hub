'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Eye } from 'lucide-react'
import type { LayoutConfig } from '@/components/blogs/LayoutTab'
import { DEFAULT_LAYOUT_CONFIG } from '@/components/blogs/LayoutTab'

interface Blog {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  layout_config?: Partial<LayoutConfig> | null
}

interface Post {
  id: string
  title: string
  slug: string
  meta_description?: string
  published_at: string
  view_count: number | null
  content_html?: string
}

// ─── 레이아웃 설정 병합 헬퍼 ───

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

// ─── 헤더 높이 매핑 ───

const HEADER_HEIGHT: Record<string, string> = {
  compact: 'py-4',
  normal: 'py-8',
  tall: 'py-12',
}

// ─── 폰트 로딩 URL 매핑 ───

function getFontUrl(font: string): string | null {
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

// ─── SNS 아이콘 (간단한 텍스트 방식) ───

const SNS_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  blog: 'Blog',
}

// ─── 광고 슬롯 렌더러 ───

function AdSlotRenderer({ code, className }: { code: string; className?: string }) {
  if (!code) return null
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: code }} />
  )
}

export default function PublicBlogPage({ params }: { params: { slug: string } }) {
  const [blog, setBlog] = useState<Blog | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/public/blog?slug=${encodeURIComponent(params.slug)}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then(data => {
        if (!data) return
        setBlog(data.blog)
        setPosts(data.posts)
        setLoading(false)
      })
  }, [params.slug])

  // ─── 트래킹 코드 삽입 ───
  useEffect(() => {
    if (!blog?.layout_config?.tracking) return
    const { ga4_id, gsc_code, naver_code, kakao_pixel, custom_head } = blog.layout_config.tracking
    const injected: HTMLElement[] = []

    // GA4
    if (ga4_id) {
      const s1 = document.createElement('script')
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${ga4_id}`
      s1.async = true
      document.head.appendChild(s1)
      injected.push(s1)

      const s2 = document.createElement('script')
      s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4_id}');`
      document.head.appendChild(s2)
      injected.push(s2)
    }

    // Google Search Console
    if (gsc_code) {
      const meta = document.createElement('meta')
      meta.name = 'google-site-verification'
      meta.content = gsc_code
      document.head.appendChild(meta)
      injected.push(meta)
    }

    // 네이버 서치어드바이저
    if (naver_code) {
      const meta = document.createElement('meta')
      meta.name = 'naver-site-verification'
      meta.content = naver_code
      document.head.appendChild(meta)
      injected.push(meta)
    }

    // 카카오 픽셀
    if (kakao_pixel) {
      const s = document.createElement('script')
      s.innerHTML = `!function(e,t){if(!e.kakaoPixel){var n=function(){n.q.push(arguments)};n.q=[],e.kakaoPixel=n;var a=t.createElement("script");a.async=1,a.src="//t1.daumcdn.net/kas/static/kp.js";var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(a,i)}}(window,document);kakaoPixel('${kakao_pixel}');kakaoPixel('${kakao_pixel}').pageView();`
      document.head.appendChild(s)
      injected.push(s)
    }

    // 커스텀 head 코드
    if (custom_head) {
      const div = document.createElement('div')
      div.innerHTML = custom_head
      Array.from(div.children).forEach(child => {
        document.head.appendChild(child)
        injected.push(child as HTMLElement)
      })
    }

    // 클린업
    return () => {
      injected.forEach(el => {
        try { el.parentNode?.removeChild(el) } catch { /* ignore */ }
      })
    }
  }, [blog])

  // ─── 폰트 로딩 ───
  useEffect(() => {
    if (!blog?.layout_config?.layout?.font) return
    const url = getFontUrl(blog.layout_config.layout.font)
    if (!url) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch { /* ignore */ } }
  }, [blog])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    )
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <p>블로그를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const cfg = mergeConfig(blog.layout_config)
  const color = blog.color ?? '#3b82f6'

  // 첫 번째 이미지 추출 (썸네일용)
  function extractFirstImage(html?: string): string | null {
    if (!html) return null
    const match = html.match(/<img[^>]+src="([^"]+)"/)
    return match?.[1] ?? null
  }

  // HTML 태그 제거 (요약용)
  function stripHtml(html?: string): string {
    if (!html) return ''
    return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim()
  }

  // 사이드바 유무
  const hasSidebar = cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'left_sidebar' || cfg.layout.preset === 'both_sidebar'
  const isMagazine = cfg.layout.preset === 'magazine'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cfg.layout.bg_color, fontFamily: `"${cfg.layout.font}", sans-serif`, fontSize: `${cfg.layout.font_size}px`, lineHeight: cfg.layout.line_height }}>

      {/* 공지 바 */}
      {cfg.header.notice_bar.enabled && cfg.header.notice_bar.text && (
        <div className="text-center text-sm py-2 px-4" style={{ backgroundColor: cfg.header.notice_bar.bg_color }}>
          {cfg.header.notice_bar.text}
        </div>
      )}

      {/* 블로그 헤더 */}
      <header
        className={`border-b border-gray-200 ${cfg.header.sticky ? 'sticky top-0 z-10 backdrop-blur' : ''}`}
        style={{ backgroundColor: cfg.header.bg_color, color: cfg.header.text_color }}
      >
        <div className={`mx-auto px-4 ${HEADER_HEIGHT[cfg.header.height] ?? 'py-8'}`} style={{ maxWidth: cfg.layout.max_width }}>
          <div className="flex items-center gap-3 mb-2">
            {cfg.header.logo_type === 'image' && cfg.header.logo_image_url ? (
              <img src={cfg.header.logo_image_url} alt={blog.name} className="h-10 w-10 object-contain rounded-md" />
            ) : (
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            )}
            <h1 className="text-2xl font-bold">{blog.name}</h1>
          </div>
          {blog.description && (
            <p className="opacity-70 ml-7">{blog.description}</p>
          )}
          <p className="text-sm opacity-50 mt-2 ml-7">{posts.length}개의 글</p>

          {/* 네비게이션 메뉴 */}
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

      {/* 상단 광고 배너 */}
      {cfg.ads.top_banner.enabled && cfg.ads.top_banner.code && (
        <div className="mx-auto w-full px-4 py-2" style={{ maxWidth: cfg.layout.max_width }}>
          <AdSlotRenderer code={cfg.ads.top_banner.code} />
        </div>
      )}

      {/* 글 목록 */}
      <main className="flex-1">
        <div
          className={`mx-auto px-4 py-8 ${hasSidebar ? 'flex gap-8' : ''}`}
          style={{ maxWidth: cfg.layout.max_width }}
        >
          {/* 좌측 사이드바 */}
          {(cfg.layout.preset === 'left_sidebar' || cfg.layout.preset === 'both_sidebar') && (
            <aside className="w-64 flex-shrink-0 space-y-4">
              {cfg.ads.left_sidebar_ad.enabled && cfg.ads.left_sidebar_ad.code && (
                <AdSlotRenderer code={cfg.ads.left_sidebar_ad.code} />
              )}
            </aside>
          )}

          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {posts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                아직 발행된 글이 없습니다.
              </div>
            ) : isMagazine ? (
              /* 매거진 그리드 레이아웃 */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {posts.map(post => {
                  const thumbnail = extractFirstImage(post.content_html)
                  const excerpt = post.meta_description || stripHtml(post.content_html).slice(0, 100)
                  const date = new Date(post.published_at).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })
                  return (
                    <Link key={post.id} href={`/blog/${blog.slug}/${post.slug}`}
                      className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                      {thumbnail && (
                        <div className="w-full h-40">
                          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <h2 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">{post.title}</h2>
                        {excerpt && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{excerpt}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(post.view_count ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              /* 기본 리스트 레이아웃 */
              <div className="space-y-6">
                {posts.map(post => {
                  const thumbnail = extractFirstImage(post.content_html)
                  const excerpt = post.meta_description || stripHtml(post.content_html).slice(0, 150)
                  const date = new Date(post.published_at).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })
                  return (
                    <Link key={post.id} href={`/blog/${blog.slug}/${post.slug}`}
                      className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                      <div className="flex">
                        <div className="flex-1 p-5">
                          <h2 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h2>
                          {excerpt && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{excerpt}</p>}
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(post.view_count ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                        {thumbnail && (
                          <div className="w-40 flex-shrink-0">
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* 우측 사이드바 */}
          {(cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'both_sidebar') && (
            <aside className="w-64 flex-shrink-0 space-y-4">
              {cfg.ads.right_sidebar_ad.enabled && cfg.ads.right_sidebar_ad.code && (
                <AdSlotRenderer code={cfg.ads.right_sidebar_ad.code} />
              )}
            </aside>
          )}
        </div>
      </main>

      {/* 하단 광고 */}
      {cfg.ads.footer_ad.enabled && cfg.ads.footer_ad.code && (
        <div className="mx-auto w-full px-4 py-2" style={{ maxWidth: cfg.layout.max_width }}>
          <AdSlotRenderer code={cfg.ads.footer_ad.code} />
        </div>
      )}

      {/* 푸터 */}
      <footer style={{ backgroundColor: cfg.footer.bg_color, color: cfg.footer.text_color }}>
        <div className="mx-auto px-4 py-10" style={{ maxWidth: cfg.layout.max_width }}>
          {/* 푸터 컬럼 */}
          {cfg.footer.column_data.length > 0 && (
            <div className={`grid gap-8 mb-8 ${cfg.footer.columns === 1 ? 'grid-cols-1' : cfg.footer.columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {cfg.footer.column_data.map((col, idx) => (
                <div key={idx}>
                  {col.title && <h4 className="font-semibold mb-3 text-sm" style={{ color: cfg.footer.text_color }}>{col.title}</h4>}
                  <ul className="space-y-1.5">
                    {col.items.map((link, linkIdx) => (
                      <li key={linkIdx}>
                        <a href={link.url} className="text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.footer.text_color }}>
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* SNS 링크 */}
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

          {/* 저작권 */}
          {cfg.footer.copyright ? (
            <p className="text-xs opacity-60">{cfg.footer.copyright}</p>
          ) : (
            <p className="text-xs opacity-60 text-center">
              <Link href={`/blog/${blog.slug}`} className="hover:opacity-80">{blog.name}</Link>
            </p>
          )}
        </div>
      </footer>

      {/* 커스텀 body 코드 */}
      {cfg.tracking.custom_body && (
        <div dangerouslySetInnerHTML={{ __html: cfg.tracking.custom_body }} />
      )}
    </div>
  )
}
