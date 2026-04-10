/**
 * Scout 에이전트 — 키워드 자동 발굴
 *
 * 핵심 원칙:
 * 1. 블로그의 blog_type을 기준으로 해당 분야의 롱테일 키워드를 발굴
 * 2. 시즌 키워드는 블로그 카테고리와 결합하여 관련성 있는 것만 발굴
 * 3. 네이버 광고 API에서 실제 검색량이 확인된 키워드만 파이프라인에 등록
 * 4. API 데이터 없는 키워드는 절대 등록하지 않음
 */
import { getServiceClient, runAgent } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { EventAPI } from '@/lib/monetize/apis/event-api'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'
import { decrypt } from '@/lib/utils/encryption'
import type { AgentRunResult } from './types'

// ─── blog_type별 시드 키워드 (DB의 blog_type 값과 정확히 일치) ────────────
// 네이버 광고 API의 hintKeywords로 사용되어 연관 키워드를 받아옵니다.
// 네이버 SearchAd API hintKeywords는 공백을 허용하지 않으므로
// 핵심 단어 1~2개로 시드를 구성 (API가 연관 키워드를 알아서 반환함)
const BLOG_TYPE_SEEDS: Record<string, string[]> = {
  'entertainment': ['넷플릭스', '뮤지컬', '콘서트', '웹툰', 'OTT'],
  'medical': ['건강검진', '혈압', '비타민', '갑상선', '다이어트'],
  'finance': ['주식', '적금', '연금저축', 'ETF', '재테크'],
  'real-estate': ['전세', '부동산', '분양', '재개발', '아파트'],
  'it-tech': ['노트북', '프로그래밍', '코딩', '스마트폰', 'AI'],
  'food': ['레시피', '에어프라이어', '밀키트', '맛집', '다이어트식단'],
  'travel': ['제주도', '여행', '글램핑', '캠핑', '항공권'],
  'beauty-fashion': ['스킨케어', '선크림', '안티에이징', '올리브영', '코디'],
  'parenting': ['육아', '이유식', '어린이보험', '학습지', '수면교육'],
  'pets': ['강아지사료', '고양이모래', '반려동물보험', '강아지훈련', '고양이'],
  'education': ['토익', '자격증', '영어회화', '공무원', '코딩교육'],
  'sports': ['홈트레이닝', '런닝화', '골프', '등산', '수영'],
  'lifestyle': ['인테리어', '공기청정기', '음식물처리기', '이사', '선물'],
  'automotive': ['전기차', '중고차', '자동차보험', '타이어', '하이브리드'],
}

// ─── blog_type별 시즌 키워드 시드 (시즌 이벤트 × 블로그 주제 교차) ──────────
// "어버이날" + medical → "어버이날 건강검진 선물" 같은 맥락적 시드
// 시즌 × 카테고리 교차 시드 (공백 없는 단어로 구성)
const SEASONAL_CROSS_SEEDS: Record<string, Record<string, string[]>> = {
  'medical': {
    '어버이날': ['어버이날건강선물', '영양제추천', '부모님건강검진'],
    '어린이날': ['어린이영양제', '어린이건강검진'],
    '봄나들이': ['봄철알레르기', '황사마스크', '봄운동'],
    '겨울여행': ['면역력강화', '독감예방접종'],
    '여름휴가': ['식중독예방', '열사병증상'],
    '설날': ['소화불량', '명절건강'],
    '추석': ['추석건강관리', '명절다이어트'],
  },
  'finance': {
    '설날': ['세뱃돈재테크', '재무목표'],
    '근로자의날': ['주식시장휴장', '공모주일정'],
    '블랙프라이데이': ['해외주식', '연말절세'],
    '어버이날': ['효도보험', '부모님용돈'],
    '봄나들이': ['여행자보험', '소비절약'],
    '수능': ['등록금마련', '학자금대출'],
  },
  'real-estate': {
    '봄나들이': ['봄이사철', '전세시세', '이사비용'],
    '설날': ['부동산전망', '분양일정'],
    '겨울여행': ['부동산매매', '겨울인테리어'],
    '어버이날': ['실버타운', '리모델링비용'],
    '여름휴가': ['전세이동', '하반기부동산'],
  },
  'entertainment': {
    '코첼라': ['코첼라라인업', '코첼라일정'],
    '어린이날': ['어린이날공연', '어린이뮤지컬'],
    '크리스마스': ['크리스마스공연', '연말콘서트'],
    '핼러윈': ['핼러윈파티', '핼러윈이벤트'],
    '봄나들이': ['봄페스티벌', '봄전시회'],
    '여름휴가': ['여름페스티벌', '워터밤'],
  },
}

/**
 * 블로그의 blog_type과 설명에서 시드 키워드를 추출합니다.
 * blog_type을 우선으로 사용하고, 설명에서 보조 시드를 추출합니다.
 */
function extractSeedsFromBlog(blog: {
  name: string
  description: string | null
  blog_type: string | null
}): string[] {
  const seeds: string[] = []

  // 1. blog_type 기반 시드 (가장 중요)
  const blogType = blog.blog_type ?? ''
  if (blogType && BLOG_TYPE_SEEDS[blogType]) {
    seeds.push(...BLOG_TYPE_SEEDS[blogType])
  }

  // 2. 블로그 설명에서 보조 시드 추출
  const desc = blog.description ?? ''
  const combined = `${blog.name} ${desc}`.toLowerCase()
  const koreanWords = combined.match(/[가-힣]{2,}/g) ?? []
  const stopWords = new Set(['블로그', '전문', '관련', '정보', '소개', '대한', '위한', '모든', '최신', '대해', '연구', '것들', '하며', '배우고', '남기는', '소소한'])
  const meaningfulWords = koreanWords.filter(w => !stopWords.has(w) && w.length >= 2)

  // 핵심 단어로 조합 (공백 없이 붙여서 — API가 공백 불허)
  const suffixes = ['추천', '비교', '방법', '후기', '가격']
  for (const word of meaningfulWords.slice(0, 3)) {
    for (const suffix of suffixes.slice(0, 2)) {
      seeds.push(`${word}${suffix}`)
    }
  }

  return Array.from(new Set(seeds)).slice(0, 15)
}

/**
 * 시즌 키워드를 블로그 카테고리와 교차하여 생성합니다.
 * "어버이날" + medical블로그 → "어버이날 건강검진 선물"
 */
function getSeasonalSeedsForBlogType(blogType: string, seasonalBase: string[]): string[] {
  const crossSeeds = SEASONAL_CROSS_SEEDS[blogType]
  if (!crossSeeds) return []

  const seeds: string[] = []
  for (const event of seasonalBase) {
    const eventSeeds = crossSeeds[event]
    if (eventSeeds) seeds.push(...eventSeeds)
  }
  return seeds
}

export async function runScoutAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'scout', async () => {
    const supabase = getServiceClient()
    let goldFound = 0
    let eventFound = 0
    let seasonFound = 0
    // 디버그 정보 수집 (API 응답에 포함하여 원인 추적)
    const _debug: Record<string, unknown> = {}
    const _errors: string[] = []

    // 1. 사용자의 블로그 목록 (blog_type 포함!)
    const { data: blogs, error: blogsError } = await supabase
      .from('blogs')
      .select('id, name, description, primary_ad_category, blog_type, language')
      .eq('user_id', userId)
      .eq('is_active', true)

    _debug.blogsCount = blogs?.length ?? 0
    _debug.blogsError = blogsError?.message ?? null
    _debug.blogs = blogs?.map(b => ({ name: b.name, type: b.blog_type, lang: b.language })) ?? []

    if (!blogs || blogs.length === 0) {
      return { goldFound: 0, eventFound: 0, seasonFound: 0, total: 0, _debug, _errors }
    }

    // 한국어 블로그만 키워드 발굴 대상 (외국어 블로그는 번역 단계에서 처리)
    const koBlogsWithType = blogs.filter(b => (b.language === 'ko' || !b.language) && b.blog_type)
    _debug.koBlogsWithTypeCount = koBlogsWithType.length

    if (koBlogsWithType.length === 0) {
      _errors.push('blog_type이 설정된 한국어 블로그가 없음')
      return { goldFound: 0, eventFound: 0, seasonFound: 0, total: 0, _debug, _errors }
    }

    // blog_type별로 시드 키워드 그룹화
    const seedsByType = new Map<string, string[]>()
    for (const blog of koBlogsWithType) {
      const seeds = extractSeedsFromBlog(blog)
      const existing = seedsByType.get(blog.blog_type!) ?? []
      seedsByType.set(blog.blog_type!, Array.from(new Set([...existing, ...seeds])))
    }
    _debug.seedsByType = Object.fromEntries(Array.from(seedsByType.entries()).map(([k, v]) => [k, v.slice(0, 5)]))

    // API 키 조회
    const { data: apiKeys, error: apiKeysError } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key, encrypted_secret, encrypted_extra')
      .eq('user_id', userId)
      .in('provider', ['naver_ad', 'naver_search'])
      .eq('is_active', true)

    _debug.apiKeysCount = apiKeys?.length ?? 0
    _debug.apiKeysError = apiKeysError?.message ?? null
    _debug.apiProviders = apiKeys?.map(k => k.provider) ?? []

    const naverAdKeyRaw = apiKeys?.find(k => k.provider === 'naver_ad')
    _debug.hasNaverAdKey = !!naverAdKeyRaw
    _debug.hasEncryptedExtra = !!(naverAdKeyRaw?.encrypted_extra)

    let naverAdKey: { apiKey: string; secretKey: string; extraKey: string } | null = null
    if (naverAdKeyRaw) {
      try {
        naverAdKey = {
          apiKey: decrypt(naverAdKeyRaw.encrypted_key),
          secretKey: naverAdKeyRaw.encrypted_secret ? decrypt(naverAdKeyRaw.encrypted_secret) : '',
          extraKey: naverAdKeyRaw.encrypted_extra ? decrypt(naverAdKeyRaw.encrypted_extra) : '',
        }
        _debug.decryptSuccess = true
        _debug.hasCustomerId = !!naverAdKey.extraKey
      } catch (err: any) {
        _debug.decryptSuccess = false
        _errors.push(`API 키 복호화 실패: ${err.message}`)
      }
    }

    if (!naverAdKey) {
      _errors.push('네이버 광고 API 키가 없거나 복호화 실패')
      return { goldFound: 0, eventFound: 0, seasonFound: 0, total: 0, _debug, _errors }
    }

    // 기존 파이프라인 키워드 (중복 방지)
    const { data: existingPipeline } = await supabase
      .from('keyword_pipeline')
      .select('keyword_text')
      .eq('user_id', userId)

    const existingSet = new Set((existingPipeline ?? []).map(p => p.keyword_text))
    _debug.existingKeywords = existingSet.size

    // ──────────────────────────────────────────────
    // 2. Gold 키워드 발굴 — blog_type별로 네이버 API 호출
    // ──────────────────────────────────────────────
    const naverAd = new NaverAdAPI()
    naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.extraKey)
    let firstCallDone = false
    for (const [blogType, seeds] of Array.from(seedsByType.entries())) {
      try {
        const results = await naverAd.getKeywordStats(seeds.slice(0, 5))
        _debug[`gold_${blogType}_apiResults`] = results.length
        _debug[`gold_${blogType}_seeds`] = seeds.slice(0, 5)

        // API 호출의 raw 응답/에러 기록
        if (!firstCallDone) {
          _debug.firstApiRawResponse = (naverAd as any)._lastRawResponse ?? 'no_raw_response'
          _debug.apiInternalErrors = (naverAd as any)._lastErrors ?? []
          firstCallDone = true
        }

        const newKeywords = results
          .filter(r => !existingSet.has(r.keyword))
          .filter(r => r.monthlySearchVolume >= 100)
          .slice(0, 30)

        _debug[`gold_${blogType}_newKeywords`] = newKeywords.length

        if (newKeywords.length > 0) {
          const rows = newKeywords.map(r => ({
            user_id: userId,
            keyword_text: r.keyword,
            keyword_type: 'gold' as const,
            stage: 'discovered' as const,
            monthly_search_volume: r.monthlySearchVolume,
          }))
          await supabase.from('keyword_pipeline').insert(rows)
          goldFound += newKeywords.length
          newKeywords.forEach(r => existingSet.add(r.keyword))
        }
      } catch (err: any) {
        _errors.push(`Gold(${blogType}): ${err.message}`)
        _debug[`gold_${blogType}_error`] = err.message
      }
    }

    // ──────────────────────────────────────────────
    // 3. 이벤트 키워드 발굴 (공연/경기/축제)
    // ──────────────────────────────────────────────
    try {
      const eventAPI = new EventAPI(userId)
      await eventAPI.initializeWithClient(supabase)
      const events = await eventAPI.fetchAllEvents()

      const eventKeywords = events
        .filter(e => e.date && e.dDay !== null && e.dDay >= -3 && e.dDay <= 60)
        .flatMap(e => e.keywords.slice(0, 3).map(kw => ({
          keyword: kw,
          eventTitle: e.title,
          eventDate: e.date!,
          dDay: e.dDay!,
        })))
        .filter(ek => !existingSet.has(ek.keyword))
        .slice(0, 20)

      if (eventKeywords.length > 0) {
        const rows = eventKeywords.map(ek => ({
          user_id: userId,
          keyword_text: ek.keyword,
          keyword_type: 'event' as const,
          stage: 'discovered' as const,
          event_title: ek.eventTitle,
          event_date: ek.eventDate,
          event_d_day: ek.dDay,
        }))
        await supabase.from('keyword_pipeline').insert(rows)
        eventFound = eventKeywords.length
        eventKeywords.forEach(ek => existingSet.add(ek.keyword))
      }
    } catch (err: any) {
      _errors.push(`Event: ${err.message}`)
    }

    // ──────────────────────────────────────────────
    // 4. 시즌 키워드 — 블로그 카테고리 × 시즌 이벤트 교차
    //    "어버이날" + medical → "어버이날 건강검진 선물"
    //    API에서 실제 검색량 확인된 것만 등록
    // ──────────────────────────────────────────────
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

      const seasonalBase: string[] = []
      for (const month of [currentMonth, nextMonth]) {
        const ae = ANNUAL_EVENTS.find(a => a.month === month)
        if (ae) seasonalBase.push(...ae.events)
      }

      if (seasonalBase.length > 0) {
        // blog_type별로 시즌 × 카테고리 교차 시드 생성
        const allSeasonalSeeds = new Set<string>()
        for (const blog of koBlogsWithType) {
          const crossSeeds = getSeasonalSeedsForBlogType(blog.blog_type!, seasonalBase)
          crossSeeds.forEach(s => allSeasonalSeeds.add(s))
        }

        if (allSeasonalSeeds.size > 0) {
          const seedArray = Array.from(allSeasonalSeeds)
          // 5개씩 배치로 API 호출
          for (let i = 0; i < seedArray.length; i += 5) {
            try {
              const batch = seedArray.slice(i, i + 5)
              const seasonResults = await naverAd.getKeywordStats(batch)

              const validSeasonal = seasonResults
                .filter(r => !existingSet.has(r.keyword))
                .filter(r => r.monthlySearchVolume >= 100)

              if (validSeasonal.length > 0) {
                const rows = validSeasonal.map(r => ({
                  user_id: userId,
                  keyword_text: r.keyword,
                  keyword_type: 'seasonal' as const,
                  stage: 'discovered' as const,
                  monthly_search_volume: r.monthlySearchVolume,
                }))
                await supabase.from('keyword_pipeline').insert(rows)
                seasonFound += validSeasonal.length
                validSeasonal.forEach(r => existingSet.add(r.keyword))
              }
            } catch (err: any) {
              _errors.push(`Seasonal batch: ${err.message}`)
            }
          }
        }
      }
    } catch (err: any) {
      _errors.push(`Seasonal: ${err.message}`)
    }

    return { goldFound, eventFound, seasonFound, total: goldFound + eventFound + seasonFound, _debug, _errors }
  })
}
