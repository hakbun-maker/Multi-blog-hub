import { createClient } from '@/lib/supabase/server'

interface GoogleKeywordResult {
  keyword: string
  avgMonthlySearches: number
  cpcMicros: number           // CPC in micros (1,000,000 = $1)
  cpcKrw: number              // CPC converted to KRW
  competitionIndex: number    // 0-100
}

export class GoogleKWPAPI {
  private accessToken: string | null = null
  private cache = new Map<string, { data: GoogleKeywordResult[]; timestamp: number }>()
  private CACHE_TTL = 24 * 60 * 60 * 1000

  async initialize(userId: string): Promise<boolean> {
    const supabase = createClient()
    const { data } = await supabase
      .from('ai_api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', 'google_kwp')
      .eq('is_active', true)
      .single()

    if (!data) return false
    this.accessToken = data.encrypted_key
    return true
  }

  async getKeywordIdeas(keywords: string[], language?: string): Promise<GoogleKeywordResult[]> {
    if (!this.accessToken) throw new Error('GoogleKWPAPI not initialized')

    const cacheKey = keywords.sort().join(',') + (language || 'ko')
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      // Google Ads API - Keyword Planner
      const response = await fetch(
        'https://googleads.googleapis.com/v15/customers/0/googleAds:searchStream',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
          },
          body: JSON.stringify({
            query: `SELECT keyword_plan_keyword.keyword, keyword_plan_keyword.cpc_bid_micros FROM keyword_plan_keyword`,
          }),
        }
      )

      if (!response.ok) throw new Error(`Google KWP API error: ${response.status}`)
      const data = await response.json()

      const exchangeRate = 1350 // USD to KRW (should be fetched dynamically)

      const results: GoogleKeywordResult[] = (data.results || []).map((item: any) => {
        const cpcMicros = item.metrics?.highTopOfPageBidMicros || 0
        return {
          keyword: item.keyword || '',
          avgMonthlySearches: item.metrics?.avgMonthlySearches || 0,
          cpcMicros,
          cpcKrw: Math.round((cpcMicros / 1_000_000) * exchangeRate),
          competitionIndex: item.metrics?.competitionIndex || 0,
        }
      })

      this.cache.set(cacheKey, { data: results, timestamp: Date.now() })
      return results
    } catch (error) {
      console.error('[GoogleKWPAPI] CPC 조회 실패:', error)
      throw error
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.accessToken) return { success: false, message: 'API 키가 설정되지 않았습니다.' }
      await this.getKeywordIdeas(['test'])
      return { success: true, message: 'Google Keyword Planner 연결 성공.' }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
}
