/**
 * 실시간 트렌드 키워드 발굴 — Google Trends + 네이버 뉴스
 *
 * 1) Google Trends 급상승 키워드 수집
 * 2) 네이버 뉴스 API로 이슈 키워드 수집
 * 3) 블로그 카테고리와 관련 있는 것만 필터
 * 4) 네이버 광고 API로 연관 키워드 + 데이터 수집
 * 5) 2차 롱테일 확장
 * 6) stage='expanded'로 저장 (발굴+확장 한번에)
 */
import { getServiceClient } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { EventAPI } from '@/lib/monetize/apis/event-api'
import { decrypt } from '@/lib/utils/encryption'

// blog_type별 관련 키워드 매칭 (트렌드 키워드가 어떤 블로그에 적합한지 판단)
// 3글자 이상 단어만 사용 (2글자는 오매칭 위험)
const BLOG_TYPE_MATCH_WORDS: Record<string, string[]> = {
  'medical': ['건강', '병원', '의료', '질병', '치료', '증상', '수술', '혈당', '혈압', '비타민', '영양', '다이어트', '면역', '의학', '검진', '약국', '진료'],
  'finance': ['주식', '투자', '재테크', '연금', '보험', '세금', '금리', '대출', '자산', '배당', '펀드', '금융', '경제', '환율', '코인', '증시'],
  'real-estate': ['부동산', '아파트', '전세', '월세', '분양', '인테리어', '재개발', '재건축', '집값', '청약', '매물'],
  'entertainment': ['콘서트', '공연', '뮤지컬', '팬미팅', '아이돌', '넷플릭스', '영화', '드라마', '웹툰', '게임', '축제', '페스티벌'],
  'it-tech': ['프로그래밍', '코딩', '노트북', '스마트폰', '개발', '클라우드', '반도체', '소프트웨어', '인공지능'],
  'food': ['맛집', '레시피', '요리', '카페', '음식', '배달', '식당', '밀키트'],
  'travel': ['여행', '호텔', '항공', '캠핑', '관광', '리조트', '숙소', '명소'],
  'pets': ['강아지', '고양이', '반려동물', '사료'],
  'sports': ['축구', '야구', '골프', '등산', '헬스', '올림픽', '경기장'],
  'education': ['자격증', '영어', '토익', '입시', '교육', '공무원'],
}

function matchBlogType(keyword: string, userBlogTypes: Set<string>): string | null {
  const kw = keyword.toLowerCase()
  // 3글자 이상 매칭 단어만 사용 (2글자 "이사"→"김혜성이사태" 오매칭 방지)
  for (const [blogType, words] of Object.entries(BLOG_TYPE_MATCH_WORDS)) {
    if (!userBlogTypes.has(blogType)) continue
    if (words.some(w => w.length >= 3 && kw.includes(w.toLowerCase()))) {
      return blogType
    }
  }
  return null
}

export async function runTrendDiscovery(userId: string) {
  const supabase = getServiceClient()
  let trendFound = 0
  let expanded = 0
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
    return { trendFound: 0, expanded: 0, _debug, _errors: ['한국어 블로그 없음'] }
  }

  const userBlogTypes = new Set(koBlogsWithType.map((b: any) => b.blog_type as string))
  _debug.userBlogTypes = Array.from(userBlogTypes)

  // 2. API 키
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key, encrypted_secret, encrypted_extra')
    .eq('user_id', userId)
    .in('provider', ['naver_ad', 'naver_search'])
    .eq('is_active', true)

  const naverAdKeyRaw = apiKeys?.find((k: any) => k.provider === 'naver_ad')
  if (!naverAdKeyRaw) {
    return { trendFound: 0, expanded: 0, _debug, _errors: ['네이버 광고 API 키 없음'] }
  }

  let naverAdKey: { apiKey: string; secretKey: string; customerId: string }
  try {
    naverAdKey = {
      apiKey: decrypt(naverAdKeyRaw.encrypted_key),
      secretKey: naverAdKeyRaw.encrypted_secret ? decrypt(naverAdKeyRaw.encrypted_secret) : '',
      customerId: naverAdKeyRaw.encrypted_extra ? decrypt(naverAdKeyRaw.encrypted_extra) : '',
    }
  } catch {
    return { trendFound: 0, expanded: 0, _debug, _errors: ['API 키 복호화 실패'] }
  }

  const naverAd = new NaverAdAPI()
  naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.customerId)

  // 기존 키워드 (중복 방지)
  const { data: existingAll } = await supabase
    .from('keyword_pipeline')
    .select('keyword_text')
    .eq('user_id', userId)
  const existingSet = new Set((existingAll ?? []).map((p: any) => p.keyword_text))

  // ──────────────────────────────────────────────
  // 3. 트렌드 키워드 수집 (Google Trends + 네이버 뉴스)
  // ──────────────────────────────────────────────
  const eventAPI = new EventAPI(userId)
  await eventAPI.initializeWithClient(supabase)
  const allEvents = await eventAPI.fetchAllEvents()

  // 블로그 카테고리와 매칭되는 트렌드 키워드만 필터
  const matchedTrends: Array<{ keyword: string; source: string; blogType: string }> = []

  for (const event of allEvents) {
    // HTML 태그 제거 후 제목에서 한국어 핵심 단어 추출
    const rawTitle = event.title.replace(/<[^>]*>/g, '').trim()
    // 제목에서 2~6글자 한국어 단어 추출 (검색 가능한 단위)
    const koreanWords = rawTitle.match(/[가-힣]{2,6}/g) ?? []

    // 단어별로 블로그 카테고리 매칭 (3글자 이상 단어만)
    for (const word of koreanWords) {
      if (word.length < 3) continue
      const matchedType = matchBlogType(word, userBlogTypes)
      if (matchedType && !existingSet.has(word)) {
        matchedTrends.push({ keyword: word, source: event.source, blogType: matchedType })
      }
    }

    // event.keywords도 활용 (이미 정제된 키워드)
    for (const kw of event.keywords) {
      const cleanKw = kw.replace(/<[^>]*>/g, '').trim()
      // 공백 제거하되 너무 긴 것은 제외 (15자 이상은 검색어가 아님)
      const noSpace = cleanKw.replace(/\s+/g, '')
      if (noSpace.length < 3 || noSpace.length > 15) continue

      const matchedType = matchBlogType(noSpace, userBlogTypes)
      if (matchedType && !existingSet.has(noSpace)) {
        matchedTrends.push({ keyword: noSpace, source: event.source, blogType: matchedType })
      }
    }
  }

  // 중복 제거
  const seen = new Set<string>()
  const uniqueTrends = matchedTrends.filter(t => {
    if (seen.has(t.keyword)) return false
    seen.add(t.keyword)
    return true
  }).slice(0, 20) // 최대 20개

  _debug.totalEvents = allEvents.length
  _debug.matchedTrends = uniqueTrends.length
  _debug.trendSample = uniqueTrends.slice(0, 10).map(t => `${t.keyword}(${t.source}→${t.blogType})`)

  if (uniqueTrends.length === 0) {
    return { trendFound: 0, expanded: 0, _debug, _errors: ['블로그 카테고리와 매칭되는 트렌드 없음'] }
  }

  // ──────────────────────────────────────────────
  // 4. 1차 발굴: 트렌드 키워드 → 네이버 광고 API
  // ──────────────────────────────────────────────
  const compScore = (c: string) => c === '높음' ? 80 : c === '낮음' ? 20 : 50
  const firstRound: Array<{
    keyword: string; volume: number; cpc: number; competition: number
  }> = []

  const trendSeeds = uniqueTrends.map(t => t.keyword)
  for (let i = 0; i < trendSeeds.length; i += 5) {
    try {
      const batch = trendSeeds.slice(i, i + 5)
      const results = await naverAd.getKeywordStats(batch)

      const valid = results
        .filter(r => !existingSet.has(r.keyword))
        .filter(r => r.monthlySearchVolume >= 50 && r.keyword.length >= 4)
        .map(r => ({
          keyword: r.keyword,
          volume: r.monthlySearchVolume,
          cpc: r.monthlyAvgCpc || 0,
          competition: compScore(r.compIdx),
          competitiveness: r.monthlySearchVolume / (compScore(r.compIdx) + 1),
        }))
        .sort((a, b) => b.competitiveness - a.competitiveness)
        .slice(0, 15)

      firstRound.push(...valid)
      valid.forEach(r => existingSet.add(r.keyword))
    } catch (err: any) {
      _errors.push(`1차: ${err.message}`)
    }
  }

  // 중복 제거
  const uniqueFirst = new Map<string, typeof firstRound[0]>()
  for (const r of firstRound) {
    if (!uniqueFirst.has(r.keyword)) uniqueFirst.set(r.keyword, r)
  }
  trendFound = uniqueFirst.size
  _debug.firstRoundCount = trendFound

  // ──────────────────────────────────────────────
  // 5. 2차 확장: 상위 → 롱테일
  // ──────────────────────────────────────────────
  const expandedKeywords: typeof firstRound = []
  const toExpand = Array.from(uniqueFirst.values())
    .sort((a, b) => (b.volume / (b.competition + 1)) - (a.volume / (a.competition + 1)))
    .slice(0, 8)

  for (const kw of toExpand) {
    try {
      const results = await naverAd.getKeywordStats([kw.keyword])
      const longTails = results
        .filter(r => r.keyword !== kw.keyword && !existingSet.has(r.keyword))
        .filter(r => r.monthlySearchVolume >= 30 && r.keyword.length >= 5)
        .map(r => ({
          keyword: r.keyword,
          volume: r.monthlySearchVolume,
          cpc: r.monthlyAvgCpc || 0,
          competition: compScore(r.compIdx),
        }))
        .sort((a, b) => (b.volume / (b.competition + 1)) - (a.volume / (a.competition + 1)))
        .slice(0, 6)

      expandedKeywords.push(...longTails)
      longTails.forEach(r => existingSet.add(r.keyword))
    } catch (err: any) {
      _errors.push(`2차(${kw.keyword}): ${err.message}`)
    }
  }
  expanded = expandedKeywords.length
  _debug.expandedCount = expanded

  // ──────────────────────────────────────────────
  // 6. stage='expanded'로 저장
  // ──────────────────────────────────────────────
  const allNew = [...Array.from(uniqueFirst.values()), ...expandedKeywords]
  if (allNew.length > 0) {
    const rows = allNew.map(r => ({
      user_id: userId,
      keyword_text: r.keyword,
      keyword_type: 'gold' as const,
      stage: 'expanded' as const,
      monthly_search_volume: r.volume,
      cpc_estimate: r.cpc,
      competition_score: r.competition,
    }))
    for (let i = 0; i < rows.length; i += 50) {
      await supabase.from('keyword_pipeline').insert(rows.slice(i, i + 50))
    }
  }

  _debug.totalAdded = allNew.length
  return { trendFound, expanded, added: allNew.length, _debug, _errors }
}
