import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/utils/encryption'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExternalEvent {
  title: string
  date: string | null        // YYYY-MM-DD, null if unknown
  venue?: string
  category: 'concert' | 'sports' | 'festival' | 'exhibition' | 'other'
  source: string             // 'interpark' | 'yes24' | 'melon' | 'google_trends' | 'sports_kbo' | 'sports_kleague' | 'naver_news'
  keywords: string[]         // Extracted search keywords
  dDay: number | null        // Days until event, null if date unknown
  url?: string               // Original event URL
}

export interface EventSourceConfig {
  name: string
  enabled: boolean
  requiresApiKey: boolean
  provider?: string          // ai_api_keys provider name
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Patterns that indicate controversial or negative content to skip */
const BLACKLIST_PATTERNS = ['논란', '사건', '불매', '고소', '구속', '폭행', '학폭']

/** Naver search queries used as proxies for sources that lack public APIs */
const SOURCE_QUERIES: Record<string, string> = {
  interpark: '인터파크 티켓 공연 콘서트',
  yes24: 'YES24 티켓 공연',
  melon: '멜론 티켓 콘서트',
  sports: 'KBO 경기 일정 K리그',
  festival: '축제 행사 페스티벌 일정',
}

/**
 * Patterns used to infer event category from a title string.
 * Checked in order — first match wins.
 */
const CATEGORY_PATTERNS: Array<{
  pattern: RegExp
  category: ExternalEvent['category']
}> = [
  { pattern: /콘서트|공연|뮤지컬|오페라|클래식|밴드|가수|아이돌|팬미팅/, category: 'concert' },
  { pattern: /야구|축구|농구|배구|KBO|K리그|경기|리그|챔피언|시합/, category: 'sports' },
  { pattern: /축제|페스티벌|festival|페스타|carnival|불꽃/, category: 'festival' },
  { pattern: /전시|박람회|아트|미술|갤러리|exhibition/, category: 'exhibition' },
]

// ---------------------------------------------------------------------------
// EventAPI
// ---------------------------------------------------------------------------

export class EventAPI {
  private userId: string
  /** Stores decrypted API keys by provider name */
  private apiKeys: Map<string, string> = new Map()
  /** Stores decrypted secret keys by provider name (Naver requires both) */
  private secretKeys: Map<string, string> = new Map()

  constructor(userId: string) {
    this.userId = userId
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * Load API keys for event-related providers from the `ai_api_keys` table.
   * Currently loads: naver_search (used as proxy for all Korean event sources),
   * google_trends (optional, for the official API).
   */
  async initialize(): Promise<void> {
    const supabase = createClient()
    await this.initializeWithClient(supabase)
  }

  /**
   * Load API keys using a provided supabase client.
   * Use this in cron/server contexts where a session-based client is not available.
   */
  async initializeWithClient(supabase: SupabaseClient): Promise<void> {
    const { data, error } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key, encrypted_secret')
      .eq('user_id', this.userId)
      .in('provider', ['naver_search', 'google_trends', 'interpark'])
      .eq('is_active', true)

    if (error) {
      console.error('[EventAPI] API 키 로드 실패:', error.message)
      return
    }

    for (const row of data ?? []) {
      if (row.encrypted_key) {
        try {
          this.apiKeys.set(row.provider, decrypt(row.encrypted_key))
        } catch {
          console.error(`[EventAPI] ${row.provider} 키 복호화 실패`)
        }
      }
      if (row.encrypted_secret) {
        try {
          this.secretKeys.set(row.provider, decrypt(row.encrypted_secret))
        } catch {
          console.error(`[EventAPI] ${row.provider} 시크릿 복호화 실패`)
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public: fetch all events
  // -------------------------------------------------------------------------

  /**
   * Fetch events from all configured sources in parallel.
   * Individual source failures are silently swallowed — the aggregated result
   * contains whatever succeeded.
   */
  async fetchAllEvents(): Promise<ExternalEvent[]> {
    const results = await Promise.allSettled([
      this.fetchInterparkEvents(),
      this.fetchYes24Events(),
      this.fetchMelonEvents(),
      this.fetchGoogleTrends(),
      this.fetchSportsSchedule(),
    ])

    const allEvents: ExternalEvent[] = []
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value)
      }
    }

    // Deduplicate by normalised title
    const deduped = EventAPI.deduplicateEvents(allEvents)

    // Calculate D-Day for events that have a date
    const withDDay = deduped.map(event => ({
      ...event,
      dDay: event.date ? EventAPI.calculateDDay(event.date) : null,
    }))

    // Sort: events with known dates first (closest first), then undated ones
    return withDDay.sort((a, b) => {
      if (a.dDay === null && b.dDay === null) return 0
      if (a.dDay === null) return 1
      if (b.dDay === null) return -1
      return a.dDay - b.dDay
    })
  }

  // -------------------------------------------------------------------------
  // Private: individual source methods
  // -------------------------------------------------------------------------

  /**
   * Interpark 공연 — uses Naver search as a proxy because Interpark has no
   * public API and scraping their HTTPS pages is unreliable.
   */
  private async fetchInterparkEvents(): Promise<ExternalEvent[]> {
    try {
      const items = await this.naverWebSearch(SOURCE_QUERIES.interpark, 20)
      return items.map(item =>
        EventAPI.buildEventFromNaverItem(item, 'interpark', 'concert')
      )
    } catch (error) {
      console.error('[EventAPI] Interpark 이벤트 수집 실패:', error)
      return []
    }
  }

  /**
   * YES24 공연 — uses Naver search proxy.
   */
  private async fetchYes24Events(): Promise<ExternalEvent[]> {
    try {
      const items = await this.naverWebSearch(SOURCE_QUERIES.yes24, 20)
      return items.map(item =>
        EventAPI.buildEventFromNaverItem(item, 'yes24', 'concert')
      )
    } catch (error) {
      console.error('[EventAPI] YES24 이벤트 수집 실패:', error)
      return []
    }
  }

  /**
   * Melon Ticket 공연 — uses Naver search proxy.
   */
  private async fetchMelonEvents(): Promise<ExternalEvent[]> {
    try {
      const items = await this.naverWebSearch(SOURCE_QUERIES.melon, 20)
      return items.map(item =>
        EventAPI.buildEventFromNaverItem(item, 'melon', 'concert')
      )
    } catch (error) {
      console.error('[EventAPI] Melon 이벤트 수집 실패:', error)
      return []
    }
  }

  /**
   * Google Trends — uses the free daily RSS feed (no API key needed).
   * Falls back to an empty array if the feed is unreachable.
   * If a `google_trends` API key is registered, the official API can be
   * wired in here as a future enhancement.
   */
  private async fetchGoogleTrends(): Promise<ExternalEvent[]> {
    try {
      const response = await fetch(
        'https://trends.google.co.kr/trends/trendingsearches/daily/rss?geo=KR',
        { next: { revalidate: 3600 } }
      )
      if (!response.ok) return []

      const xml = await response.text()
      return EventAPI.parseGoogleTrendsRSS(xml)
    } catch (error) {
      console.error('[EventAPI] Google Trends 수집 실패:', error)
      return []
    }
  }

  /**
   * KBO / K리그 sports schedule — uses Naver news search as a proxy.
   */
  private async fetchSportsSchedule(): Promise<ExternalEvent[]> {
    try {
      const items = await this.naverNewsSearch(SOURCE_QUERIES.sports, 30)
      return items
        .map(item => EventAPI.buildEventFromNaverItem(item, 'sports_kbo', 'sports'))
        .filter(e => !EventAPI.isBlacklisted(e.title))
    } catch (error) {
      console.error('[EventAPI] 스포츠 일정 수집 실패:', error)
      return []
    }
  }

  // -------------------------------------------------------------------------
  // Private: Naver API helpers
  // -------------------------------------------------------------------------

  /**
   * Call the Naver Web Search API.
   * Returns an empty array if the naver_search key is not configured.
   */
  private async naverWebSearch(
    query: string,
    display = 10
  ): Promise<NaverSearchItem[]> {
    const clientId = this.apiKeys.get('naver_search')
    const clientSecret = this.secretKeys.get('naver_search')
    if (!clientId) return []

    const url = `https://openapi.naver.com/v1/search/webkr?query=${encodeURIComponent(query)}&display=${display}&sort=date`
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret ?? '',
      },
    })

    if (!response.ok) return []
    const data = await response.json()
    return (data.items ?? []) as NaverSearchItem[]
  }

  /**
   * Call the Naver News Search API (fresher results for time-sensitive events).
   * Returns an empty array if the naver_search key is not configured.
   */
  private async naverNewsSearch(
    query: string,
    display = 10
  ): Promise<NaverSearchItem[]> {
    const clientId = this.apiKeys.get('naver_search')
    const clientSecret = this.secretKeys.get('naver_search')
    if (!clientId) return []

    const url = `https://openapi.naver.com/v1/search/news?query=${encodeURIComponent(query)}&display=${display}&sort=date`
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret ?? '',
      },
    })

    if (!response.ok) return []
    const data = await response.json()
    return (data.items ?? []) as NaverSearchItem[]
  }

  // -------------------------------------------------------------------------
  // Static: parsers / utilities
  // -------------------------------------------------------------------------

  /**
   * Parse Google Trends daily RSS XML and return entertainment-related events.
   *
   * RSS item structure (relevant elements):
   * ```xml
   * <item>
   *   <title>검색어</title>
   *   <ht:approx_traffic>100,000+</ht:approx_traffic>
   *   <ht:news_item>
   *     <ht:news_item_title>관련 뉴스 제목</ht:news_item_title>
   *   </ht:news_item>
   * </item>
   * ```
   */
  static parseGoogleTrendsRSS(xml: string): ExternalEvent[] {
    const events: ExternalEvent[] = []

    // Extract <item> blocks
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match: RegExpExecArray | null

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]

      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
        block.match(/<title>(.*?)<\/title>/)
      if (!titleMatch) continue

      const rawTitle = titleMatch[1].trim()
      const title = rawTitle.replace(/<[^>]*>/g, '').trim()
      if (!title || EventAPI.isBlacklisted(title)) continue

      // Only include items that look entertainment/event related
      const category = EventAPI.inferCategory(title)

      // Traffic hint (not required)
      const trafficMatch = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)
      const traffic = trafficMatch ? trafficMatch[1] : undefined

      events.push({
        title,
        date: null,
        category,
        source: 'google_trends',
        keywords: EventAPI.extractKeywords(title, category),
        dDay: null,
        url: traffic !== undefined ? undefined : undefined, // placeholder
      })
    }

    return events
  }

  /**
   * Build an ExternalEvent from a Naver search result item.
   * Strips HTML tags from title / description fields.
   */
  static buildEventFromNaverItem(
    item: NaverSearchItem,
    source: ExternalEvent['source'],
    defaultCategory: ExternalEvent['category']
  ): ExternalEvent {
    const rawTitle = (item.title ?? '').replace(/<[^>]*>/g, '').trim()
    const description = (item.description ?? '').replace(/<[^>]*>/g, '').trim()

    // 뉴스 기사 제목에서 핵심 이벤트명 추출 (긴 기사 제목을 검색 키워드로 정제)
    const cleanTitle = EventAPI.extractEventName(rawTitle)
    const category = EventAPI.inferCategory(cleanTitle) ?? defaultCategory

    const date = EventAPI.extractDate(description) ?? EventAPI.extractDate(item.pubDate ?? '')

    return {
      title: cleanTitle,
      date,
      category,
      source,
      keywords: EventAPI.extractKeywords(cleanTitle, category),
      dDay: null,
      url: item.link ?? undefined,
    }
  }

  /**
   * 뉴스 기사 제목에서 핵심 이벤트명만 추출합니다.
   * "OTT로 넘어가는 '공동 시청' 콘텐츠 주도권" → "OTT 공동시청"
   * "2026 코첼라 페스티벌 라인업 공개...BTS 출연 확정" → "코첼라 페스티벌"
   */
  static extractEventName(title: string): string {
    // 1. 따옴표 안의 이벤트명 추출 우선
    const quoted = title.match(/[''""「」『』【】]([^''""「」『』【】]{2,15})[''""「」『』【】]/)
    if (quoted) return quoted[1].trim()

    // 2. "..." 이후 제거, 부제/설명 제거
    let clean = title
      .split(/[…·|,\-]/)
      .map(s => s.trim())
      .filter(s => s.length >= 2)
      [0] ?? title

    // 3. 기사성 접미사 제거
    clean = clean
      .replace(/(보도|발표|전망|논란|주도권|분석|평가|의미|배경|이유|현황|동향)$/, '')
      .replace(/(에 대한|으로 인한|을 위한|에서의).*$/, '')
      .trim()

    // 4. 너무 길면 (15자 초과) 핵심 명사만 추출
    if (clean.length > 15) {
      const nouns = clean.match(/[가-힣A-Za-z0-9]{2,}/g) ?? []
      // 의미없는 조사/동사 필터
      const filtered = nouns.filter(n =>
        !['넘어가는', '되는', '하는', '있는', '위한', '대한', '통한', '관련', '것으로', '이상'].includes(n)
      )
      clean = filtered.slice(0, 3).join(' ')
    }

    return clean || title.slice(0, 15)
  }

  /**
   * Generate multiple keyword variations from an event title.
   *
   * Common variations (always produced):
   *   "[제목]", "[제목] 티켓", "[제목] 예매", "[제목] 좌석",
   *   "[제목] 후기", "[제목] 가격"
   *
   * Category-specific additions:
   *   concert  → "콘서트", "공연", "세트리스트"
   *   sports   → "경기", "중계", "결과", "하이라이트"
   *   festival → "축제", "입장권", "프로그램"
   *   exhibition → "전시", "관람", "티켓"
   */
  static extractKeywords(eventTitle: string, category: string): string[] {
    if (!eventTitle) return []

    const base = [
      eventTitle,
      `${eventTitle} 티켓`,
      `${eventTitle} 예매`,
      `${eventTitle} 좌석`,
      `${eventTitle} 후기`,
      `${eventTitle} 가격`,
    ]

    const categoryExtras: Record<string, string[]> = {
      concert: [
        `${eventTitle} 콘서트`,
        `${eventTitle} 공연`,
        `${eventTitle} 세트리스트`,
      ],
      sports: [
        `${eventTitle} 경기`,
        `${eventTitle} 중계`,
        `${eventTitle} 결과`,
        `${eventTitle} 하이라이트`,
      ],
      festival: [
        `${eventTitle} 축제`,
        `${eventTitle} 입장권`,
        `${eventTitle} 프로그램`,
      ],
      exhibition: [
        `${eventTitle} 전시`,
        `${eventTitle} 관람`,
        `${eventTitle} 티켓`,
      ],
    }

    const extras = categoryExtras[category] ?? []
    // Deduplicate while preserving order
    return Array.from(new Set([...base, ...extras]))
  }

  /**
   * Returns true when text contains any of the blacklisted controversy patterns.
   */
  static isBlacklisted(text: string): boolean {
    return BLACKLIST_PATTERNS.some(pattern => text.includes(pattern))
  }

  // -------------------------------------------------------------------------
  // Static: private helpers
  // -------------------------------------------------------------------------

  /**
   * Infer an event category from its title using CATEGORY_PATTERNS.
   * Returns 'other' when nothing matches.
   */
  static inferCategory(title: string): ExternalEvent['category'] {
    for (const { pattern, category } of CATEGORY_PATTERNS) {
      if (pattern.test(title)) return category
    }
    return 'other'
  }

  /**
   * Try to extract a YYYY-MM-DD date string from arbitrary text.
   * Recognises:
   *   - "2025-07-15" / "2025/07/15"
   *   - "2025년 7월 15일"  → "2025-07-15"
   *   - "7월 15일" (uses current year)
   *   - RFC 2822 pubDate: "Mon, 14 Jul 2025 ..."
   */
  static extractDate(text: string): string | null {
    if (!text) return null
    const year = new Date().getFullYear()

    // 1. ISO / slash format: 2025-07-15, 2025/7/15
    const iso = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (iso) {
      const [, y, m, d] = iso
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    // 2. Dot format: 2025.7.15, 2025.07.15
    const dot = text.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
    if (dot) {
      const [, y, m, d] = dot
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    // 3. Korean full date: 2025년 7월 15일 (공백 유무 무관)
    const fullKo = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
    if (fullKo) {
      const [, y, m, d] = fullKo
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    // 4. Korean partial date: 7월 15일, 7월15일 (공백 유무 무관, 올해 가정)
    const partialKo = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
    if (partialKo) {
      const [, m, d] = partialKo
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    // 5. "오는 N일", "이번 달 N일" (올해+현재월 가정)
    const thisMonth = text.match(/(?:오는|이번\s*달?)\s*(\d{1,2})일/)
    if (thisMonth) {
      const month = new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}-${thisMonth[1].padStart(2, '0')}`
    }

    // 6. "다음 달 N일" (올해+다음달 가정)
    const nextMonth = text.match(/다음\s*달?\s*(\d{1,2})일/)
    if (nextMonth) {
      const month = new Date().getMonth() + 2 // 다음달
      const adjYear = month > 12 ? year + 1 : year
      const adjMonth = month > 12 ? month - 12 : month
      return `${adjYear}-${String(adjMonth).padStart(2, '0')}-${nextMonth[1].padStart(2, '0')}`
    }

    // 7. RFC 2822: "Mon, 14 Jul 2025 12:00:00 +0900"
    const rfc = text.match(/\d{1,2}\s+\w{3}\s+\d{4}/)
    if (rfc) {
      const parsed = new Date(rfc[0])
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    }

    return null
  }

  /**
   * Calculate D-Day: positive = future event, negative = past event.
   */
  static calculateDDay(eventDate: string): number {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const event = new Date(eventDate)
    return Math.round((event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * Deduplicate events whose normalised titles are identical or very similar.
   * "Normalised" means: lowercase, strip whitespace, remove special chars.
   */
  static deduplicateEvents(events: ExternalEvent[]): ExternalEvent[] {
    const seen = new Map<string, ExternalEvent>()

    for (const event of events) {
      if (!event.title) continue
      const key = event.title
        .toLowerCase()
        .replace(/[\s\-_·]/g, '')
        .replace(/[^a-z0-9\uAC00-\uD7AF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '')
        .slice(0, 30)

      if (!seen.has(key)) {
        seen.set(key, event)
      } else {
        // Prefer the version that has a known date
        const existing = seen.get(key)!
        if (!existing.date && event.date) {
          seen.set(key, event)
        }
      }
    }

    return Array.from(seen.values())
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Minimal shape of a Naver search result item */
interface NaverSearchItem {
  title?: string
  link?: string
  description?: string
  pubDate?: string
}
