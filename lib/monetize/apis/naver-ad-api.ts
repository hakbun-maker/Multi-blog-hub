import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/utils/encryption'
import { createHmac } from 'crypto'

export interface NaverKeywordResult {
  keyword: string
  monthlyPcQcCnt: number      // PC 월간 검색량
  monthlyMobileQcCnt: number  // 모바일 월간 검색량
  monthlySearchVolume: number // PC + 모바일 합산
  compIdx: string             // 경쟁도: 높음/중간/낮음
  plAvgDepth: number          // 월평균 노출 광고 수
  monthlyAvgCpc: number       // 월평균 클릭 비용 (₩)
  relKeywords: string[]       // 연관 키워드 (relKeyword 필드에서 파생)
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
      .select('encrypted_key, encrypted_secret, encrypted_extra')
      .eq('user_id', userId)
      .eq('provider', 'naver_ad')
      .eq('is_active', true)
      .single()

    if (!data) return false
    try {
      this.config = {
        apiKey: decrypt(data.encrypted_key),
        secretKey: data.encrypted_secret ? decrypt(data.encrypted_secret) : '',
        customerId: data.encrypted_extra ? decrypt(data.encrypted_extra) : '',
      }
      if (!this.config.customerId) {
        console.error('[NaverAdAPI] Customer ID가 설정되지 않았습니다. encrypted_extra 필드를 확인하세요.')
        return false
      }
      return true
    } catch {
      console.error('[NaverAdAPI] API 키 복호화 실패')
      return false
    }
  }

  /** API 키를 직접 전달하여 초기화 (크론/서버 컨텍스트용) */
  initializeWithKeys(apiKey: string, secretKey: string, customerId: string): void {
    this.config = { apiKey, secretKey, customerId }
  }

  /** 네이버 검색광고 API용 HMAC-SHA256 서명 생성 */
  private generateSignature(timestamp: string, method: string, path: string): string {
    if (!this.config) throw new Error('NaverAdAPI not initialized')
    const message = `${timestamp}.${method}.${path}`
    return createHmac('sha256', this.config.secretKey)
      .update(message)
      .digest('base64')
  }

  /** 키워드 검색량 + 경쟁도 + CPC 조회 */
  async getKeywordStats(keywords: string[]): Promise<NaverKeywordResult[]> {
    if (!this.config) throw new Error('NaverAdAPI not initialized')
    if (this.dailyCount >= this.DAILY_LIMIT) throw new Error('Daily API limit reached')

    // 캐시 확인
    const cacheKey = keywords.sort().join(',')
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    const API_BASE = 'https://api.naver.com'
    const PATH = '/keywordstool'

    // 키워드를 하나씩 보내서 결과를 합침
    // 네이버 SearchAd API hintKeywords는 공백을 허용하지 않으므로 제거
    const trimmedKeywords = keywords.slice(0, 5)
      .map(k => k.trim().replace(/\s+/g, ''))
      .filter(k => k.length > 0)
    const allResults: NaverKeywordResult[] = []
    const errors: string[] = []

    for (const keyword of trimmedKeywords) {
      const timestamp = Date.now().toString()
      const signature = this.generateSignature(timestamp, 'GET', PATH)
      // URL 클래스 사용: searchParams가 공백을 +로 인코딩 (Python requests와 동일)
      const urlObj = new URL(`${API_BASE}${PATH}`)
      urlObj.searchParams.set('hintKeywords', keyword)
      urlObj.searchParams.set('showDetail', '1')
      const url = urlObj.toString()

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-KEY': this.config.apiKey,
            'X-Customer': this.config.customerId,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
          },
        })

        const responseText = await response.text()

        if (!response.ok) {
          errors.push(`[${keyword}] ${response.status}: ${responseText.slice(0, 200)}`)
          continue
        }

        const data = JSON.parse(responseText)
        this.dailyCount++

        // raw 응답 저장 (디버깅용)
        if (!(this as any)._lastRawResponse) {
          (this as any)._lastRawResponse = {
            keyword,
            url: url.slice(0, 300),
            status: response.status,
            keys: Object.keys(data),
            keywordListLength: Array.isArray(data.keywordList) ? data.keywordList.length : `not_array: ${typeof data.keywordList}`,
            rawSample: JSON.stringify(data).slice(0, 800),
          }
        }

        const results: NaverKeywordResult[] = (data.keywordList || []).map((item: any) => {
          const pcQcCnt = NaverAdAPI.parseSearchCount(item.monthlyPcQcCnt)
          const mobileQcCnt = NaverAdAPI.parseSearchCount(item.monthlyMobileQcCnt)
          return {
            keyword: item.relKeyword || '',
            monthlyPcQcCnt: pcQcCnt,
            monthlyMobileQcCnt: mobileQcCnt,
            monthlySearchVolume: pcQcCnt + mobileQcCnt,
            compIdx: item.compIdx || '낮음',
            plAvgDepth: parseInt(item.plAvgDepth) || 0,
            monthlyAvgCpc: parseInt(item.monthlyAvgCpc) || 0,
            relKeywords: [],
          }
        })
        allResults.push(...results)
      } catch (error: any) {
        errors.push(`[${keyword}] fetch error: ${error.message}`)
      }
    }

    // 에러 정보도 저장
    if (errors.length > 0) {
      (this as any)._lastErrors = errors
    }

    // 중복 제거
    const seen = new Set<string>()
    const dedupedResults = allResults.filter(r => {
      if (seen.has(r.keyword)) return false
      seen.add(r.keyword)
      return true
    })

    this.cache.set(cacheKey, { data: dedupedResults, timestamp: Date.now() })
    return dedupedResults
  }


  /** 네이버 검색량은 "< 10" 같은 문자열이 올 수 있으므로 안전 파싱 */
  private static parseSearchCount(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9]/g, '')
      return parseInt(cleaned) || 0
    }
    return 0
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
