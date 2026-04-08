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
const BLOG_TYPE_SEEDS: Record<string, string[]> = {
  'entertainment': ['넷플릭스 신작 추천', 'OTT 비교 가격', '뮤지컬 추천', 'K-POP 컴백', '웹툰 완결 추천'],
  'medical': ['건강검진 항목', '혈압 낮추는 방법', '비타민D 효능', '중년 운동 루틴', '갑상선 증상'],
  'finance': ['ISA 계좌 장단점', '주식 초보 종목 추천', '월배당 ETF 비교', '연금저축 세액공제', '적금 금리 비교'],
  'real-estate': ['아파트 전세 시세', '부동산 전망 2026', '신축 분양 정보', '전세자금 대출', '재개발 투자'],
  'it-tech': ['AI 도구 추천', '노트북 가성비 순위', '프로그래밍 독학', '무료 앱 추천', '코딩 부트캠프'],
  'food': ['집밥 레시피', '에어프라이어 요리', '밀키트 추천', '다이어트 식단', '편의점 신상'],
  'travel': ['제주도 숨은 명소', '일본 여행 경비', '국내 글램핑 추천', '유럽 자유여행 코스', '비행기표 저렴'],
  'beauty-fashion': ['수분크림 추천', '선크림 성분 비교', '40대 안티에이징', '봄 코디 추천', '올리브영 세일'],
  'parenting': ['유아 영어 교육', '이유식 시작 가이드', '어린이 보험 비교', '초등 학습지 추천', '아기 수면교육'],
  'pets': ['강아지 사료 등급', '고양이 모래 추천', '반려동물 보험', '강아지 훈련 방법', '고양이 구토 원인'],
  'education': ['토익 독학 공부법', 'IT 자격증 순위', '영어회화 앱 추천', '공무원 시험 과목', '코딩 자격증'],
  'sports': ['홈트레이닝 루틴', '런닝화 추천 순위', '골프 입문 비용', '등산 코스 서울 근교', '수영 칼로리'],
  'lifestyle': ['원룸 인테리어 꿀팁', '공기청정기 추천', '음식물 처리기 비교', '이사 체크리스트', '선물 추천'],
  'automotive': ['전기차 보조금 2026', '중고차 시세', '자동차 보험 비교', '타이어 교체 시기', '하이브리드 SUV'],
}

// ─── blog_type별 시즌 키워드 시드 (시즌 이벤트 × 블로그 주제 교차) ──────────
// "어버이날" + medical → "어버이날 건강검진 선물" 같은 맥락적 시드
const SEASONAL_CROSS_SEEDS: Record<string, Record<string, string[]>> = {
  'medical': {
    '어버이날': ['어버이날 건강검진 선물', '50대 영양제 추천', '부모님 건강선물'],
    '어린이날': ['어린이 성장 영양제', '어린이 건강검진'],
    '봄나들이': ['봄철 알레르기 증상', '황사 건강관리', '봄철 운동 시작'],
    '겨울여행': ['겨울철 면역력 높이는 방법', '독감 예방접종 시기'],
    '여름휴가': ['여름철 식중독 예방', '열사병 증상 대처법'],
    '설날': ['명절 소화불량', '설날 건강음식'],
    '추석': ['추석 명절 건강관리', '추석 다이어트'],
  },
  'finance': {
    '설날': ['설날 세뱃돈 재테크', '새해 재무목표 세우기'],
    '근로자의날': ['근로자의날 주식시장', '5월 공모주 일정'],
    '블랙프라이데이': ['블랙프라이데이 해외주식', '연말 절세 전략'],
    '어버이날': ['부모님 용돈 관리', '효도 보험 추천'],
    '봄나들이': ['봄 소비 절약법', '여행자보험 비교'],
    '수능': ['대학 등록금 마련', '학자금 대출 조건'],
  },
  'real-estate': {
    '봄나들이': ['봄 이사철 전세 시세', '이사 비용 절약'],
    '설날': ['신년 부동산 전망', '1분기 분양 일정'],
    '겨울여행': ['연말 부동산 매매 동향', '겨울 인테리어'],
    '어버이날': ['부모님 집 리모델링', '실버타운 비용'],
    '여름휴가': ['여름 전세 이동 시즌', '하반기 부동산 전망'],
  },
  'entertainment': {
    '코첼라': ['코첼라 라인업', '코첼라 페스티벌 일정'],
    '어린이날': ['어린이날 공연 추천', '어린이 뮤지컬'],
    '크리스마스': ['크리스마스 공연', '연말 콘서트'],
    '핼러윈': ['핼러윈 파티 이벤트', '핼러윈 공연'],
    '봄나들이': ['봄 페스티벌 일정', '봄 전시회 추천'],
    '여름휴가': ['여름 음악 페스티벌', '워터밤 일정'],
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

  // 핵심 단어로 롱테일 조합 (최대 3개 단어 × 2개 서픽스)
  const suffixes = ['추천', '비교', '방법', '후기', '가격']
  for (const word of meaningfulWords.slice(0, 3)) {
    for (const suffix of suffixes.slice(0, 2)) {
      seeds.push(`${word} ${suffix}`)
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

    for (const [blogType, seeds] of Array.from(seedsByType.entries())) {
      try {
        const results = await naverAd.getKeywordStats(seeds.slice(0, 5))
        _debug[`gold_${blogType}_apiResults`] = results.length
        _debug[`gold_${blogType}_seeds`] = seeds.slice(0, 5)

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
