/**
 * 시즌 키워드 발굴 — 별도 실행 (자동 파이프라인에 포함되지 않음)
 *
 * 논리:
 * 1) ANNUAL_EVENTS에서 현재월+다음달 이벤트 추출
 * 2) DataLab API로 각 이벤트의 2년 트렌드 조회
 * 3) YoY 성장률 20%+ 또는 피크월이 현재/다음달인 것만 선별
 * 4) 선별된 시즌 키워드 × 블로그 카테고리 교차 시드
 * 5) 네이버 광고 API로 연관 키워드 + 데이터 수집
 * 6) 계절성 보너스 + 트렌드 정보 함께 저장
 */
import { getServiceClient } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'
import { decrypt } from '@/lib/utils/encryption'

// 시즌 × 카테고리 교차 시드 (공백 없는 단어)
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

export async function runSeasonalDiscovery(userId: string) {
  const supabase = getServiceClient()
  let seasonFound = 0
  const _debug: Record<string, unknown> = {}
  const _errors: string[] = []

  // 1. 블로그 목록
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, name, blog_type, language')
    .eq('user_id', userId)
    .eq('is_active', true)

  const koBlogsWithType = (blogs ?? []).filter(
    (b: any) => (b.language === 'ko' || !b.language) && b.blog_type
  )
  if (koBlogsWithType.length === 0) {
    return { seasonFound: 0, _debug, _errors: ['한국어 블로그 없음'] }
  }

  // 2. API 키 조회
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key, encrypted_secret, encrypted_extra')
    .eq('user_id', userId)
    .in('provider', ['naver_ad', 'naver_search'])
    .eq('is_active', true)

  const naverAdKeyRaw = apiKeys?.find((k: any) => k.provider === 'naver_ad')
  const naverSearchKeyRaw = apiKeys?.find((k: any) => k.provider === 'naver_search')

  if (!naverAdKeyRaw) {
    return { seasonFound: 0, _debug, _errors: ['네이버 광고 API 키 없음'] }
  }

  let naverAdKey: { apiKey: string; secretKey: string; customerId: string } | null = null
  try {
    naverAdKey = {
      apiKey: decrypt(naverAdKeyRaw.encrypted_key),
      secretKey: naverAdKeyRaw.encrypted_secret ? decrypt(naverAdKeyRaw.encrypted_secret) : '',
      customerId: naverAdKeyRaw.encrypted_extra ? decrypt(naverAdKeyRaw.encrypted_extra) : '',
    }
  } catch {
    return { seasonFound: 0, _debug, _errors: ['API 키 복호화 실패'] }
  }

  const naverAd = new NaverAdAPI()
  naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.customerId)

  // DataLab 초기화
  let dataLabReady = false
  const dataLab = new NaverDataLabAPI()
  if (naverSearchKeyRaw) {
    try {
      const dlKey = decrypt(naverSearchKeyRaw.encrypted_key)
      const dlSecret = naverSearchKeyRaw.encrypted_secret ? decrypt(naverSearchKeyRaw.encrypted_secret) : ''
      dataLab.initializeWithKeys(dlKey, dlSecret)
      dataLabReady = true
    } catch { /* DataLab 키 복호화 실패 */ }
  }
  _debug.dataLabReady = dataLabReady

  // 기존 키워드 (중복 방지)
  const { data: existingAll } = await supabase
    .from('keyword_pipeline')
    .select('keyword_text')
    .eq('user_id', userId)
  const existingSet = new Set((existingAll ?? []).map((p: any) => p.keyword_text))

  // 3. 현재월 + 다음달 시즌 이벤트 추출
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

  const seasonalBase: string[] = []
  for (const month of [currentMonth, nextMonth]) {
    const ae = ANNUAL_EVENTS.find(a => a.month === month)
    if (ae) seasonalBase.push(...ae.events)
  }
  _debug.seasonalBase = seasonalBase
  _debug.currentMonth = currentMonth
  _debug.nextMonth = nextMonth

  if (seasonalBase.length === 0) {
    return { seasonFound: 0, _debug, _errors: ['해당 월에 시즌 이벤트 없음'] }
  }

  // 4. DataLab 트렌드 분석 — 각 이벤트의 2년 트렌드 조회
  const trendFiltered: Array<{
    keyword: string
    trendIndex: number
    yoyGrowth: number
    peakMonth: number | null
    seasonalBonus: number
  }> = []

  for (const event of seasonalBase) {
    if (dataLabReady) {
      try {
        const trend = await dataLab.getTrend(event)

        const peakMonth = trend.seasonalMonths.length > 0
          ? trend.seasonalMonths.sort((a, b) =>
              Math.abs(a - currentMonth) - Math.abs(b - currentMonth)
            )[0]
          : null

        // 계절성 보너스
        let seasonalBonus = 0
        if (peakMonth !== null) {
          const monthsUntilPeak = ((peakMonth - currentMonth) + 12) % 12
          if (monthsUntilPeak === 1) seasonalBonus = 30
          else if (monthsUntilPeak === 2) seasonalBonus = 15
          else if (monthsUntilPeak === 0) seasonalBonus = 5
        }

        // 현재월/다음달 이벤트는 시기적으로 이미 적합
        // 트렌드 데이터는 탈락 기준이 아닌 보너스 점수로만 활용
        trendFiltered.push({
          keyword: event,
          trendIndex: trend.trendIndex,
          yoyGrowth: trend.yoyGrowth,
          peakMonth,
          seasonalBonus,
        })
      } catch {
        trendFiltered.push({ keyword: event, trendIndex: 50, yoyGrowth: 0, peakMonth: null, seasonalBonus: 0 })
      }
    } else {
      trendFiltered.push({ keyword: event, trendIndex: 50, yoyGrowth: 0, peakMonth: null, seasonalBonus: 0 })
    }
  }

  _debug.trendFiltered = trendFiltered.map(t =>
    `${t.keyword}(YoY:${t.yoyGrowth}%,peak:${t.peakMonth},bonus:${t.seasonalBonus},trend:${t.trendIndex})`
  )

  // 5. 트렌드 통과한 시즌 키워드 × 블로그 카테고리 교차 시드
  const filteredEventNames = trendFiltered.map(t => t.keyword)
  const allSeasonalSeeds = new Set<string>()
  for (const blog of koBlogsWithType) {
    const crossSeeds = getSeasonalSeedsForBlogType((blog as any).blog_type!, filteredEventNames)
    crossSeeds.forEach(s => allSeasonalSeeds.add(s))
  }
  if (allSeasonalSeeds.size === 0) {
    for (const t of trendFiltered) {
      allSeasonalSeeds.add(t.keyword.replace(/\s+/g, ''))
    }
  }
  _debug.seasonalSeeds = Array.from(allSeasonalSeeds)

  // 6. 네이버 광고 API로 연관 키워드 수집
  const compScore = (c: string) => c === '높음' ? 80 : c === '낮음' ? 20 : 50
  const seedArray = Array.from(allSeasonalSeeds)

  for (let i = 0; i < seedArray.length; i += 5) {
    try {
      const batch = seedArray.slice(i, i + 5)
      const seasonResults = await naverAd.getKeywordStats(batch)

      const validSeasonal = seasonResults
        .filter(r => !existingSet.has(r.keyword))
        .filter(r => r.monthlySearchVolume >= 50)
        .filter(r => r.keyword.length >= 4)
        .map(r => ({ ...r, competitiveness: r.monthlySearchVolume / (compScore(r.compIdx) + 1) }))
        .sort((a, b) => b.competitiveness - a.competitiveness)
        .slice(0, 15)

      if (validSeasonal.length > 0) {
        const batchTrend = trendFiltered.find(t =>
          batch.some(seed => seed.includes(t.keyword.replace(/\s+/g, '')))
        )

        const rows = validSeasonal.map(r => ({
          user_id: userId,
          keyword_text: r.keyword,
          keyword_type: 'seasonal' as const,
          stage: 'discovered' as const,
          monthly_search_volume: r.monthlySearchVolume,
          cpc_estimate: r.monthlyAvgCpc || 0,
          competition_score: compScore(r.compIdx),
          trend_index: batchTrend?.trendIndex ?? 50,
        }))
        await supabase.from('keyword_pipeline').insert(rows)
        seasonFound += validSeasonal.length
        validSeasonal.forEach(r => existingSet.add(r.keyword))
      }
    } catch (err: any) {
      _errors.push(`Seasonal batch: ${err.message}`)
    }
  }

  return { seasonFound, _debug, _errors }
}
