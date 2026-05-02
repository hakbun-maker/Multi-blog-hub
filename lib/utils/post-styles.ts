/**
 * 블로그 본문 HTML에 인라인 스타일을 일괄 주입한다.
 *
 * 외부 플랫폼(Tistory 등)은 외부 CSS·class를 차단하므로 인라인 스타일이 필수.
 * AI가 생성한 글이든 사용자가 에디터에서 만든 글이든 동일한 디자인이 적용되도록
 * 발행 직전 + 공개 페이지 렌더 시점에 idempotent 후처리.
 *
 * 디자인 사양: docs/etc/01. 블루-그레이.txt + SEO 정부정책 블로그 지침.txt
 * 컬러는 lib/utils/post-themes.ts의 PostTheme로부터 받는다.
 */

import { getTheme, type PostTheme, type PostThemeId } from './post-themes'

// ─── 헬퍼 ──────────────────────────────────────────

function pickAlign(styleStr: string | undefined | null): string {
  // 명시적 text-align이 없으면 기본 center (한국 블로그 컨벤션)
  if (!styleStr) return 'center'
  const m = styleStr.match(/text-align\s*:\s*([a-z]+)/i)
  return m ? m[1].toLowerCase() : 'center'
}

function splitStyle(attrs: string): { rest: string; style: string } {
  const m = attrs.match(/\sstyle="([^"]*)"/i)
  if (!m) return { rest: attrs, style: '' }
  return { rest: attrs.replace(m[0], ''), style: m[1] }
}

function resolveTheme(themeOrId?: PostTheme | PostThemeId | string | null): PostTheme {
  if (themeOrId && typeof themeOrId === 'object' && 'thBg' in themeOrId) return themeOrId
  return getTheme(themeOrId as PostThemeId | string | null)
}

// ─── 표 스타일 ──────────────────────────────────────

export function applyTableStyles(html: string, themeOrId?: PostTheme | PostThemeId | string | null): string {
  if (!html || typeof html !== 'string') return html ?? ''
  if (!/<table[\s>]/i.test(html)) return html

  const theme = resolveTheme(themeOrId)

  const TABLE_STYLE = 'width: 100%; border-collapse: collapse; margin: 20px 0;'
  const TH_STYLE_BASE = `padding: 12px; border: 1px solid ${theme.border}; background-color: ${theme.thBg}; font-weight: bold; color: #333;`
  const TD_STYLE_BASE = `padding: 12px; border: 1px solid ${theme.border};`
  const TR_EVEN_STYLE = `background-color: ${theme.evenRow};`

  let result = html.replace(/<table\b([^>]*)>/gi, (_m, attrs) => {
    const { rest } = splitStyle(attrs)
    return `<table${rest} style="${TABLE_STYLE}">`
  })

  result = result.replace(/<th\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    const align = pickAlign(style)
    return `<th${rest} style="${TH_STYLE_BASE} text-align: ${align};">`
  })

  result = result.replace(/<td\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    const align = pickAlign(style)
    return `<td${rest} style="${TD_STYLE_BASE} text-align: ${align};">`
  })

  result = result.replace(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/gi, (match, body: string) => {
    let trIdx = 0
    const newBody = body.replace(/<tr\b([^>]*)>/gi, (_m: string, attrs: string) => {
      trIdx++
      const { rest } = splitStyle(attrs)
      if (trIdx % 2 === 0) return `<tr${rest} style="${TR_EVEN_STYLE}">`
      return `<tr${rest}>`
    })
    return match.replace(body, newBody)
  })

  if (!/<tbody/i.test(result)) {
    result = result.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (match, body: string) => {
      const firstTrMatch = body.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)
      const hasHeaderRow = !!(firstTrMatch && /<th\b/i.test(firstTrMatch[1]))
      let trIdx = 0
      const newBody = body.replace(/<tr\b([^>]*)>/gi, (_m: string, attrs: string) => {
        trIdx++
        const { rest } = splitStyle(attrs)
        if (hasHeaderRow && trIdx === 1) return `<tr${rest}>`
        const dataIdx = hasHeaderRow ? trIdx - 1 : trIdx
        if (dataIdx % 2 === 0) return `<tr${rest} style="${TR_EVEN_STYLE}">`
        return `<tr${rest}>`
      })
      return match.replace(body, newBody)
    })
  }

  return result
}

// ─── 헤딩 스타일 (h2, h3) ─────────────────────────────

function applyHeadingStyles(html: string, theme: PostTheme): string {
  // H2: 큰 글자 + primary color + 두꺼운 하단 보더 + scroll-margin (목차 앵커 대응)
  let result = html.replace(/<h2\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    // 기존 id 등 보존
    const newStyle = `font-size: 24px; font-weight: 700; color: ${theme.primary}; margin: 40px 0 20px; padding-bottom: 10px; border-bottom: 3px solid ${theme.primary}; scroll-margin-top: 80px;${style ? ' ' + style.replace(/font-size[^;]*;?|color[^;]*;?|margin[^;]*;?|padding-bottom[^;]*;?|border-bottom[^;]*;?|scroll-margin-top[^;]*;?|font-weight[^;]*;?/gi, '').trim() : ''}`
    return `<h2${rest} style="${newStyle}">`
  })

  // H3: 중간 글자 + primaryDark
  result = result.replace(/<h3\b([^>]*)>/gi, (_m, attrs) => {
    const { rest } = splitStyle(attrs)
    return `<h3${rest} style="font-size: 18px; font-weight: 700; color: ${theme.primaryDark}; margin: 25px 0 12px;">`
  })

  // H4: 작은 글자 + primaryDark
  result = result.replace(/<h4\b([^>]*)>/gi, (_m, attrs) => {
    const { rest } = splitStyle(attrs)
    return `<h4${rest} style="font-size: 16px; font-weight: 600; color: ${theme.primaryDark}; margin: 20px 0 10px;">`
  })

  return result
}

// ─── 단락 스타일 (p) ────────────────────────────────

function applyParagraphStyles(html: string): string {
  // 기존 인라인 스타일 있으면 보존, 없으면 기본 스타일 적용
  return html.replace(/<p\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    if (style && /margin|padding|background|font-/.test(style)) {
      // 사용자가 의도적으로 스타일을 부여한 경우 → 보존
      return `<p${rest} style="${style}">`
    }
    return `<p${rest} style="margin-bottom: 15px; line-height: 1.7;">`
  })
}

// ─── 리스트 스타일 (ul, ol, li) ────────────────────

function applyListStyles(html: string): string {
  let result = html.replace(/<ul\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    if (style) return `<ul${rest} style="${style}">`
    return `<ul${rest} style="margin: 0 0 15px 20px; padding: 0; line-height: 1.7;">`
  })
  result = result.replace(/<ol\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    if (style) return `<ol${rest} style="${style}">`
    return `<ol${rest} style="margin: 0 0 15px 20px; padding: 0; line-height: 1.7;">`
  })
  result = result.replace(/<li\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    if (style) return `<li${rest} style="${style}">`
    return `<li${rest} style="margin-bottom: 6px;">`
  })
  return result
}

// ─── 인라인 강조 스타일 (strong, em, a, mark) ─────

function applyInlineStyles(html: string, theme: PostTheme): string {
  // strong: 굵게 + primaryDark 색상 살짝
  let result = html.replace(/<strong\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    if (style) return `<strong${rest} style="${style}">`
    return `<strong${rest} style="font-weight: 700; color: ${theme.primaryDark};">`
  })

  // a: 링크 색상
  result = result.replace(/<a\b([^>]*)>/gi, (_m, attrs) => {
    const { rest, style } = splitStyle(attrs)
    const merged = style
      ? `${style}${/color/i.test(style) ? '' : ` color: ${theme.primary};`}`
      : `color: ${theme.primary}; text-decoration: underline;`
    return `<a${rest} style="${merged}">`
  })

  // mark: 형광펜 하이라이트
  result = result.replace(/<mark\b([^>]*)>/gi, (_m, attrs) => {
    const { rest } = splitStyle(attrs)
    return `<mark${rest} style="background-color: ${theme.highlight}; padding: 2px 4px; border-radius: 3px;">`
  })

  return result
}

// ─── 블록 스타일 (blockquote, hr) ───────────────────

function applyBlockStyles(html: string, theme: PostTheme): string {
  // blockquote → 팁/알림 박스로 사용 (배경 + 좌측 보더)
  let result = html.replace(/<blockquote\b([^>]*)>/gi, (_m, attrs) => {
    const { rest } = splitStyle(attrs)
    return `<blockquote${rest} style="background-color: ${theme.tipBg}; border-left: 4px solid ${theme.primary}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; color: #333;">`
  })

  // hr → 점선 구분선
  result = result.replace(/<hr\b([^>]*)\/?>/gi, (_m, attrs) => {
    const { rest } = splitStyle(attrs)
    return `<hr${rest} style="border: none; border-top: 1px dashed ${theme.border}; margin: 30px 0;">`
  })

  return result
}

// ─── 표 캡션 자동 가운데 정렬 ────────────────────────
// 표 직후의 italic으로 시작하는 짧은 단락을 캡션으로 보고 가운데 정렬.
// 사용자가 markdown에서 표 바로 다음에 `*표: ...*` 같은 형태로 적은 경우만 대상.
// 콘텐츠 구조 변경 없이, 해당 <p>의 style만 덮어쓴다.

function centerCaption(html: string): string {
  return html.replace(
    /(<\/table>\s*)(<p\b[^>]*>)(\s*<em\b[^>]*>[\s\S]*?<\/em>\s*)(<\/p>)/gi,
    (_m, tableClose: string, pOpen: string, content: string, pClose: string) => {
      const newP = pOpen.replace(/<p\b([^>]*)>/i, (_m2, attrs: string) => {
        const { rest } = splitStyle(attrs)
        return `<p${rest} style="margin: 8px 0 20px; line-height: 1.6; text-align: center; color: #666; font-size: 14px;">`
      })
      return `${tableClose}${newP}${content}${pClose}`
    },
  )
}

// ─── 메인 진입점 ────────────────────────────────────
// 콘텐츠 구조(포맷)는 건드리지 않고, 이미 존재하는 HTML 요소에 인라인 스타일만 주입한다.
// 새 div/span을 추가하거나 요소를 감싸는 행위는 하지 않는다.

export function applyPostStyles(html: string, themeOrId?: PostTheme | PostThemeId | string | null): string {
  if (!html || typeof html !== 'string') return html ?? ''

  const theme = resolveTheme(themeOrId)

  let result = html
  // 1) 헤딩 (h2/h3/h4)
  result = applyHeadingStyles(result, theme)
  // 2) 단락
  result = applyParagraphStyles(result)
  // 3) 리스트
  result = applyListStyles(result)
  // 4) 인라인 (strong, a, mark)
  result = applyInlineStyles(result, theme)
  // 5) 블록 (blockquote, hr)
  result = applyBlockStyles(result, theme)
  // 6) 표
  result = applyTableStyles(result, theme)
  // 7) 표 캡션 (italic으로 시작하는 직후 단락) 가운데 정렬
  result = centerCaption(result)

  return result
}
