/**
 * Google Search Console — URL Inspection API 래퍼.
 * https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
 *
 * 일일 한도: 2000건/속성 (수동 GSC UI의 10건 한도와 무관)
 * 스코프 필요: webmasters (= google_indexing OAuth 토큰 사용)
 *
 * 응답의 verdict:
 *   PASS    — 색인됨, 검색 결과에 노출 가능
 *   PARTIAL — 일부만 색인됨 (모바일·desktop 차이 등)
 *   FAIL    — 색인 안 됨, 사유 표시
 *   NEUTRAL — Google이 아직 평가 안 함 (신규 발견 또는 크롤링 진행 중)
 */

const URL_INSPECTION_BASE = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

export type IndexVerdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED'

export type CoverageState = string  // 예: "Submitted and indexed" / "Crawled - currently not indexed" / "Discovered - currently not indexed" / "Duplicate without user-selected canonical"

export interface UrlInspectionResult {
  verdict: IndexVerdict
  coverageState?: CoverageState  // 사람이 읽을 수 있는 사유
  robotsTxtState?: string         // ALLOWED / DISALLOWED
  indexingState?: string          // INDEXING_ALLOWED / BLOCKED_BY_META_TAG / BLOCKED_BY_HTTP_HEADER 등
  lastCrawlTime?: string          // ISO 8601
  pageFetchState?: string         // SUCCESSFUL / SOFT_404 / SERVER_ERROR 등
  googleCanonical?: string        // Google이 정한 canonical URL
  userCanonical?: string          // 사이트가 선언한 canonical
  error?: string                  // API 호출 실패 시
}

/**
 * 단일 URL 검사. URL은 GSC에 등록된 속성에 속해야 함 (사용자 권한 있는).
 *
 * @param siteUrl GSC 속성 식별자 — 'sc-domain:example.com' 또는 'https://example.com/'
 * @param inspectionUrl 검사할 페이지 URL (절대 URL)
 * @param accessToken google_indexing 스코프 토큰
 * @param languageCode 'ko' (한국 검색 결과 기준), 미지정 시 영어 기본
 */
export async function inspectUrl(
  siteUrl: string,
  inspectionUrl: string,
  accessToken: string,
  languageCode: string = 'ko-KR',
): Promise<UrlInspectionResult> {
  try {
    const res = await fetch(URL_INSPECTION_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inspectionUrl,
        siteUrl,
        languageCode,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return {
        verdict: 'VERDICT_UNSPECIFIED',
        error: `URL Inspection ${res.status}: ${errText.slice(0, 200)}`,
      }
    }

    const data = await res.json()
    const idx = data.inspectionResult?.indexStatusResult ?? {}

    return {
      verdict: (idx.verdict as IndexVerdict) ?? 'VERDICT_UNSPECIFIED',
      coverageState: idx.coverageState,
      robotsTxtState: idx.robotsTxtState,
      indexingState: idx.indexingState,
      lastCrawlTime: idx.lastCrawlTime,
      pageFetchState: idx.pageFetchState,
      googleCanonical: idx.googleCanonical,
      userCanonical: idx.userCanonical,
    }
  } catch (err) {
    return {
      verdict: 'VERDICT_UNSPECIFIED',
      error: err instanceof Error ? err.message : 'URL Inspection 호출 실패',
    }
  }
}

/**
 * 여러 URL을 직렬로 검사 (rate limit + 안전성 위해).
 * 한도 2000/일이라 보통은 batch 단위로 충분.
 *
 * @param siteUrl GSC 속성
 * @param urls 검사할 URL 목록
 * @param accessToken
 * @param onProgress 선택 — 진행 콜백 (idx, total)
 */
export async function inspectUrlsBatch(
  siteUrl: string,
  urls: string[],
  accessToken: string,
  onProgress?: (idx: number, total: number) => void,
): Promise<Record<string, UrlInspectionResult>> {
  const map: Record<string, UrlInspectionResult> = {}
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    map[url] = await inspectUrl(siteUrl, url, accessToken)
    onProgress?.(i + 1, urls.length)
    // 너무 빠른 연속 호출 방지 — 100ms 간격
    if (i < urls.length - 1) await new Promise(r => setTimeout(r, 100))
  }
  return map
}

/**
 * verdict + coverageState를 우리 앱의 단순한 색인 상태로 변환.
 */
export function simplifyVerdict(result: UrlInspectionResult): 'indexed' | 'pending' | 'not_indexed' | 'unknown' {
  if (result.error) return 'unknown'
  if (result.verdict === 'PASS') return 'indexed'
  if (result.verdict === 'PARTIAL') return 'indexed'  // 일부 OK도 사용자 입장에선 색인됨
  if (result.verdict === 'NEUTRAL') return 'pending'
  if (result.verdict === 'FAIL') return 'not_indexed'
  return 'unknown'
}
