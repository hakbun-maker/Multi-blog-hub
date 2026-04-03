import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/utils/encryption'

interface NaverKeywordResult {
  keyword: string
  monthlyPcQcCnt: number      // PC 월간 검색량
  monthlyMobileQcCnt: number  // 모바일 월간 검색량
  compIdx: string             // 경쟁도: 높음/중간/낮음
  relKeywords: string[]       // 연관 키워드
}

interface NaverAdApiConfig {
  apiKey: string
  secretKey: string
  customerId: string
}

export class NaverAdAPI {
  private config: NaverAdApiConfig | null = null
  private cache = new Map<string, { data: NaverKeywordResult[]; timestamp: number }>()
  private CACHE_TTL = 24 * 60 * 60 * 1000 // 24시간
  private DAILY_LIMIT = 1000
  private dailyCount = 0

  /** 사용자 API 키로 초기화 (세션 기반 클라이언트 사용) */
  async initialize(userId: string): Promise<boolean> {
    const supabase = createClient()
    const { data } = await supabase
      .from('ai_api_keys')
      .select('encrypted_key, encrypted_secret')
      .eq('user_id', userId)
      .eq('provider', 'naver_ad')
      .eq('is_active', true)
      .single()

    if (!data) return false
    try {
      this.config = {
        apiKey: decrypt(data.encrypted_key),
        secretKey: data.encrypted_secret ? decrypt(data.encrypted_secret) : '',
        customerId: '',
      }
      return true
    } catch {
      console.error('[NaverAdAPI] API 키 복호화 실패')
      return false
    }
  }

  /** API 키를 직접 전달하여 초기화 (크론/서버 컨텍스트용) */
  initializeWithKeys(apiKey: string, secretKey: string): void {
    this.config = {
      apiKey,
      secretKey,
      customerId: '',
    }
  }

  /** 키워드 검색량 + 경쟁도 조회 */
  async getKeywordStats(keywords: string[]): Promise<NaverKeywordResult[]> {
    if (!this.config) throw new Error('NaverAdAPI not initialized')
    if (this.dailyCount >= this.DAILY_LIMIT) throw new Error('Daily API limit reached')

    // 캐시 확인
    const cacheKey = keywords.sort().join(',')
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      const timestamp = Date.now().toString()
      const response = await fetch('https://api.naver.com/keywordstool', {
        method: 'GET',
        headers: {
          'X-API-KEY': this.config.apiKey,
          'X-Customer': this.config.customerId,
          'X-Timestamp': timestamp,
          'X-Signature': this.config.secretKey, // 실제로는 HMAC-SHA256 서명
        },
        // In production, pass keywords as query params
      })

      if (!response.ok) throw new Error(`Naver API error: ${response.status}`)

      const data = await response.json()
      this.dailyCount++

      const results: NaverKeywordResult[] = (data.keywordList || []).map((item: any) => ({
        keyword: item.relKeyword,
        monthlyPcQcCnt: parseInt(item.monthlyPcQcCnt) || 0,
        monthlyMobileQcCnt: parseInt(item.monthlyMobileQcCnt) || 0,
        compIdx: item.compIdx || '낮음',
        relKeywords: (item.relKeyword || '').split(',').filter(Boolean),
      }))

      this.cache.set(cacheKey, { data: results, timestamp: Date.now() })
      return results
    } catch (error) {
      console.error('[NaverAdAPI] 키워드 조회 실패:', error)
      throw error
    }
  }

  /** 경쟁도 문자열 → 숫자 변환 */
  static competitionToScore(compIdx: string): number {
    switch (compIdx) {
      case '높음': return 80
      case '중간': return 50
      case '낮음': return 20
      default: return 50
    }
  }

  /** 총 검색량 계산 */
  static getTotalSearchVolume(result: NaverKeywordResult): number {
    return result.monthlyPcQcCnt + result.monthlyMobileQcCnt
  }

  /** API 연결 테스트 */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config) return { success: false, message: 'API 키가 설정되지 않았습니다.' }
      const results = await this.getKeywordStats(['테스트'])
      return { success: true, message: `연결 성공. ${results.length}개 결과 반환.` }
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }
}
