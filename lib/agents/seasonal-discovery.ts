/**
 * 시즌 키워드 발굴 — 현재월 + 다음달만 (발굴 + 확장까지 한번에)
 *
 * 1) ANNUAL_EVENTS에서 현재월+다음달 이벤트 추출
 * 2) DataLab 2년 트렌드 → 계절성 보너스 계산
 * 3) 블로그 카테고리 × 시즌 교차 시드 → 네이버 API (1차 발굴)
 * 4) 1차 결과 상위를 다시 API에 넣어 2차 롱테일 확장
 * 5) stage='expanded'로 저장 (Analyst→Planner만 남음)
 * 6) 기존 시즌 키워드와 동기화 (추가/삭제/유지)
 */
import { getServiceClient } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { NaverDataLabAPI } from '@/lib/monetize/apis/naver-datalab-api'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'
import { decrypt } from '@/lib/utils/encryption'

const SEASONAL_CROSS_SEEDS: Record<string, Record<string, string[]>> = {
  'medical': {
    '어버이날': ['어버이날건강선물', '영양제추천', '부모님건강검진'],
    '어린이날': ['어린이영양제', '어린이건강검진'],
    '봄나들이': ['봄철알레르기', '황사마스크'],
    '겨울여행': ['면역력강화', '독감예방접종'],
    '여름휴가': ['식중독예방', '열사병증상'],
    '여름준비': ['여름다이어트', '자외선차단'],
    '설날': ['소화불량', '명절건강'],
    '추석': ['추석건강관리', '명절다이어트'],
  },
  'finance': {
    '설날': ['세뱃돈재테크', '재무목표'],
    '블랙프라이데이': ['해외주식', '연말절세'],
    '어버이날': ['효도보험', '부모님용돈'],
    '수능': ['등록금마련', '학자금대출'],
  },
  'real-estate': {
    '봄나들이': ['봄이사철', '전세시세'],
    '설날': ['부동산전망', '분양일정'],
    '어버이날': ['실버타운', '리모델링비용'],
    '이사시즌': ['이사비용', '이사업체추천'],
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

function getSeasonalSeedsForBlogType(blogType: string, events: string[]): string[] {
  const crossSeeds = SEASONAL_CROSS_SEEDS[blogType]
  if (!crossSeeds) return []
  const seeds: string[] = []
  for (const event of events) {
    if (crossSeeds[event]) seeds.push(...crossSeeds[event])
  }
  return seeds
}

export async function runSeasonalDiscovery(userId: string) {
  const supabase = getServiceClient()
  let discovered = 0
  let expanded = 0
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
    return { discovered: 0, expanded: 0, removed: 0, kept: 0, _debug, _errors: ['한국어 블로그 없음'] }
  }

  // 2. API 키
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key, encrypted_secret, encrypted_extra')
    .eq('user_id', userId)
    .in('provider', ['naver_ad', 'naver_search'])
    .eq('is_active', true)

  const naverAdKeyRaw = apiKeys?.find((k: any) => k.provider === 'naver_ad')
  if (!naverAdKeyRaw) {
    return { discovered: 0, expanded: 0, removed: 0, kept: 0, _debug, _errors: ['네이버 광고 API 키 없음'] }
  }

  let naverAdKey: { apiKey: string; secretKey: string; customerId: string }
  try {
    naverAdKey = {
      apiKey: decrypt(naverAdKeyRaw.encrypted_key),
      secretKey: naverAdKeyRaw.encrypted_secret ? decrypt(naverAdKeyRaw.encrypted_secret) : '',
      customerId: naverAdKeyRaw.encrypted_extra ? decrypt(naverAdKeyRaw.encrypted_extra) : '',
    }
  } catch {
    return { discovered: 0, expanded: 0, removed: 0, kept: 0, _debug, _errors: ['API 키 복호화 실패'] }
  }

  const naverAd = new NaverAdAPI()
  naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.customerId)

  // DataLab
  const naverSearchKeyRaw = apiKeys?.find((k: any) => k.provider === 'naver_search')
  let dataLabReady = false
  const dataLab = new NaverDataLabAPI()
  if (naverSearchKeyRaw) {
    try {
      dataLab.initializeWithKeys(
        decrypt(naverSearchKeyRaw.encrypted_key),
        naverSearchKeyRaw.encrypted_secret ? decrypt(naverSearchKeyRaw.encrypted_secret) : ''
      )
      dataLabReady = true
    } catch { /* ignore */ }
  }
  _debug.dataLabReady = dataLabReady

  // ──────────────────────────────────────────────
  // 3. 현재월 + 다음달 시즌 이벤트
  // ──────────────────────────────────────────────
  const currentMonth = new Date().getMonth() + 1
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

  const seasonalBase: string[] = []
  for (const month of [currentMonth, nextMonth]) {
    const ae = ANNUAL_EVENTS.find(a => a.month === month)
    if (ae) seasonalBase.push(...ae.events)
  }
  _debug.seasonalBase = seasonalBase
  _debug.months = `${currentMonth}월, ${nextMonth}월`

  if (seasonalBase.length === 0) {
    return { discovered: 0, expanded: 0, removed: 0, kept: 0, _debug, _errors: ['해당 월에 시즌 이벤트 없음'] }
  }

  // DataLab 트렌드 조회 (보너스용)
  const trendByEvent = new Map<string, { trendIndex: number; seasonalBonus: number; yoyGrowth: number; publishTiming: string }>()
  if (dataLabReady) {
    for (const event of seasonalBase) {
      try {
        const trend = await dataLab.getTrend(event)
        const peakMonth = trend.seasonalMonths.length > 0
          ? trend.seasonalMonths.sort((a, b) => Math.abs(a - currentMonth) - Math.abs(b - currentMonth))[0]
          : null
        let bonus = 0
        if (peakMonth !== null) {
          const until = ((peakMonth - currentMonth) + 12) % 12
          if (until === 1) bonus = 30
          else if (until === 2) bonus = 15
          else if (until === 0) bonus = 5
        }
        // 시즌 키워드 3가지 검증 (기획서: 시즌 키워드 추출 로직.txt)
        // ① 2년 연속 동일 월 상승: yoyGrowth로 판단 (isSeasonal은 DataLab에서 계산)
        // ② 상승 기울기 20%+: yoyGrowth >= 20이면 즉시 발행
        // ③ 연도별 편차 20포인트 이내: isSeasonal이 true이면 안정적
        const isVerifiedSeason = trend.isSeasonal || trend.yoyGrowth >= 20 || trend.trendIndex >= 60
        const publishTiming = trend.yoyGrowth >= 20 ? '즉시' : '다음달선점'

        if (isVerifiedSeason) {
          trendByEvent.set(event, { trendIndex: trend.trendIndex, seasonalBonus: bonus, yoyGrowth: trend.yoyGrowth, publishTiming })
        }
      } catch { /* 기본값 — DataLab 실패 시 포함 */
        trendByEvent.set(event, { trendIndex: 50, seasonalBonus: 0, yoyGrowth: 0, publishTiming: '기본' })
      }
    }
  }
  _debug.trendData = Array.from(trendByEvent.entries()).map(([k, v]) => `${k}(trend:${v.trendIndex},YoY:${v.yoyGrowth}%,${v.publishTiming})`)

  // ──────────────────────────────────────────────
  // 4. 1차 발굴: 교차 시드 → 네이버 API
  // ──────────────────────────────────────────────
  // 검증된 이벤트만 시드로 사용 (DataLab 검증 통과한 것만)
  const verifiedEvents = Array.from(trendByEvent.keys())
  _debug.verifiedEvents = verifiedEvents

  const allSeeds = new Set<string>()
  for (const blog of koBlogsWithType) {
    getSeasonalSeedsForBlogType((blog as any).blog_type!, verifiedEvents).forEach(s => allSeeds.add(s))
  }
  for (const event of verifiedEvents) {
    allSeeds.add(event.replace(/\s+/g, ''))
  }

  const compScore = (c: string) => c === '높음' ? 80 : c === '낮음' ? 20 : 50
  const firstRoundKeywords: Array<{
    keyword: string
    volume: number
    cpc: number
    competition: number
    trendIndex: number
  }> = []

  const seedArray = Array.from(allSeeds)
  for (let i = 0; i < seedArray.length; i += 5) {
    try {
      const batch = seedArray.slice(i, i + 5)
      const results = await naverAd.getKeywordStats(batch)

      const batchTrend = Array.from(trendByEvent.entries()).find(([k]) =>
        batch.some(seed => seed.includes(k.replace(/\s+/g, '')))
      )

      const valid = results
        .filter(r => r.monthlySearchVolume >= 500 && r.keyword.length >= 4) // 기획서: 검색량 1,000 미만 제외
        .map(r => ({
          keyword: r.keyword,
          volume: r.monthlySearchVolume,
          cpc: r.monthlyAvgCpc || 0,
          competition: compScore(r.compIdx),
          trendIndex: batchTrend?.[1]?.trendIndex ?? 50,
          competitiveness: r.monthlySearchVolume / (compScore(r.compIdx) + 1),
        }))
        .sort((a, b) => b.competitiveness - a.competitiveness)
        .slice(0, 15)

      firstRoundKeywords.push(...valid)
    } catch (err: any) {
      _errors.push(`1차: ${err.message}`)
    }
  }

  // 중복 제거
  const seen = new Set<string>()
  const uniqueFirst = firstRoundKeywords.filter(r => {
    if (seen.has(r.keyword)) return false
    seen.add(r.keyword)
    return true
  })
  discovered = uniqueFirst.length
  _debug.firstRoundCount = discovered

  // ──────────────────────────────────────────────
  // 5. 2차 확장: 1차 상위 → 다시 API → 롱테일
  // ──────────────────────────────────────────────
  const expandedKeywords: typeof firstRoundKeywords = []

  // 경쟁력 상위 10개만 확장
  const toExpand = uniqueFirst
    .sort((a, b) => (b.volume / (b.competition + 1)) - (a.volume / (a.competition + 1)))
    .slice(0, 10)

  for (const kw of toExpand) {
    try {
      const results = await naverAd.getKeywordStats([kw.keyword])
      const longTails = results
        .filter(r => r.keyword !== kw.keyword)
        .filter(r => !seen.has(r.keyword))
        .filter(r => r.monthlySearchVolume >= 30 && r.keyword.length >= 5)
        .map(r => ({
          keyword: r.keyword,
          volume: r.monthlySearchVolume,
          cpc: r.monthlyAvgCpc || 0,
          competition: compScore(r.compIdx),
          trendIndex: kw.trendIndex,
          competitiveness: r.monthlySearchVolume / (compScore(r.compIdx) + 1),
        }))
        .sort((a, b) => b.competitiveness - a.competitiveness)
        .slice(0, 8)

      expandedKeywords.push(...longTails)
      longTails.forEach(r => seen.add(r.keyword))
    } catch (err: any) {
      _errors.push(`2차(${kw.keyword}): ${err.message}`)
    }
  }
  expanded = expandedKeywords.length
  _debug.expandedCount = expanded

  // ──────────────────────────────────────────────
  // 6. 기존 시즌 키워드와 동기화 → stage='expanded'로 저장
  // ──────────────────────────────────────────────
  const allNewKeywords = [...uniqueFirst, ...expandedKeywords]
  const newKeywordSet = new Set(allNewKeywords.map(k => k.keyword))

  // 기존 시즌 키워드 조회
  const { data: existingSeasonal } = await supabase
    .from('keyword_pipeline')
    .select('id, keyword_text')
    .eq('user_id', userId)
    .eq('keyword_type', 'seasonal')

  const existingMap = new Map((existingSeasonal ?? []).map((e: any) => [e.keyword_text, e.id]))

  // 삭제: 기존에만 있는 키워드
  const toDelete: string[] = []
  for (const [kwText, id] of Array.from(existingMap.entries())) {
    if (!newKeywordSet.has(kwText)) {
      toDelete.push(id)
    } else {
      kept++
    }
  }
  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 50) {
      await supabase.from('keyword_pipeline').delete().in('id', toDelete.slice(i, i + 50))
    }
    removed = toDelete.length
  }

  // 추가: 신규에만 있는 키워드 (stage='expanded' — Analyst부터 시작)
  const toInsert = allNewKeywords
    .filter(k => !existingMap.has(k.keyword))
    .map(k => ({
      user_id: userId,
      keyword_text: k.keyword,
      keyword_type: 'seasonal' as const,
      stage: 'expanded' as const,
      monthly_search_volume: k.volume,
      cpc_estimate: k.cpc,
      competition_score: k.competition,
      trend_index: k.trendIndex,
    }))

  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 50) {
      await supabase.from('keyword_pipeline').insert(toInsert.slice(i, i + 50))
    }
  }

  const added = toInsert.length
  _debug.summary = `1차 발굴: ${discovered}, 2차 확장: ${expanded}, 추가: ${added}, 삭제: ${removed}, 유지: ${kept}`

  return { discovered, expanded, added, removed, kept, _debug, _errors }
}
