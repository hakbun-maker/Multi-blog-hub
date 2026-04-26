/**
 * 스마트 이미지 배치 유틸리티
 *
 * 규칙:
 * - 각 섹션(H2)의 마지막에 1장씩 배치 (다음 H2 직전)
 * - 이미지가 섹션 수보다 많으면 마지막 섹션에 모음
 * - H2가 없으면 본문 끝에 모두 배치
 *
 * 마크업: <figure>/<figcaption>이 Tiptap에서 unwrap되어 캡션 정렬이 깨지므로
 *        block <img> + 클래스 기반 <p>로 캡션 처리 (TextAlign 확장이 보존)
 */

export interface PlacedImage {
  url: string
  alt: string
  caption?: string
}

/** HTML에서 h2 위치를 기준으로 이미지를 배치한 HTML을 반환 */
export function insertImagesIntoHtml(
  html: string,
  images: PlacedImage[]
): string {
  if (!images.length) return html

  // h2 태그의 위치를 찾기
  const h2Regex = /<h2[^>]*>[\s\S]*?<\/h2>/gi
  const h2Matches: { index: number; length: number }[] = []
  let match: RegExpExecArray | null

  while ((match = h2Regex.exec(html)) !== null) {
    h2Matches.push({ index: match.index, length: match[0].length })
  }

  if (h2Matches.length === 0) {
    // h2가 없으면 본문 끝에 모두 배치
    const imgTags = images.map(img => buildImgTag(img)).join('\n')
    return html + '\n' + imgTags
  }

  // 각 섹션의 끝 = 다음 h2의 시작 (마지막 섹션은 html 끝)
  const sectionEnds: number[] = h2Matches.map((_, i) =>
    i + 1 < h2Matches.length ? h2Matches[i + 1].index : html.length
  )

  // 이미지를 각 섹션 끝에 1장씩 배치, 남은 이미지는 마지막 섹션에 모음
  let result = ''
  let cursor = 0
  let imgIdx = 0

  for (let i = 0; i < sectionEnds.length && imgIdx < images.length; i++) {
    const sectionEnd = sectionEnds[i]
    result += html.slice(cursor, sectionEnd)

    const isLastSection = i === sectionEnds.length - 1
    const remaining = images.length - imgIdx
    const count = isLastSection ? remaining : 1

    for (let j = 0; j < count; j++) {
      result += '\n' + buildImgTag(images[imgIdx])
      imgIdx++
    }
    cursor = sectionEnd
  }

  // 남은 HTML
  result += html.slice(cursor)

  return result
}

function buildImgTag(img: PlacedImage): string {
  // <figure>/<figcaption>은 Tiptap StarterKit에서 unwrap되어 캡션이 좌측 정렬됨.
  // → block <img> + class="image-caption" <p>로 마크업 (TextAlign 확장이 style 보존)
  const caption = img.caption
    ? `<p class="image-caption" style="text-align:center;font-size:0.875rem;color:#6b7280;margin:0.25em 0 1.5em 0;"><em>${img.caption}</em></p>`
    : ''
  const imgTag = `<img src="${img.url}" alt="${img.alt}" title="${img.alt}" style="display:block;margin:1.5em auto 0.5em auto;max-width:100%;height:auto;border-radius:8px;" />`
  return imgTag + (caption ? '\n' + caption : '')
}

/** HTML에서 h2 개수를 반환 */
export function countH2Sections(html: string): number {
  const matches = html.match(/<h2[^>]*>/gi)
  return matches?.length ?? 0
}

/** 최대 이미지 수 = h2 개수 (각 섹션 끝에 1장씩) */
export function calcMaxImages(html: string): number {
  return Math.max(1, countH2Sections(html))
}
