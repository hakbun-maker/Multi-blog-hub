/**
 * AdSense Management API v2 래퍼.
 * https://developers.google.com/adsense/management/reference/rest
 *
 * 호출에는 `adsense.readonly` scope이 필요하며, 사용자 계정이 AdSense 승인 상태여야 함.
 */

const ADSENSE_BASE = 'https://adsense.googleapis.com/v2'

export interface AdsenseSite {
  /** "accounts/{account}/sites/{site}" */
  name: string
  domain: string
  state?: string // READY, NEEDS_ATTENTION, REQUIRES_REVIEW, ...
  autoAdsEnabled?: boolean
}

export interface AdsenseRevenue {
  domain: string
  estimatedEarnings: number // USD
  pageViews: number
  impressions: number
  clicks: number
  ctr: number // 0~1
  rpm: number // USD per 1000 page views
  currency: string
  error?: string
}

/**
 * 사용자의 AdSense 사이트 목록 조회.
 * accountId 형식: "pub-1234567890123456"
 */
export async function listAdsenseSites(
  accountId: string,
  accessToken: string,
): Promise<AdsenseSite[]> {
  const sites: AdsenseSite[] = []
  let pageToken: string | undefined
  do {
    const url = new URL(`${ADSENSE_BASE}/accounts/${accountId}/sites`)
    url.searchParams.set('pageSize', '50')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) break
    const data = await res.json()
    for (const s of data.sites ?? []) {
      sites.push({
        name: s.name,
        domain: s.domain,
        state: s.state,
        autoAdsEnabled: s.autoAdsEnabled,
      })
    }
    pageToken = data.nextPageToken
  } while (pageToken)
  return sites
}

/**
 * 도메인별 수익 리포트 조회.
 * dimension=DOMAIN_NAME 으로 도메인별 수익을 한 번에 받아 매핑.
 *
 * @param accountId "pub-XXXX..."
 * @param startDate "YYYY-MM-DD"
 * @param endDate "YYYY-MM-DD"
 */
export async function generateAdsenseDomainReport(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, AdsenseRevenue>> {
  const url = new URL(`${ADSENSE_BASE}/accounts/${accountId}/reports:generate`)
  url.searchParams.set('dateRange', 'CUSTOM')
  const [sy, sm, sd] = startDate.split('-')
  const [ey, em, ed] = endDate.split('-')
  url.searchParams.set('startDate.year', sy)
  url.searchParams.set('startDate.month', sm)
  url.searchParams.set('startDate.day', sd)
  url.searchParams.set('endDate.year', ey)
  url.searchParams.set('endDate.month', em)
  url.searchParams.set('endDate.day', ed)
  url.searchParams.append('dimensions', 'DOMAIN_NAME')
  for (const m of [
    'ESTIMATED_EARNINGS',
    'PAGE_VIEWS',
    'IMPRESSIONS',
    'CLICKS',
    'IMPRESSIONS_CTR',
    'PAGE_VIEWS_RPM',
  ]) {
    url.searchParams.append('metrics', m)
  }
  url.searchParams.set('currencyCode', 'USD')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`AdSense ${res.status}: ${errText.slice(0, 200)}`)
  }
  const data = await res.json()

  const map: Record<string, AdsenseRevenue> = {}
  for (const row of data.rows ?? []) {
    const cells = row.cells ?? []
    // dimensions: [DOMAIN_NAME], 그 다음 metrics 순서대로
    const domain = cells[0]?.value ?? ''
    if (!domain) continue
    map[domain.toLowerCase()] = {
      domain,
      estimatedEarnings: parseFloat(cells[1]?.value ?? '0') || 0,
      pageViews: parseInt(cells[2]?.value ?? '0', 10) || 0,
      impressions: parseInt(cells[3]?.value ?? '0', 10) || 0,
      clicks: parseInt(cells[4]?.value ?? '0', 10) || 0,
      ctr: parseFloat(cells[5]?.value ?? '0') || 0,
      rpm: parseFloat(cells[6]?.value ?? '0') || 0,
      currency: 'USD',
    }
  }
  return map
}

/**
 * 도메인별 viewability 리포트 — ACTIVE_VIEW 메트릭 사용.
 *
 * @returns Record<도메인 lowercase, { viewability, impressions }>
 */
export async function generateAdsenseViewabilityReport(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, { viewability: number; impressions: number }>> {
  const url = new URL(`${ADSENSE_BASE}/accounts/${accountId}/reports:generate`)
  url.searchParams.set('dateRange', 'CUSTOM')
  const [sy, sm, sd] = startDate.split('-')
  const [ey, em, ed] = endDate.split('-')
  url.searchParams.set('startDate.year', sy)
  url.searchParams.set('startDate.month', sm)
  url.searchParams.set('startDate.day', sd)
  url.searchParams.set('endDate.year', ey)
  url.searchParams.set('endDate.month', em)
  url.searchParams.set('endDate.day', ed)
  url.searchParams.append('dimensions', 'DOMAIN_NAME')
  url.searchParams.append('metrics', 'ACTIVE_VIEW_VIEWABILITY')
  url.searchParams.append('metrics', 'IMPRESSIONS')
  url.searchParams.set('currencyCode', 'USD')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`AdSense Viewability ${res.status}: ${errText.slice(0, 200)}`)
  }
  const data = await res.json()

  const map: Record<string, { viewability: number; impressions: number }> = {}
  for (const row of data.rows ?? []) {
    const cells = row.cells ?? []
    const domain = cells[0]?.value ?? ''
    if (!domain) continue
    map[domain.toLowerCase()] = {
      viewability: parseFloat(cells[1]?.value ?? '0') || 0,
      impressions: parseInt(cells[2]?.value ?? '0', 10) || 0,
    }
  }
  return map
}

/**
 * 일별 수익 리포트 — DATE dimension만 사용. 예측·트렌드 계산용.
 *
 * @returns Record<'YYYY-MM-DD', estimatedEarnings>
 */
export async function generateAdsenseDailyReport(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<Record<string, number>> {
  const url = new URL(`${ADSENSE_BASE}/accounts/${accountId}/reports:generate`)
  url.searchParams.set('dateRange', 'CUSTOM')
  const [sy, sm, sd] = startDate.split('-')
  const [ey, em, ed] = endDate.split('-')
  url.searchParams.set('startDate.year', sy)
  url.searchParams.set('startDate.month', sm)
  url.searchParams.set('startDate.day', sd)
  url.searchParams.set('endDate.year', ey)
  url.searchParams.set('endDate.month', em)
  url.searchParams.set('endDate.day', ed)
  url.searchParams.append('dimensions', 'DATE')
  url.searchParams.append('metrics', 'ESTIMATED_EARNINGS')
  url.searchParams.set('currencyCode', 'USD')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`AdSense Daily ${res.status}: ${errText.slice(0, 200)}`)
  }
  const data = await res.json()

  const map: Record<string, number> = {}
  for (const row of data.rows ?? []) {
    const cells = row.cells ?? []
    const date = cells[0]?.value ?? ''
    if (!date) continue
    map[date] = parseFloat(cells[1]?.value ?? '0') || 0
  }
  return map
}

/**
 * 도메인 후보(custom_domain, subdomain.host) 중 매칭되는 첫 번째 수익 데이터 반환.
 */
export function pickRevenueForBlog(
  domainMap: Record<string, AdsenseRevenue>,
  candidates: (string | null | undefined)[],
): AdsenseRevenue | null {
  for (const c of candidates) {
    if (!c) continue
    const key = c.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
    if (domainMap[key]) return domainMap[key]
  }
  return null
}
