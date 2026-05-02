/**
 * Google Search Console — Search Analytics API 래퍼.
 * https://developers.google.com/webmaster-tools/v1/searchanalytics/query
 *
 * 사용처: 통계 페이지의 "숨은 보석" 식별 (노출↑ CTR↓ 글)
 *         + 글별 노출·클릭·CTR·평균 순위 표시
 */

const GSC_BASE = 'https://www.googleapis.com/webmasters/v3'

export interface GscRow {
  page?: string         // pagePath (dimension 'page'일 때)
  query?: string        // 검색어 (dimension 'query'일 때)
  date?: string         // YYYY-MM-DD (dimension 'date'일 때)
  device?: string       // mobile/desktop/tablet (dimension 'device'일 때)
  country?: string      // ISO 국가 코드 (dimension 'country'일 때)
  impressions: number
  clicks: number
  ctr: number           // 0~1
  position: number
}

export interface GscQueryResult {
  rows: GscRow[]
  error?: string
}

/**
 * Search Analytics 쿼리 — 지정 기간·dimension에 대해 row 목록 반환.
 *
 * @param siteUrl GSC에 등록된 사이트 URL (정확히 일치 필요. 예: 'https://example.com/' or 'sc-domain:example.com')
 * @param accessToken 유효한 Google access token (webmasters scope)
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @param dimensions ['page'] | ['query'] | ['date'] | ['page', 'query'] 등
 * @param rowLimit 최대 row 수 (default 1000, 최대 25000)
 */
export async function fetchSearchAnalytics(
  siteUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions: ('page' | 'query' | 'date' | 'device' | 'country')[] = ['page'],
  rowLimit: number = 1000,
): Promise<GscQueryResult> {
  try {
    const encoded = encodeURIComponent(siteUrl)
    const res = await fetch(`${GSC_BASE}/sites/${encoded}/searchAnalytics/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return {
        rows: [],
        error: `GSC SearchAnalytics ${res.status}: ${errText.slice(0, 200)}`,
      }
    }

    const data = await res.json()
    const rawRows = (data.rows ?? []) as Array<{
      keys?: string[]
      impressions?: number
      clicks?: number
      ctr?: number
      position?: number
    }>

    const rows: GscRow[] = rawRows.map(r => {
      const keys = r.keys ?? []
      const result: GscRow = {
        impressions: r.impressions ?? 0,
        clicks: r.clicks ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      }
      dimensions.forEach((dim, idx) => {
        result[dim] = keys[idx]
      })
      return result
    })

    return { rows }
  } catch (err) {
    return {
      rows: [],
      error: err instanceof Error ? err.message : 'GSC SearchAnalytics fetch failed',
    }
  }
}

/**
 * "숨은 보석" 후보 식별 — 노출 ≥ minImpressions + CTR < ctrThreshold 페이지.
 *
 * @param ctrThreshold 0~1 (예: 0.02 = 2% 미만)
 */
export function findHiddenGems(
  rows: GscRow[],
  minImpressions: number = 1000,
  ctrThreshold: number = 0.02,
): GscRow[] {
  return rows
    .filter(r => r.impressions >= minImpressions && r.ctr < ctrThreshold && r.page)
    .sort((a, b) => b.impressions - a.impressions)
}

/** "덮이는 글" 후보 — 두 기간 비교해서 노출이 X% 이상 떨어진 페이지 */
export function findDecayingPages(
  current: GscRow[],
  previous: GscRow[],
  dropPercent: number = 0.5,
): { page: string; currentImpr: number; previousImpr: number; dropRatio: number }[] {
  const prevMap = new Map(previous.map(r => [r.page, r.impressions]))
  return current
    .filter(r => r.page)
    .map(r => {
      const prev = prevMap.get(r.page) ?? 0
      const dropRatio = prev > 0 ? (prev - r.impressions) / prev : 0
      return {
        page: r.page!,
        currentImpr: r.impressions,
        previousImpr: prev,
        dropRatio,
      }
    })
    .filter(x => x.previousImpr > 100 && x.dropRatio >= dropPercent)
    .sort((a, b) => b.dropRatio - a.dropRatio)
}
