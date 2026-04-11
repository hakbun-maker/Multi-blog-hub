/**
 * 시즌 키워드 발굴 — 연간 전체 (1~12월)
 *
 * 실행할 때마다 기존 시즌 키워드와 동기화:
 * - 중복: 유지 (트렌드 데이터만 업데이트)
 * - 구에만 있음: 삭제
 * - 신규에만 있음: 추가
 *
 * 논리:
 * 1) ANNUAL_EVENTS 1~12월 전체 이벤트 추출
 * 2) DataLab API로 2년 트렌드 → YoY 성장률 + 피크월 + 계절성 보너스
 * 3) 블로그 카테고리 × 시즌 교차 시드 생성
 * 4) 네이버 광고 API로 연관 키워드 + 데이터 수집
 * 5) 기존 시즌 키워드와 동기화 (추가/삭제/유지)
 */
import { getServiceClient } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'
import { decrypt } from '@/lib/utils/encryption'

// 시즌 × 카테고리 교차 시드
const SEASONAL_CROSS_SEEDS: Record<string, Record<string, string[]>> = {
  'medical': {
    '어버이날': ['어버이날건강선물', '영양제추천', '부모님건강검진'],
    '어린이날': ['어린이영양제', '어린이건강검진'],
    '봄나들이': ['봄철알레르기', '황사마스크'],
    '겨울여행': ['면역력강화', '독감예방접종'],
    '여름휴가': ['식중독예방', '열사병증상'],
    '설날': ['소화불량', '명절건강'],
    '추석': ['추석건강관리', '명절다이어트'],
    '여름준비': ['여름다이어트', '자외선차단'],
    '가을준비': ['환절기건강', '독감예방'],
  },
  'finance': {
    '설날': ['세뱃돈재테크', '재무목표'],
    '근로자의날': ['주식시장휴장', '공모주일정'],
    '블랙프라이데이': ['해외주식', '연말절세'],
    '어버이날': ['효도보험', '부모님용돈'],
    '수능': ['등록금마련', '학자금대출'],
    '연말정산': ['연말정산', '세액공제'],
    '신년': ['신년재테크', '새해투자'],
  },
  'real-estate': {
    '봄나들이': ['봄이사철', '전세시세'],
    '설날': ['부동산전망', '분양일정'],
    '어버이날': ['실버타운', '리모델링비용'],
    '여름휴가': ['하반기부동산', '전세이동'],
    '이사시즌': ['이사비용', '이사업체추천'],
  },
  'entertainment': {
    '코첼라': ['코첼라라인업', '코첼라일정'],
    '어린이날': ['어린이날공연', '어린이뮤지컬'],
    '크리스마스': ['크리스마스공연', '연말콘서트'],
    '핼러윈': ['핼러윈파티', '핼러윈이벤트'],
    '봄나들이': ['봄페스티벌', '봄전시회'],
    '여름휴가': ['여름페스티벌', '워터밤'],
    '가을축제': ['가을공연', '단풍축제'],
  },
}

function getSeasonalSeedsForBlogType(blogType: string, events: string[]): string[] {
  const crossSeeds = SEASONAL_CROSS_SEEDS[blogType]
  if (!crossSeeds) return []
  const seeds: string[] = []
  for (const event of events) {
    const eventSeeds = crossSeeds[event]
    if (eventSeeds) seeds.push(...eventSeeds)
  }
  return seeds
}

export async function runSeasonalDiscovery(userId: string) {
  const supabase = getServiceClient()
  let added = 0
  let removed = 0
  let kept = 0
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
    return { added: 0, removed: 0, kept: 0, _debug, _errors: ['한국어 블로그 없음'] }
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
    return { added: 0, removed: 0, kept: 0, _debug, _errors: ['네이버 광고 API 키 없음'] }
  }

  let naverAdKey: { apiKey: string; secretKey: string; customerId: string }
  try {
    naverAdKey = {
      apiKey: decrypt(naverAdKeyRaw.encrypted_key),
      secretKey: naverAdKeyRaw.encrypted_secret ? decrypt(naverAdKeyRaw.encrypted_secret) : '',
      customerId: naverAdKeyRaw.encrypted_extra ? decrypt(naverAdKeyRaw.encrypted_extra) : '',
    }
  } catch {
    return { added: 0, removed: 0, kept: 0, _debug, _errors: ['API 키 복호화 실패'] }
  }

  const naverAd = new NaverAdAPI()
  naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.customerId)

  // DataLab 초기화
  let dataLabReady = false
  const dataLab = new NaverDataLabAPI()
  if (naverSearchKeyRaw) {
    try {
      dataLab.initializeWithKeys(
        decrypt(naverSearchKeyRaw.encrypted_key),
        naverSearchKeyRaw.encrypted_secret ? decrypt(naverSearchKeyRaw.encrypted_secret) : ''
      )
      dataLabReady = true
    } catch { /* DataLab 키 복호화 실패 */ }
  }
  _debug.dataLabReady = dataLabReady

  // ──────────────────────────────────────────────
  // 3. 1~12월 전체 시즌 이벤트 추출 + DataLab 트렌드
  // ──────────────────────────────────────────────
  const currentMonth = new Date().getMonth() + 1
  const allEvents: string[] = []
  for (const ae of ANNUAL_EVENTS) {
    allEvents.push(...ae.events)
  }
  _debug.totalEvents = allEvents.length

  // 트렌드 분석 (DataLab)
  const trendData: Array<{
    keyword: string
    trendIndex: number
    yoyGrowth: number
    peakMonth: number | null
    seasonalBonus: number
  }> = []

  for (const event of allEvents) {
    let trendIndex = 50
    let yoyGrowth = 0
    let peakMonth: number | null = null
    let seasonalBonus = 0

    if (dataLabReady) {
      try {
        const trend = await dataLab.getTrend(event)
        trendIndex = trend.trendIndex
        yoyGrowth = trend.yoyGrowth

        peakMonth = trend.seasonalMonths.length > 0
          ? trend.seasonalMonths.sort((a, b) =>
              Math.abs(a - currentMonth) - Math.abs(b - currentMonth)
            )[0]
          : null

        if (peakMonth !== null) {
          const monthsUntilPeak = ((peakMonth - currentMonth) + 12) % 12
          if (monthsUntilPeak === 1) seasonalBonus = 30
          else if (monthsUntilPeak === 2) seasonalBonus = 15
          else if (monthsUntilPeak === 0) seasonalBonus = 5
        }
      } catch { /* 개별 이벤트 트렌드 실패 — 기본값 사용 */ }
    }

    trendData.push({ keyword: event, trendIndex, yoyGrowth, peakMonth, seasonalBonus })
  }

  _debug.trendSample = trendData.slice(0, 10).map(t =>
    `${t.keyword}(YoY:${t.yoyGrowth}%,peak:${t.peakMonth},bonus:${t.seasonalBonus})`
  )

  // ──────────────────────────────────────────────
  // 4. 블로그 카테고리 × 시즌 교차 시드 → 네이버 API
  // ──────────────────────────────────────────────
  const allSeasonalSeeds = new Set<string>()
  for (const blog of koBlogsWithType) {
    const crossSeeds = getSeasonalSeedsForBlogType((blog as any).blog_type!, allEvents)
    crossSeeds.forEach(s => allSeasonalSeeds.add(s))
  }
  // 교차 시드가 없는 이벤트는 이벤트명 자체를 시드로 사용
  for (const event of allEvents) {
    allSeasonalSeeds.add(event.replace(/\s+/g, ''))
  }
  _debug.totalSeeds = allSeasonalSeeds.size

  // 네이버 광고 API로 연관 키워드 수집
  const compScore = (c: string) => c === '높음' ? 80 : c === '낮음' ? 20 : 50
  const newKeywordsMap = new Map<string, {
    keyword_text: string
    monthly_search_volume: number
    cpc_estimate: number
    competition_score: number
    trend_index: number
  }>()

  const seedArray = Array.from(allSeasonalSeeds)
  for (let i = 0; i < seedArray.length; i += 5) {
    try {
      const batch = seedArray.slice(i, i + 5)
      const results = await naverAd.getKeywordStats(batch)

      const valid = results
        .filter(r => r.monthlySearchVolume >= 50)
        .filter(r => r.keyword.length >= 4)
        .map(r => ({ ...r, competitiveness: r.monthlySearchVolume / (compScore(r.compIdx) + 1) }))
        .sort((a, b) => b.competitiveness - a.competitiveness)
        .slice(0, 15)

      // 시드에 매칭되는 트렌드 정보
      const batchTrend = trendData.find(t =>
        batch.some(seed => seed.includes(t.keyword.replace(/\s+/g, '')))
      )

      for (const r of valid) {
        if (!newKeywordsMap.has(r.keyword)) {
          newKeywordsMap.set(r.keyword, {
            keyword_text: r.keyword,
            monthly_search_volume: r.monthlySearchVolume,
            cpc_estimate: r.monthlyAvgCpc || 0,
            competition_score: compScore(r.compIdx),
            trend_index: batchTrend?.trendIndex ?? 50,
          })
        }
      }
    } catch (err: any) {
      _errors.push(`API batch: ${err.message}`)
    }
  }

  _debug.newKeywordsFound = newKeywordsMap.size

  // ──────────────────────────────────────────────
  // 5. 기존 시즌 키워드와 동기화
  //    - 중복: 유지 (트렌드 업데이트)
  //    - 구에만 있음: 삭제
  //    - 신규에만 있음: 추가
  // ──────────────────────────────────────────────
  const { data: existingSeasonal } = await supabase
    .from('keyword_pipeline')
    .select('id, keyword_text')
    .eq('user_id', userId)
    .eq('keyword_type', 'seasonal')

  const existingMap = new Map((existingSeasonal ?? []).map((e: any) => [e.keyword_text, e.id]))
  const newKeywordSet = new Set(newKeywordsMap.keys())

  // 삭제: 기존에만 있는 키워드
  const toDelete: string[] = []
  for (const [kwText, id] of Array.from(existingMap.entries())) {
    if (!newKeywordSet.has(kwText)) {
      toDelete.push(id)
    }
  }
  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 50) {
      await supabase.from('keyword_pipeline').delete().in('id', toDelete.slice(i, i + 50))
    }
    removed = toDelete.length
  }

  // 추가: 신규에만 있는 키워드
  const toInsert: Array<Record<string, unknown>> = []
  for (const [kwText, data] of Array.from(newKeywordsMap.entries())) {
    if (!existingMap.has(kwText)) {
      toInsert.push({
        user_id: userId,
        keyword_text: data.keyword_text,
        keyword_type: 'seasonal',
        stage: 'discovered',
        monthly_search_volume: data.monthly_search_volume,
        cpc_estimate: data.cpc_estimate,
        competition_score: data.competition_score,
        trend_index: data.trend_index,
      })
    } else {
      kept++
    }
  }
  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 50) {
      await supabase.from('keyword_pipeline').insert(toInsert.slice(i, i + 50))
    }
    added = toInsert.length
  }

  _debug.summary = `추가: ${added}, 삭제: ${removed}, 유지: ${kept}`

  return { added, removed, kept, seasonFound: added, _debug, _errors }
}
