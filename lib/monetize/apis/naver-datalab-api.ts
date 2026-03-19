import { createClient } from '@/lib/supabase/server'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'

interface TrendResult {
  keyword: string
  trendIndex: number       // 0-100 현재 트렌드 지수
  yoyGrowth: number        // 전년 대비 성장률 (%)
  isSeasonal: boolean
  seasonalMonths: number[]
}

interface EventKeyword {
  keyword: string
  eventName: string
  eventDate: string | null
  dDay: number | null       // D-Day (음수: 이전, 양수: 이후)
  source: string            // 'interpark' | 'melon' | 'naver_news' | 'google_trends'
}

// 논란 인물 블랙리스트 필터 키워드
const BLACKLIST_PATTERNS = ['논란', '사건', '불매', '고소', '구속', '폭행', '학폭']

export class NaverDataLabAPI {
  private apiKey: string | null = null
  private secretKey: string | null = null

  async initialize(userId: string): Promise<boolean> {
    const supabase = createClient()
    const { data } = await supabase
      .from('ai_api_keys')
      .select('encrypted_key, encrypted_secret')
      .eq('user_id', userId)
      .eq('provider', 'naver_search')
      .eq('is_active', true)
      .single()

    if (!data) return false
    this.apiKey = data.encrypted_key
    this.secretKey = data.encrypted_secret || ''
    return true
  }

  /** 2년치 트렌드 데이터 조회 */
  async getTrend(keyword: string): Promise<TrendResult> {
    if (!this.apiKey) throw new Error('NaverDataLabAPI not initialized')

    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setFullYear(endDate.getFullYear() - 2)

      const response = await fetch('https://openapi.naver.com/v1/datalab/search', {
        method: 'POST',
        headers: {
          'X-Naver-Client-Id': this.apiKey,
          'X-Naver-Client-Secret': this.secretKey || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          timeUnit: 'month',
          keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
        }),
      })

      if (!response.ok) throw new Error(`DataLab API error: ${response.status}`)
      const data = await response.json()

      const points = data.results?.[0]?.data || []
      const recentValues = points.slice(-6).map((p: any) => p.ratio || 0)
      const lastYearValues = points.slice(-18, -12).map((p: any) => p.ratio || 0)

      const currentAvg = recentValues.length > 0
        ? recentValues.reduce((a: number, b: number) => a + b, 0) / recentValues.length
        : 0
      const lastYearAvg = lastYearValues.length > 0
        ? lastYearValues.reduce((a: number, b: number) => a + b, 0) / lastYearValues.length
        : 0

      const yoyGrowth = lastYearAvg > 0 ? ((currentAvg - lastYearAvg) / lastYearAvg) * 100 : 0

      // 계절성 분석: 월별 평균 대비 표준편차
      const monthlyAvg: Record<number, number[]> = {}
      for (const point of points) {
        const month = new Date(point.period).getMonth() + 1
        if (!monthlyAvg[month]) monthlyAvg[month] = []
        monthlyAvg[month].push(point.ratio || 0)
      }

      const monthAvgs = Object.entries(monthlyAvg).map(([m, vals]) => ({
        month: parseInt(m),
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      }))

      const overallAvg = monthAvgs.reduce((a, b) => a + b.avg, 0) / monthAvgs.length
      const seasonalMonths = monthAvgs
        .filter(m => m.avg > overallAvg * 1.5)
        .map(m => m.month)

      return {
        keyword,
        trendIndex: Math.min(currentAvg, 100),
        yoyGrowth: Math.round(yoyGrowth * 100) / 100,
        isSeasonal: seasonalMonths.length > 0 && seasonalMonths.length <= 4,
        seasonalMonths,
      }
    } catch (error) {
      console.error('[DataLabAPI] 트렌드 조회 실패:', error)
      return { keyword, trendIndex: 50, yoyGrowth: 0, isSeasonal: false, seasonalMonths: [] }
    }
  }

  /** 이벤트/공연 키워드 수집 */
  async getEventKeywords(startDate: string, endDate: string): Promise<EventKeyword[]> {
    if (!this.apiKey) throw new Error('NaverDataLabAPI not initialized')

    const events: EventKeyword[] = []

    try {
      // 네이버 뉴스 API로 이벤트 키워드 수집
      const response = await fetch(
        `https://openapi.naver.com/v1/search/news?query=${encodeURIComponent('콘서트 공연 페스티벌')}&display=50&sort=date`,
        {
          headers: {
            'X-Naver-Client-Id': this.apiKey,
            'X-Naver-Client-Secret': this.secretKey || '',
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        for (const item of (data.items || [])) {
          const title = item.title.replace(/<[^>]*>/g, '').trim()
          if (this.isBlacklisted(title)) continue

          events.push({
            keyword: title,
            eventName: title,
            eventDate: null,
            dDay: null,
            source: 'naver_news',
          })
        }
      }
    } catch (error) {
      console.error('[DataLabAPI] 이벤트 키워드 수집 실패:', error)
    }

    // 시즌 이벤트 추가
    const startMonth = new Date(startDate).getMonth() + 1
    const endMonth = new Date(endDate).getMonth() + 1
    for (const ae of ANNUAL_EVENTS) {
      if (ae.month >= startMonth && ae.month <= endMonth) {
        for (const eventName of ae.events) {
          events.push({
            keyword: eventName,
            eventName,
            eventDate: null,
            dDay: null,
            source: 'annual_calendar',
          })
        }
      }
    }

    return events
  }

  /** D-Day 계산 */
  static calculateDDay(eventDate: string): number {
    const now = new Date()
    const event = new Date(eventDate)
    return Math.round((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  /** 블랙리스트 필터 */
  private isBlacklisted(text: string): boolean {
    return BLACKLIST_PATTERNS.some(pattern => text.includes(pattern))
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.apiKey) return { success: false, message: 'API 키가 설정되지 않았습니다.' }
      const result = await this.getTrend('테스트')
      return { success: true, message: `연결 성공. 트렌드 지수: ${result.trendIndex}` }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
}
