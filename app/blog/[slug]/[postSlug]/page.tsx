'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Eye, Tag } from 'lucide-react'
import type { LayoutConfig } from '@/components/blogs/LayoutTab'
import { DEFAULT_LAYOUT_CONFIG } from '@/components/blogs/LayoutTab'

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

// ─── 레이아웃 설정 병합 ───

function mergeConfig(saved: Partial<LayoutConfig> | null | undefined): LayoutConfig {
  if (!saved) return { ...DEFAULT_LAYOUT_CONFIG }
  return {
    header: { ...DEFAULT_LAYOUT_CONFIG.header, ...saved.header },
    layout: { ...DEFAULT_LAYOUT_CONFIG.layout, ...saved.layout },
    ads: { ...DEFAULT_LAYOUT_CONFIG.ads, ...saved.ads },
    footer: { ...DEFAULT_LAYOUT_CONFIG.footer, ...saved.footer },
    tracking: { ...DEFAULT_LAYOUT_CONFIG.tracking, ...saved.tracking },
  }
}

const HEADER_HEIGHT: Record<string, string> = {
  compact: 'py-2',
  normal: 'py-3',
  tall: 'py-5',
}

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

const SNS_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  blog: 'Blog',
}

function AdSlotRenderer({ code, className }: { code: string; className?: string }) {
  if (!code) return null
  return <div className={className} dangerouslySetInnerHTML={{ __html: code }} />
}

// ─── 본문 중간 광고 삽입 헬퍼 ───
// 첫 번째 </p> 이후에 광고 코드를 삽입
function injectInArticleAd(html: string, adCode: string): string {
  const marker = '</p>'
  const idx = html.indexOf(marker)
  if (idx === -1) return html
  const insertPos = idx + marker.length
  return html.slice(0, insertPos) + `<div class="my-6">${adCode}</div>` + html.slice(insertPos)
}

export default function PublicPostPage({ params }: { params: { slug: string; postSlug: string } }) {
  const [blog, setBlog] = useState<Blog | null>(null)
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const decodedPostSlug = decodeURIComponent(params.postSlug)
    fetch(`/api/public/blog?slug=${encodeURIComponent(params.slug)}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then(data => {
        if (!data) return
        setBlog(data.blog)
        const found = data.posts.find((p: Post) => p.slug === decodedPostSlug)
        if (!found) { setNotFound(true) } else { setPost(found) }
        setLoading(false)
      })
  }, [params.slug, params.postSlug])

  // ─── 트래킹 코드 삽입 ───
  useEffect(() => {
    if (!blog?.layout_config?.tracking) return
    const { ga4_id, gsc_code, naver_code, kakao_pixel, custom_head } = blog.layout_config.tracking
    const injected: HTMLElement[] = []

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

    if (gsc_code) {
      const meta = document.createElement('meta')
      meta.name = 'google-site-verification'
      meta.content = gsc_code
      document.head.appendChild(meta)
      injected.push(meta)
    }

    if (naver_code) {
      const meta = document.createElement('meta')
      meta.name = 'naver-site-verification'
      meta.content = naver_code
      document.head.appendChild(meta)
      injected.push(meta)
    }

    if (kakao_pixel) {
      const s = document.createElement('script')
      s.innerHTML = `!function(e,t){if(!e.kakaoPixel){var n=function(){n.q.push(arguments)};n.q=[],e.kakaoPixel=n;var a=t.createElement("script");a.async=1,a.src="//t1.daumcdn.net/kas/static/kp.js";var i=t.getElementsByTagName("script")[0];i.parentNode.insertBefore(a,i)}}(window,document);kakaoPixel('${kakao_pixel}');kakaoPixel('${kakao_pixel}').pageView();`
      document.head.appendChild(s)
      injected.push(s)
    }

    if (custom_head) {
      const div = document.createElement('div')
      div.innerHTML = custom_head
      Array.from(div.children).forEach(child => {
        document.head.appendChild(child)
        injected.push(child as HTMLElement)
      })
    }

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

  if (notFound || !blog || !post) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <p>글을 찾을 수 없습니다.</p>
        <Link href={`/blog/${params.slug}`} className="mt-4 text-blue-600 hover:underline text-sm">
          블로그로 돌아가기
        </Link>
      </div>
    )
  }

  const cfg = mergeConfig(blog.layout_config)
  const color = blog.color ?? '#3b82f6'
  const date = new Date(post.published_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const tags = post.keyword ? post.keyword.split(',').map(t => t.trim()).filter(Boolean) : []

  // 본문 중간 광고 삽입
  let contentHtml = post.content_html || ''
  if (cfg.ads.in_article.enabled && cfg.ads.in_article.code) {
    contentHtml = injectInArticleAd(contentHtml, cfg.ads.in_article.code)
  }

  const hasSidebar = cfg.layout.preset === 'right_sidebar' || cfg.layout.preset === 'left_sidebar'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cfg.layout.bg_color, fontFamily: `"${cfg.layout.font}", sans-serif` }}>

      {/* 공지 바 */}
      {cfg.header.notice_bar.enabled && cfg.header.notice_bar.text && (
        <div className="text-center text-sm py-2 px-4" style={{ backgroundColor: cfg.header.notice_bar.bg_color }}>
          {cfg.header.notice_bar.text}
        </div>
      )}

      {/* 상단 네비 */}
      <header
        className={`border-b border-gray-100 ${cfg.header.sticky ? 'sticky top-0 z-10 backdrop-blur' : ''}`}
        style={{ backgroundColor: cfg.header.bg_color, color: cfg.header.text_color }}
      >
        <div className={`mx-auto px-4 ${HEADER_HEIGHT[cfg.header.height] ?? 'py-3'} flex items-center gap-3`} style={{ maxWidth: cfg.layout.max_width }}>
          <Link href={`/blog/${blog.slug}`} className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: cfg.header.text_color }}>
            <ArrowLeft className="w-4 h-4" />
            {cfg.header.logo_type === 'image' && cfg.header.logo_image_url ? (
              <img src={cfg.header.logo_image_url} alt={blog.name} className="h-6 object-contain" />
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium">{blog.name}</span>
              </>
            )}
          </Link>

          {/* 네비게이션 메뉴 */}
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

      {/* 상단 광고 배너 */}
      {cfg.ads.top_banner.enabled && cfg.ads.top_banner.code && (
        <div className="mx-auto w-full px-4 py-2" style={{ maxWidth: cfg.layout.max_width }}>
          <AdSlotRenderer code={cfg.ads.top_banner.code} />
        </div>
      )}

      {/* 본문 영역 */}
      <div className={`flex-1 ${hasSidebar ? 'flex gap-8' : ''} mx-auto px-4`} style={{ maxWidth: cfg.layout.max_width }}>
        {/* 좌측 사이드바 */}
        {cfg.layout.preset === 'left_sidebar' && (
          <aside className="w-64 flex-shrink-0 py-10 space-y-4">
            {cfg.ads.left_sidebar_ad.enabled && cfg.ads.left_sidebar_ad.code && (
              <AdSlotRenderer code={cfg.ads.left_sidebar_ad.code} />
            )}
          </aside>
        )}

        {/* 글 본문 */}
        <article className="flex-1 min-w-0 py-10" style={{ fontSize: `${cfg.layout.font_size}px`, lineHeight: cfg.layout.line_height }}>
          {/* 제목 */}
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            {post.seo_title || post.title}
          </h1>

          {/* 메타 정보 */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{date}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />{(post.view_count ?? 0).toLocaleString()}회
            </span>
          </div>

          {/* 제목 아래 광고 */}
          {cfg.ads.below_title.enabled && cfg.ads.below_title.code && (
            <div className="mb-6">
              <AdSlotRenderer code={cfg.ads.below_title.code} />
            </div>
          )}

          {/* 본문 HTML (in_article 광고 포함) */}
          <div
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* 태그 */}
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

        {/* 우측 사이드바 */}
        {cfg.layout.preset === 'right_sidebar' && (
          <aside className="w-64 flex-shrink-0 py-10 space-y-4">
            {cfg.ads.right_sidebar_ad.enabled && cfg.ads.right_sidebar_ad.code && (
              <AdSlotRenderer code={cfg.ads.right_sidebar_ad.code} />
            )}
          </aside>
        )}
      </div>

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

          {/* 저작권 또는 블로그 링크 */}
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

      {/* 커스텀 body 코드 */}
      {cfg.tracking.custom_body && (
        <div dangerouslySetInnerHTML={{ __html: cfg.tracking.custom_body }} />
      )}
    </div>
  )
}
