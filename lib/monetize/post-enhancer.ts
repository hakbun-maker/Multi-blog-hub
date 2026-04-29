/**
 * 수익화 글(monetize_meta 보유) 렌더 시점 후처리
 * - S단계 광고 슬롯 자동 삽입
 * - FAQPage / HowTo JSON-LD 자동 생성
 *
 * 모든 함수는 순수 (입력 → 출력), 외부 fetch 없음
 */

export interface MonetizeMetaJson {
  pasonaType?: 'compare' | 'solve' | 'cost'
  adCategory?: string
  factCount?: number
  hasAnswerCapsule?: boolean
  useJsonLd?: boolean
  infoGain?: string
}

/** 수익화 글 여부 */
export function isMonetizePost(meta: unknown): meta is MonetizeMetaJson {
  return !!meta && typeof meta === 'object' && 'pasonaType' in (meta as object)
}

/**
 * S단계 (`<!-- google_ad_section_start -->`) 직후 첫 H2 다음에 광고 슬롯 삽입
 * - adsenseSlotMid이 비어있으면 원본 그대로 반환
 * - 이미 광고가 있으면(`<ins class="adsbygoogle"`) 중복 삽입 안 함
 */
export function injectMidAdSlot(
  html: string,
  adsenseSlotMid: string | null | undefined,
  pubId: string | null | undefined,
): string {
  if (!html) return html
  if (!adsenseSlotMid?.trim()) return html
  if (!pubId?.trim()) return html
  if (html.includes(`data-ad-slot="${adsenseSlotMid}"`)) return html

  // S단계 시작 마커 → 첫 </h2> 직후에 삽입
  const startMarker = '<!-- google_ad_section_start -->'
  const startIdx = html.indexOf(startMarker)
  if (startIdx === -1) return html

  const afterMarker = startIdx + startMarker.length
  const h2CloseIdx = html.indexOf('</h2>', afterMarker)
  if (h2CloseIdx === -1) return html

  const insertPos = h2CloseIdx + '</h2>'.length

  const adHtml = `\n<div class="ad-slot-mid" style="margin:1.5em 0;text-align:center;">
<ins class="adsbygoogle" style="display:block" data-ad-client="${pubId}" data-ad-slot="${adsenseSlotMid}" data-ad-format="auto" data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>\n`

  return html.slice(0, insertPos) + adHtml + html.slice(insertPos)
}

/**
 * HTML에서 FAQ 섹션을 파싱해 FAQPage JSON-LD 생성
 * - "## 자주 묻는 질문" / "FAQ" / "자주 묻는" 류 H2를 찾고
 * - 그 아래 H3 또는 strong을 question, 다음 텍스트를 answer로 추출
 * - FAQ 2개 미만이면 null 반환
 */
export function buildFaqPageJsonLd(html: string): object | null {
  if (!html) return null

  // FAQ 시작 H2 찾기
  const faqHeadingRe = /<h2[^>]*>([^<]*?(?:자주\s*묻는|FAQ|자주묻는|Q&A|질문)[^<]*?)<\/h2>/i
  const m = html.match(faqHeadingRe)
  if (!m || m.index === undefined) return null

  // FAQ 섹션 = FAQ H2부터 다음 H2 직전까지
  const faqStart = m.index + m[0].length
  const nextH2 = html.slice(faqStart).match(/<h2[^>]*>/)
  const faqEnd = nextH2 && nextH2.index !== undefined ? faqStart + nextH2.index : html.length
  const faqSection = html.slice(faqStart, faqEnd)

  // 패턴 1: <h3>질문</h3><p>답변</p>
  // 패턴 2: <p><strong>Q. 질문</strong></p><p>답변</p>
  const faqs: { question: string; answer: string }[] = []

  // 패턴 1
  const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/gi
  let h3Match: RegExpExecArray | null
  while ((h3Match = h3Re.exec(faqSection)) !== null) {
    const q = h3Match[1].replace(/<[^>]+>/g, '').trim()
    const a = h3Match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (q && a) faqs.push({ question: q, answer: a })
  }

  // 패턴 2 (h3 없을 때만)
  if (faqs.length === 0) {
    const strongRe = /<strong[^>]*>\s*(?:Q\.?\s*)?([\s\S]*?)<\/strong>([\s\S]*?)(?=<p>\s*<strong|$)/gi
    let sMatch: RegExpExecArray | null
    while ((sMatch = strongRe.exec(faqSection)) !== null) {
      const q = sMatch[1].replace(/<[^>]+>/g, '').trim()
      const a = sMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (q && a) faqs.push({ question: q, answer: a })
    }
  }

  if (faqs.length < 2) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

/** monetize 글이면서 useJsonLd가 false가 아닐 때만 JSON-LD 빌드 */
export function shouldRenderJsonLd(meta: MonetizeMetaJson | null | undefined): boolean {
  if (!meta) return false
  return meta.useJsonLd !== false
}
