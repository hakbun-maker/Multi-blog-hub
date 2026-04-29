/**
 * GA4 Data API runReport 래퍼.
 * https://developers.google.com/analytics/devguides/reporting/data/v1
 */

const GA_DATA_BASE = 'https://analyticsdata.googleapis.com/v1beta'

export interface Ga4Metrics {
  totalUsers: number
  screenPageViews: number
  sessions: number
}

export interface Ga4Result {
  propertyId: string
  metrics: Ga4Metrics
  error?: string
}

/**
 * 단일 GA4 property에 대해 지정 기간의 메트릭을 조회.
 *
 * @param propertyId GA4 numeric property ID
 * @param accessToken 유효한 Google access token
 * @param dateRange 'today' | '7daysAgo..today' | '30daysAgo..today'
 */
export async function fetchGa4Metrics(
  propertyId: string,
  accessToken: string,
  startDate: string = '30daysAgo',
  endDate: string = 'today',
): Promise<Ga4Result> {
  try {
    const res = await fetch(`${GA_DATA_BASE}/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return {
        propertyId,
        metrics: { totalUsers: 0, screenPageViews: 0, sessions: 0 },
        error: `GA4 ${res.status}: ${errText.slice(0, 200)}`,
      }
    }

    const data = await res.json()
    const row = data.rows?.[0]
    const values = row?.metricValues ?? []

    return {
      propertyId,
      metrics: {
        totalUsers: parseInt(values[0]?.value ?? '0', 10) || 0,
        screenPageViews: parseInt(values[1]?.value ?? '0', 10) || 0,
        sessions: parseInt(values[2]?.value ?? '0', 10) || 0,
      },
    }
  } catch (err) {
    return {
      propertyId,
      metrics: { totalUsers: 0, screenPageViews: 0, sessions: 0 },
      error: err instanceof Error ? err.message : 'GA4 fetch failed',
    }
  }
}

/**
 * 여러 propertyId에 대해 병렬 조회.
 */
export async function fetchGa4MetricsBatch(
  propertyIds: string[],
  accessToken: string,
  startDate?: string,
  endDate?: string,
): Promise<Record<string, Ga4Result>> {
  const results = await Promise.all(
    propertyIds.map(pid => fetchGa4Metrics(pid, accessToken, startDate, endDate)),
  )
  const map: Record<string, Ga4Result> = {}
  for (const r of results) map[r.propertyId] = r
  return map
}
