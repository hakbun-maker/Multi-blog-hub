/**
 * Scout 에이전트 — 키워드 자동 발굴
 * 골드/이벤트/시즌 키워드를 발굴하여 keyword_pipeline에 'discovered' 단계로 등록합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { EventAPI } from '@/lib/monetize/apis/event-api'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'
import type { AgentRunResult } from './types'

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

export async function runScoutAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'scout', async () => {
    const supabase = getServiceClient()
    let goldFound = 0
    let eventFound = 0
    let seasonFound = 0

    // 1. 사용자의 블로그 카테고리 가져오기
    const { data: blogs } = await supabase
      .from('blogs')
      .select('primary_ad_category')
      .eq('user_id', userId)
      .eq('is_active', true)

    const categories = (blogs ?? []).map(b => b.primary_ad_category).filter(Boolean)
    const seeds = new Set<string>()
    for (const cat of categories) {
      const normalized = (cat ?? '').toLowerCase()
      for (const [key, seedList] of Object.entries(CATEGORY_SEEDS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          seedList.forEach(s => seeds.add(s))
        }
      }
    }
    if (seeds.size === 0) GENERIC_SEEDS.forEach(s => seeds.add(s))

    // API 키 조회
    const { data: apiKeys } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key, encrypted_secret')
      .eq('user_id', userId)
      .in('provider', ['naver_ad', 'naver_search'])
      .eq('is_active', true)

    const naverAdKey = apiKeys?.find(k => k.provider === 'naver_ad')
    const naverSearchKey = apiKeys?.find(k => k.provider === 'naver_search')

    // 기존 파이프라인 키워드 텍스트 (중복 방지)
    const { data: existingPipeline } = await supabase
      .from('keyword_pipeline')
      .select('keyword_text')
      .eq('user_id', userId)

    const existingSet = new Set((existingPipeline ?? []).map(p => p.keyword_text))

    // 2. Gold 키워드 발굴 (네이버 광고 API)
    if (naverAdKey) {
      try {
        const naverAd = new NaverAdAPI()
        naverAd.initializeWithKeys(naverAdKey.encrypted_key, naverAdKey.encrypted_secret)
        const results = await naverAd.getKeywordStats(Array.from(seeds).slice(0, 15))

        const newKeywords = results
          .filter(r => !existingSet.has(r.keyword))
          .slice(0, 30)

        if (newKeywords.length > 0) {
          const rows = newKeywords.map(r => ({
            user_id: userId,
            keyword_text: r.keyword,
            keyword_type: 'gold',
            stage: 'discovered',
            monthly_search_volume: NaverAdAPI.getTotalSearchVolume(r),
          }))
          await supabase.from('keyword_pipeline').insert(rows)
          goldFound = newKeywords.length
          newKeywords.forEach(r => existingSet.add(r.keyword))
        }
      } catch (err) {
        console.error('[Scout] Gold discovery error:', err)
      }
    }

    // 3. 이벤트 키워드 발굴 (공연/경기/축제)
    try {
      const eventAPI = new EventAPI(userId)
      await eventAPI.initializeWithClient(supabase)
      const events = await eventAPI.fetchAllEvents()

      const eventKeywords = events
        .filter(e => e.date && e.dDay !== null && e.dDay >= -3 && e.dDay <= 60)
        .flatMap(e => e.keywords.map(kw => ({
          keyword: kw,
          eventTitle: e.title,
          eventDate: e.date!,
          dDay: e.dDay!,
          category: e.category,
        })))
        .filter(ek => !existingSet.has(ek.keyword))
        .slice(0, 30)

      if (eventKeywords.length > 0) {
        const rows = eventKeywords.map(ek => ({
          user_id: userId,
          keyword_text: ek.keyword,
          keyword_type: 'event',
          stage: 'discovered',
          event_title: ek.eventTitle,
          event_date: ek.eventDate,
          event_d_day: ek.dDay,
        }))
        await supabase.from('keyword_pipeline').insert(rows)
        eventFound = eventKeywords.length
        eventKeywords.forEach(ek => existingSet.add(ek.keyword))
      }
    } catch (err) {
      console.error('[Scout] Event discovery error:', err)
    }

    // 4. 시즌 키워드 발굴
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

      const seasonalKeywords: string[] = []
      for (const month of [currentMonth, nextMonth]) {
        const ae = ANNUAL_EVENTS.find(a => a.month === month)
        if (ae) seasonalKeywords.push(...ae.events)
      }

      const newSeasonal = seasonalKeywords
        .filter(kw => !existingSet.has(kw))
        .slice(0, 15)

      if (newSeasonal.length > 0) {
        const rows = newSeasonal.map(kw => ({
          user_id: userId,
          keyword_text: kw,
          keyword_type: 'seasonal',
          stage: 'discovered',
        }))
        await supabase.from('keyword_pipeline').insert(rows)
        seasonFound = newSeasonal.length
      }
    } catch (err) {
      console.error('[Scout] Seasonal discovery error:', err)
    }

    return { goldFound, eventFound, seasonFound, total: goldFound + eventFound + seasonFound }
  })
}
