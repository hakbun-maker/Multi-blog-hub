/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import {
  scoreKeywords,
  filterByScore,
  saveKeywordsToDbWithClient,
} from '@/lib/monetize/engines/keyword-scorer'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'
import type { KeywordApiData } from '@/lib/monetize/engines/keyword-scorer'
import { EventAPI } from '@/lib/monetize/apis/event-api'
import { createEventClusters } from '@/lib/monetize/engines/event-cluster-engine'
import type { EventClusterKeyword } from '@/lib/monetize/engines/event-cluster-engine'
import { distributeKeywords } from '@/lib/monetize/engines/distribution-engine'
import { decrypt } from '@/lib/utils/encryption'
import type { Grade, IntentType } from '@/types/monetize'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeywordDiscoverResult {
  userId: string
  goldFound: number
  eventFound: number
  seasonFound: number
  totalSaved: number
  distributed: number
  eventClustersCreated: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Category → seed keyword mapping
// ---------------------------------------------------------------------------

const CATEGORY_SEEDS: Record<string, string[]> = {
  tech: ['AI', '스마트폰', '노트북', '프로그래밍', '앱추천'],
  health: ['다이어트', '운동', '건강식품', '영양제', '헬스'],
  finance: ['주식', '부동산', '재테크', '투자', '적금'],
  food: ['맛집', '레시피', '음식', '카페', '배달음식'],
  travel: ['여행', '호텔', '항공권', '여행지', '캠핑'],
  beauty: ['화장품', '스킨케어', '메이크업', '향수', '헤어케어'],
  fashion: ['옷', '명품', '신발', '가방', '코디'],
  parenting: ['육아', '아기용품', '임산부', '유아교육', '어린이'],
  pets: ['강아지', '고양이', '반려동물', '펫용품', '동물병원'],
  education: ['공부', '자격증', '영어', '독서', '온라인강의'],
  entertainment: ['영화', 'OTT', '음악', '게임', 'K-POP'],
  home: ['인테리어', '가구', '가전', '청소', '홈리빙'],
  auto: ['자동차', '전기차', '중고차', '자동차보험', '드라이브'],
  sports: ['축구', '야구', '골프', '헬스', '스포츠용품'],
}

const GENERIC_SEEDS = ['트렌드', '인기', '추천', '후기', '비교']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Map blog primary_ad_category → seed keywords */
function getSeedsForCategory(category: string | null): string[] {
  if (!category) return GENERIC_SEEDS
  const normalized = category.toLowerCase()
  // Try direct match
  if (CATEGORY_SEEDS[normalized]) return CATEGORY_SEEDS[normalized]
  // Try partial match
  for (const [key, seeds] of Object.entries(CATEGORY_SEEDS)) {
    if (normalized.includes(key) || key.includes(normalized)) return seeds
  }
  return GENERIC_SEEDS
}

/** Deduplicate array of seed keywords from multiple blogs */
function mergeSeeds(blogCategories: Array<string | null>): string[] {
  const seedSet = new Set<string>()
  for (const cat of blogCategories) {
    for (const seed of getSeedsForCategory(cat)) {
      seedSet.add(seed)
    }
  }
  return Array.from(seedSet).slice(0, 20) // cap at 20 seeds to avoid API over-use
}

/** Get today's date string and 30 days ahead string in YYYY-MM-DD */
function getEventDateRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const future = new Date(now)
  future.setDate(future.getDate() + 30)
  return {
    startDate: now.toISOString().split('T')[0],
    endDate: future.toISOString().split('T')[0],
  }
}

// ---------------------------------------------------------------------------
// Per-user discovery
// ---------------------------------------------------------------------------

async function discoverForUser(
  userId: string,
  naverAdKey: { encrypted_key: string; encrypted_secret: string } | null,
  naverSearchKey: { encrypted_key: string; encrypted_secret: string } | null,
  blogCategories: Array<string | null>
): Promise<Omit<KeywordDiscoverResult, 'userId'>> {
  const errors: string[] = []
  let goldFound = 0
  let eventFound = 0
  let seasonFound = 0
  let totalSaved = 0
  let distributed = 0
  let eventClustersCreated = 0

  const supabase = getServiceClient()

  // Initialize APIs
  const naverAdAPI = new NaverAdAPI()
  const naverDataLabAPI = new NaverDataLabAPI()

  // API 키 복호화
  let decryptedAdKey: { apiKey: string; secretKey: string } | null = null
  let decryptedSearchKey: { apiKey: string; secretKey: string } | null = null

  if (naverAdKey) {
    try {
      decryptedAdKey = {
        apiKey: decrypt(naverAdKey.encrypted_key),
        secretKey: naverAdKey.encrypted_secret ? decrypt(naverAdKey.encrypted_secret) : '',
      }
    } catch { /* decrypt failure */ }
  }
  if (naverSearchKey) {
    try {
      decryptedSearchKey = {
        apiKey: decrypt(naverSearchKey.encrypted_key),
        secretKey: naverSearchKey.encrypted_secret ? decrypt(naverSearchKey.encrypted_secret) : '',
      }
    } catch { /* decrypt failure */ }
  }

  const naverAdReady = decryptedAdKey != null
  const dataLabReady = decryptedSearchKey != null

  if (naverAdReady) {
    naverAdAPI.initializeWithKeys(decryptedAdKey!.apiKey, decryptedAdKey!.secretKey)
  }
  if (dataLabReady) {
    naverDataLabAPI.initializeWithKeys(decryptedSearchKey!.apiKey, decryptedSearchKey!.secretKey)
  }

  // -------------------------------------------------------------------------
  // 1. GOLD keywords — seed from blog categories
  // -------------------------------------------------------------------------
  if (naverAdReady) {
    try {
      const seeds = mergeSeeds(blogCategories)
      const naverResults = await naverAdAPI.getKeywordStats(seeds)

      // Build trendData map with DataLab if available
      const trendDataMap: Record<string, any> = {}
      if (dataLabReady) {
        for (const seed of seeds.slice(0, 5)) { // limit trend calls to 5 seeds
          try {
            trendDataMap[seed] = await naverDataLabAPI.getTrend(seed)
          } catch (err: any) {
            // non-fatal
          }
        }
      }

      const mergedData: KeywordApiData[] = naverResults.map(r => {
        const totalVolume = NaverAdAPI.getTotalSearchVolume(r)
        let competitionIndex: string
        switch (r.compIdx) {
          case '높음': competitionIndex = 'HIGH'; break
          case '중간': competitionIndex = 'MEDIUM'; break
          case '낮음': competitionIndex = 'LOW'; break
          default: competitionIndex = 'MEDIUM'
        }
        const trend = trendDataMap[r.keyword]
        return {
          keyword: r.keyword,
          monthlySearchVolume: totalVolume,
          competitionIndex,
          cpcEstimate: 1500,
          trendIndex: trend?.trendIndex || 50,
          yoyGrowth: trend?.yoyGrowth || 0,
          isSeasonal: trend?.isSeasonal || false,
          seasonalMonths: trend?.seasonalMonths || null,
        }
      })

      const scoredGold = filterByScore(scoreKeywords(mergedData, 'gold'), 60)
      goldFound = scoredGold.length

      if (scoredGold.length > 0) {
        const savedIds = await saveKeywordsToDbWithClient(supabase, userId, scoredGold)
        totalSaved += savedIds.length
      }
    } catch (err: any) {
      errors.push(`Gold discovery error: ${err.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // 2. EVENT keywords — today to 30 days ahead
  // -------------------------------------------------------------------------
  if (dataLabReady) {
    try {
      const { startDate, endDate } = getEventDateRange()
      const eventKeywords = await naverDataLabAPI.getEventKeywords(startDate, endDate)

      if (eventKeywords.length > 0) {
        // Optionally enrich with Naver Ad data
        const adDataMap = new Map<string, { monthlySearchVolume: number; competitionIndex: string; cpcEstimate: number }>()

        if (naverAdReady) {
          try {
            const keywordTexts = eventKeywords.map(ek => ek.keyword)
            const adResults = await naverAdAPI.getKeywordStats(keywordTexts.slice(0, 20))
            for (const result of adResults) {
              const totalVolume = NaverAdAPI.getTotalSearchVolume(result)
              let competitionIndex: string
              switch (result.compIdx) {
                case '높음': competitionIndex = 'HIGH'; break
                case '중간': competitionIndex = 'MEDIUM'; break
                case '낮음': competitionIndex = 'LOW'; break
                default: competitionIndex = 'MEDIUM'
              }
              adDataMap.set(result.keyword, {
                monthlySearchVolume: totalVolume,
                competitionIndex,
                cpcEstimate: 1500,
              })
            }
          } catch (err: any) {
            // graceful degradation
          }
        }

        const scoredEvents = filterByScore(
          scoreKeywords(
            eventKeywords.map((ek): KeywordApiData => {
              const adData = adDataMap.get(ek.keyword)
              return {
                keyword: ek.keyword,
                monthlySearchVolume: adData?.monthlySearchVolume ?? 5000,
                competitionIndex: adData?.competitionIndex ?? 'MEDIUM',
                cpcEstimate: adData?.cpcEstimate ?? 1500,
                trendIndex: 75,
                isSeasonal: false,
              }
            }),
            'event'
          ),
          60
        )

        eventFound = scoredEvents.length
        if (scoredEvents.length > 0) {
          const savedIds = await saveKeywordsToDbWithClient(supabase, userId, scoredEvents)
          totalSaved += savedIds.length
        }
      }
    } catch (err: any) {
      errors.push(`Event discovery error: ${err.message}`)
    }
  }

  // -------------------------------------------------------------------------
  // 3. SEASONAL keywords — current month + next month
  // -------------------------------------------------------------------------
  try {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const months = Array.from(new Set([currentMonth, nextMonth]))

    const allSeasonalKeywords: string[] = []
    for (const month of months) {
      const seasonalEvent = ANNUAL_EVENTS.find(ae => ae.month === month)
      if (seasonalEvent?.events.length) {
        allSeasonalKeywords.push(...seasonalEvent.events)
      }
    }

    if (allSeasonalKeywords.length > 0) {
      // Fetch Naver Ad data for seasonal keywords
      let naverResults: any[] = []
      if (naverAdReady) {
        try {
          naverResults = await naverAdAPI.getKeywordStats(allSeasonalKeywords)
        } catch (err: any) {
          // graceful degradation
        }
      }

      // Fetch trend data for seasonal keywords
      const trendDataMap: Record<string, any> = {}
      if (dataLabReady) {
        for (const kw of allSeasonalKeywords.slice(0, 5)) {
          try {
            trendDataMap[kw] = await naverDataLabAPI.getTrend(kw)
          } catch (err: any) {
            // non-fatal
          }
        }
      }

      const mergedData: KeywordApiData[] = allSeasonalKeywords.map(kw => {
        const naver = naverResults.find(r => r.keyword === kw)
        const trend = trendDataMap[kw]
        const totalVolume = naver ? NaverAdAPI.getTotalSearchVolume(naver) : 0
        let competitionIndex = 'MEDIUM'
        if (naver?.compIdx === '높음') competitionIndex = 'HIGH'
        else if (naver?.compIdx === '낮음') competitionIndex = 'LOW'

        return {
          keyword: kw,
          monthlySearchVolume: totalVolume || 8000,
          competitionIndex,
          cpcEstimate: 1200,
          trendIndex: trend?.trendIndex || 70,
          yoyGrowth: trend?.yoyGrowth || 0,
          isSeasonal: trend?.isSeasonal || true,
          seasonalMonths: trend?.seasonalMonths || [currentMonth],
        }
      })

      const scoredSeasonal = filterByScore(scoreKeywords(mergedData, 'seasonal'), 60)
      seasonFound = scoredSeasonal.length

      if (scoredSeasonal.length > 0) {
        const savedIds = await saveKeywordsToDbWithClient(supabase, userId, scoredSeasonal)
        totalSaved += savedIds.length
      }
    }
  } catch (err: any) {
    errors.push(`Seasonal discovery error: ${err.message}`)
  }

  // -------------------------------------------------------------------------
  // 4. EVENT CLUSTERS — D-Day based keyword scheduling
  // -------------------------------------------------------------------------
  try {
    const eventAPI = new EventAPI(userId)
    // Use service role client — no user session available in cron context
    await eventAPI.initializeWithClient(supabase)
    const externalEvents = await eventAPI.fetchAllEvents()

    // Convert ExternalEvent to EventInput for cluster engine
    // Only keep events with a known date so scheduledDate can be computed
    const eventInputs = externalEvents
      .filter(e => e.date != null)
      .map(e => ({
        title: e.title,
        date: e.date!,
        category: e.category,
        venue: e.venue,
        source: e.source,
      }))

    if (eventInputs.length > 0) {
      const clusters = createEventClusters(eventInputs)

      // Collect all cluster keywords that have a future scheduledDate
      const today = new Date().toISOString().split('T')[0]
      const allClusterKeywords: EventClusterKeyword[] = clusters
        .flatMap(c => c.keywords)
        .filter(k => k.scheduledDate >= today)

      eventClustersCreated = clusters.length

      if (allClusterKeywords.length > 0) {
        // Get user's active blogs to find a matching one per cluster keyword
        const { data: userBlogs } = await supabase
          .from('blogs')
          .select('id, primary_ad_category')
          .eq('user_id', userId)
          .eq('is_active', true)

        const blogs = userBlogs ?? []

        // Pick a blog for each cluster keyword (round-robin across active blogs)
        // Prefer blog whose category matches the event category
        const categoryToBlogId = (eventCategory: string): string | null => {
          if (blogs.length === 0) return null
          // Map event category to blog ad_category hints
          const categoryHints: Record<string, string[]> = {
            concert: ['entertainment', 'music', 'lifestyle'],
            sports: ['sports', 'health', 'fitness'],
            festival: ['entertainment', 'travel', 'lifestyle'],
            exhibition: ['education', 'entertainment', 'culture'],
            other: [],
          }
          const hints = categoryHints[eventCategory] ?? []
          const matched = blogs.find(b =>
            b.primary_ad_category != null &&
            hints.some(h => b.primary_ad_category!.toLowerCase().includes(h))
          )
          return matched?.id ?? blogs[0].id
        }

        // Insert scheduled_posts entries directly for event cluster keywords
        const scheduledPostInserts = allClusterKeywords.map((ck, idx) => {
          const blogId = categoryToBlogId(
            // Derive category from the cluster's event (best-effort via title lookup)
            eventInputs.find(ei =>
              ck.keyword.startsWith(ei.title)
            )?.category ?? 'other'
          )

          // Time: spread across 09:00–17:00 in 30-min slots
          const hour = 9 + Math.floor((idx % 16) / 2)
          const minute = (idx % 2) * 30
          const scheduledTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

          return {
            blog_id: blogId,
            keyword_id: null as string | null,
            scheduled_date: ck.scheduledDate,
            scheduled_time: scheduledTime,
            status: 'pending' as const,
            writing_mode: 'auto' as const,
            intent_type: ck.intentType as string,
            intent_fit_score: ck.priority / 10, // normalise 0-10 → 0-1
            // Store the keyword text in content_draft so the AI writer can use it
            content_draft: ck.keyword,
          }
        }).filter(p => p.blog_id != null)

        if (scheduledPostInserts.length > 0) {
          const { error: insertError } = await supabase
            .from('scheduled_posts')
            .insert(scheduledPostInserts)

          if (insertError) {
            errors.push(`Event cluster scheduled_posts insert error: ${insertError.message}`)
          }
        }
      }
    }
  } catch (err: any) {
    errors.push(`Event cluster error: ${err.message}`)
  }

  // -------------------------------------------------------------------------
  // 5. DISTRIBUTE — assign recently discovered keywords to blogs
  // -------------------------------------------------------------------------
  try {
    // Fetch keywords that have not yet been assigned to any blog
    // (no row in blog_keyword_assignments for this keyword + user_id combo)
    const { data: allUserKeywords } = await supabase
      .from('keywords')
      .select('id')
      .eq('user_id', userId)

    const allKeywordIds = (allUserKeywords ?? []).map(k => k.id)

    let unassignedKeywordIds: string[] = allKeywordIds

    if (allKeywordIds.length > 0) {
      // Find which keyword_ids already have an assignment
      const { data: existingAssignments } = await supabase
        .from('blog_keyword_assignments')
        .select('keyword_id')
        .in('keyword_id', allKeywordIds)

      const assignedSet = new Set((existingAssignments ?? []).map(a => a.keyword_id))
      unassignedKeywordIds = allKeywordIds.filter(id => !assignedSet.has(id))
    }

    if (unassignedKeywordIds.length === 0) {
      // Nothing to distribute
    } else {
      // Fetch full keyword data for unassigned keywords, ordered by revenue_score descending
      const { data: unassignedKeywords } = await supabase
        .from('keywords')
        .select('id, keyword, keyword_grade, intent_type, revenue_score, monthly_search_volume, competition_score, cpc_estimate, trend_index')
        .in('id', unassignedKeywordIds)
        .order('revenue_score', { ascending: false })
        .limit(50)

      // Get user's active blogs
      const { data: userBlogs } = await supabase
        .from('blogs')
        .select('id, name, grade, primary_ad_category, language, is_warned, daily_quota')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (unassignedKeywords?.length && userBlogs?.length) {
        const blogInfos = userBlogs.map(b => ({
          id: b.id,
          name: b.name,
          grade: (b.grade || 'C') as Grade,
          category: b.primary_ad_category ?? undefined,
          language: b.language ?? undefined,
          isWarned: b.is_warned || false,
          dailyLimit: b.daily_quota || 3,
        }))

        const keywordsForDistribution = unassignedKeywords.map(k => ({
          id: k.id,
          keyword: k.keyword,
          keywordGrade: (k.keyword_grade || 'C') as Grade,
          intentType: (k.intent_type || 'INFO') as IntentType,
          revenueScore: k.revenue_score || 0,
          monthlySearchVolume: k.monthly_search_volume || 0,
          competitionScore: k.competition_score || 0,
          cpcEstimate: k.cpc_estimate || 0,
          trendIndex: k.trend_index || 0,
          // Required fields for Keyword type
          userId,
          keywordType: 'gold' as const,
          isSeasonal: false,
          seasonalMonths: null,
          expiresAt: null,
          createdAt: new Date().toISOString(),
        }))

        // Run distribution with service-role client so DB writes succeed in cron context
        const assignments = await distributeKeywords({
          userId,
          keywords: keywordsForDistribution,
          blogs: blogInfos,
          preview: false,
          supabaseClient: supabase,
        })

        distributed = assignments.length
      }
    }
  } catch (err: any) {
    errors.push(`Distribution error: ${err.message}`)
  }

  return { goldFound, eventFound, seasonFound, totalSaved, distributed, eventClustersCreated, errors }
}

// ---------------------------------------------------------------------------
// Main pipeline entry point
// ---------------------------------------------------------------------------

export async function runKeywordDiscoverPipeline(): Promise<KeywordDiscoverResult[]> {
  const supabase = getServiceClient()
  const results: KeywordDiscoverResult[] = []

  // Get all users who have at least one active Naver API key (ad or search)
  const { data: activeKeys, error: keysError } = await supabase
    .from('ai_api_keys')
    .select('user_id, provider, encrypted_key, encrypted_secret')
    .in('provider', ['naver_ad', 'naver_search'])
    .eq('is_active', true)

  if (keysError) {
    console.error('[KeywordDiscover] Failed to fetch API keys:', keysError)
    throw new Error(`Failed to fetch active API keys: ${keysError.message}`)
  }

  if (!activeKeys || activeKeys.length === 0) {
    console.log('[KeywordDiscover] No users with active Naver API keys found')
    return results
  }

  // Group keys by user
  const userKeyMap = new Map<string, {
    naver_ad: { encrypted_key: string; encrypted_secret: string } | null
    naver_search: { encrypted_key: string; encrypted_secret: string } | null
  }>()

  for (const key of activeKeys) {
    if (!userKeyMap.has(key.user_id)) {
      userKeyMap.set(key.user_id, { naver_ad: null, naver_search: null })
    }
    const entry = userKeyMap.get(key.user_id)!
    if (key.provider === 'naver_ad') {
      entry.naver_ad = { encrypted_key: key.encrypted_key, encrypted_secret: key.encrypted_secret || '' }
    } else if (key.provider === 'naver_search') {
      entry.naver_search = { encrypted_key: key.encrypted_key, encrypted_secret: key.encrypted_secret || '' }
    }
  }

  const userIds = Array.from(userKeyMap.keys())

  // Filter to only users who have auto_discover = true in keyword_settings
  const { data: enabledSettings } = await supabase
    .from('keyword_settings')
    .select('user_id')
    .in('user_id', userIds)
    .eq('auto_discover', true)

  const enabledUserIds = new Set((enabledSettings ?? []).map((s: { user_id: string }) => s.user_id))
  const filteredUserIds = userIds.filter(id => enabledUserIds.has(id))

  if (filteredUserIds.length === 0) {
    console.log('[KeywordDiscover] No users with auto_discover enabled')
    return results
  }

  // Fetch blog categories for all filtered users in one query
  const { data: blogs } = await supabase
    .from('blogs')
    .select('user_id, primary_ad_category')
    .in('user_id', filteredUserIds)
    .eq('is_active', true)

  const userBlogCategoriesMap = new Map<string, Array<string | null>>()
  for (const blog of blogs ?? []) {
    if (!userBlogCategoriesMap.has(blog.user_id)) {
      userBlogCategoriesMap.set(blog.user_id, [])
    }
    userBlogCategoriesMap.get(blog.user_id)!.push(blog.primary_ad_category ?? null)
  }

  // Process each user independently (only auto_discover-enabled users)
  for (const userId of filteredUserIds) {
    const keys = userKeyMap.get(userId)!
    try {
      const blogCategories = userBlogCategoriesMap.get(userId) ?? [null]
      const userResult = await discoverForUser(
        userId,
        keys.naver_ad,
        keys.naver_search,
        blogCategories
      )
      results.push({ userId, ...userResult })
    } catch (err: any) {
      console.error(`[KeywordDiscover] Error processing user ${userId}:`, err)
      results.push({
        userId,
        goldFound: 0,
        eventFound: 0,
        seasonFound: 0,
        totalSaved: 0,
        distributed: 0,
        eventClustersCreated: 0,
        errors: [err.message],
      })
    }
  }

  return results
}
