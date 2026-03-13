/**
 * 스마트 이미지 배치 유틸리티
 *
 * 규칙:
 * - 이미지 1개: 목차(첫 번째 h2) 바로 아래
 * - 이미지 2개+: 각 소제목(h2) 문단의 마지막에 순차 배치
 * - 최대 이미지 수 = 1(목차 아래) + h2 개수
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
    // h2가 없으면 맨 끝에 이미지 모두 삽입
    const imgTags = images.map(img => buildImgTag(img)).join('\n')
    return html + '\n' + imgTags
  }

  if (images.length === 1) {
    // 1개: 첫 h2 바로 아래
    const firstH2End = h2Matches[0].index + h2Matches[0].length
    const imgTag = buildImgTag(images[0])
    return html.slice(0, firstH2End) + '\n' + imgTag + html.slice(firstH2End)
  }

  // 2개+: 각 h2 섹션의 끝 부분에 순차 배치
  // 각 섹션의 끝 = 다음 h2의 시작 (또는 HTML 끝)
  const sectionEnds: number[] = []
  for (let i = 0; i < h2Matches.length; i++) {
    if (i + 1 < h2Matches.length) {
      sectionEnds.push(h2Matches[i + 1].index)
    } else {
      sectionEnds.push(html.length)
    }
  }

  // 첫 번째 이미지는 첫 h2 아래 (목차 영역)
  // 나머지는 각 섹션 끝에 순차 배치
  let result = ''
  let cursor = 0
  let imgIdx = 0

  // 첫 번째 이미지: 첫 h2 바로 뒤
  const firstH2End = h2Matches[0].index + h2Matches[0].length
  result += html.slice(cursor, firstH2End)
  if (imgIdx < images.length) {
    result += '\n' + buildImgTag(images[imgIdx])
    imgIdx++
  }
  cursor = firstH2End

  // 나머지 이미지: 각 섹션 끝에 배치
  for (let i = 0; i < sectionEnds.length && imgIdx < images.length; i++) {
    const sectionEnd = sectionEnds[i]
    result += html.slice(cursor, sectionEnd)
    result += '\n' + buildImgTag(images[imgIdx])
    imgIdx++
    cursor = sectionEnd
  }

  // 남은 HTML
  result += html.slice(cursor)

  return result
}

function buildImgTag(img: PlacedImage): string {
  const caption = img.caption
    ? `<figcaption style="text-align:center;font-size:0.875rem;color:#6b7280;margin-top:0.5rem;">${img.caption}</figcaption>`
    : ''
  return `<figure style="margin:1.5em 0;text-align:center;"><img src="${img.url}" alt="${img.alt}" title="${img.alt}" style="max-width:100%;height:auto;border-radius:8px;" />${caption}</figure>`
}

/** HTML에서 h2 개수를 반환 */
export function countH2Sections(html: string): number {
  const matches = html.match(/<h2[^>]*>/gi)
  return matches?.length ?? 0
}

/** 최대 이미지 수 계산: 1(목차) + h2 개수 */
export function calcMaxImages(html: string): number {
  return 1 + countH2Sections(html)
}
