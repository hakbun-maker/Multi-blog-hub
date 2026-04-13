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
import { decrypt } from '@/lib/utils/encryption'
import { competitionToNum } from './shared'

// blog_type별 관련 키워드 매칭 (트렌드 키워드가 어떤 블로그에 적합한지 판단)
// blog_type별 네이버 뉴스 검색 쿼리 (해당 분야 최신 이슈 수집용)
const BLOG_TYPE_NEWS_QUERIES: Record<string, string[]> = {
  'medical': ['건강 질병 최신', '의료 신약 치료법', '다이어트 운동 트렌드'],
  'finance': ['주식 증시 전망', '금리 경제 투자', '재테크 부동산 대출'],
  'real-estate': ['부동산 아파트 시세', '전세 분양 청약', '재개발 재건축 전망'],
  'entertainment': ['공연 콘서트 신작', '넷플릭스 드라마 영화', '웹툰 게임 신작'],
  'it-tech': ['AI 반도체 기술', '스마트폰 노트북 신제품', '프로그래밍 개발 트렌드'],
  'food': ['맛집 레시피 트렌드', '카페 디저트 신메뉴'],
  'travel': ['여행 관광 명소', '항공 호텔 할인'],
  'pets': ['반려동물 강아지 고양이', '펫 사료 건강'],
  'sports': ['야구 축구 경기결과', '골프 등산 피트니스'],
  'education': ['자격증 시험 일정', '교육 입시 학습'],
}

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
  // 3. 트렌드 키워드 수집
  //    소스 1: 블로그 카테고리별 네이버 뉴스 검색
  //    소스 2: Google Trends 급상승 검색어
  // ──────────────────────────────────────────────

  // 네이버 검색 API 키 확인
  const naverSearchKeyRaw = apiKeys?.find((k: any) => k.provider === 'naver_search')
  let naverSearchKey: { clientId: string; clientSecret: string } | null = null
  if (naverSearchKeyRaw) {
    try {
      naverSearchKey = {
        clientId: decrypt(naverSearchKeyRaw.encrypted_key),
        clientSecret: naverSearchKeyRaw.encrypted_secret ? decrypt(naverSearchKeyRaw.encrypted_secret) : '',
      }
    } catch { /* ignore */ }
  }
  _debug.hasNaverSearchKey = !!naverSearchKey

  const matchedTrends: Array<{ keyword: string; source: string; blogType: string }> = []

  // ──────────────────────────────────────────────
  // 트렌드 시드 생성 전략:
  // 뉴스 제목에서 단어를 추출하는 건 불안정 (동사/조사/오분류)
  // 대신 검증된 카테고리 키워드 + 시간 요소를 조합하여 시드 생성
  // 이 시드는 Scout의 고정 시드와 다르게 "최신", "2026" 등이 붙어
  // 트렌드성 연관 키워드를 반환함
  // ──────────────────────────────────────────────
  const currentYear = new Date().getFullYear()
  // 트렌드 전용 시드 — Scout의 고정 시드와 겹치지 않음
  // 연도 + "트렌드/전망/최신" 키워드로 시간성 반영
  const TREND_SEED_TEMPLATES: Record<string, string[]> = {
    'medical': [`건강트렌드${currentYear}`, `신약승인`, `면역력강화`, `건강기능식품`, `원격진료`],
    'finance': [`주식전망${currentYear}`, `금리전망`, `투자트렌드`, `가상자산`, `공모주`],
    'real-estate': [`부동산전망${currentYear}`, `청약일정`, `분양권`, `전세대출`, `재건축`],
    'entertainment': [`넷플릭스${currentYear}`, `신작드라마`, `웹툰추천`, `페스티벌`, `신곡`],
    'it-tech': [`AI트렌드${currentYear}`, `신제품`, `반도체전망`, `클라우드`, `로봇`],
    'food': [`맛집트렌드${currentYear}`, `신메뉴`, `디저트`, `밀키트신상`, `카페추천`],
    'travel': [`여행트렌드${currentYear}`, `항공권특가`, `신규호텔`, `캠핑장추천`, `비자`],
    'pets': [`반려동물트렌드`, `신제품사료`, `펫보험`, `동물병원`],
    'sports': [`야구${currentYear}`, `축구이적`, `골프장추천`, `러닝대회`, `올림픽`],
    'education': [`자격증${currentYear}`, `공무원시험일정`, `코딩교육`, `온라인강의`],
  }

  // 블로그 카테고리별 트렌드 시드 → 네이버 광고 API
  for (const blogType of Array.from(userBlogTypes)) {
    const seeds = TREND_SEED_TEMPLATES[blogType]
    if (!seeds) continue

    for (const seed of seeds) {
      try {
        const results = await naverAd.getKeywordStats([seed])
        const valid = results
          .filter(r => !existingSet.has(r.keyword))
          .filter(r => r.monthlySearchVolume >= 50 && r.keyword.length >= 4)
          // 반환된 키워드가 실제로 해당 카테고리에 맞는지 재검증
          .filter(r => {
            const verified = matchBlogType(r.keyword, new Set([blogType]))
            return verified === blogType
          })
          .map(r => ({
            keyword: r.keyword,
            volume: r.monthlySearchVolume,
            cpc: r.monthlyAvgCpc || 0,
            competition: competitionToNum(r.compIdx),
            competitiveness: r.monthlySearchVolume / (competitionToNum(r.compIdx) + 1),
          }))
          .sort((a, b) => b.competitiveness - a.competitiveness)
          .slice(0, 5)

        for (const r of valid) {
          matchedTrends.push({ keyword: r.keyword, source: `trend_${blogType}`, blogType })
          existingSet.add(r.keyword)
        }
      } catch { /* 개별 시드 실패 무시 */ }
    }
  }

  _debug.trendSeedTypes = Array.from(userBlogTypes)

  // 중복 제거 (시드 → 광고 API에서 이미 실제 검색 키워드를 받아옴)
  const seen = new Set<string>()
  const uniqueTrends = matchedTrends.filter(t => {
    if (seen.has(t.keyword)) return false
    seen.add(t.keyword)
    return true
  }).slice(0, 30)

  trendFound = uniqueTrends.length
  _debug.totalRawTrends = matchedTrends.length
  _debug.matchedTrends = uniqueTrends.length
  _debug.trendSample = uniqueTrends.slice(0, 10).map(t => `${t.keyword}(${t.source}→${t.blogType})`)

  if (uniqueTrends.length === 0) {
    return { trendFound: 0, expanded: 0, _debug, _errors: ['블로그 카테고리와 매칭되는 트렌드 없음'] }
  }

  // ──────────────────────────────────────────────
  // 4. 2차 롱테일 확장: 1차 결과 상위 → 다시 API
  // ──────────────────────────────────────────────
  const expandedKeywords: Array<{ keyword: string; volume: number; cpc: number; competition: number }> = []
  const toExpand = uniqueTrends.slice(0, 8)

  for (const kw of toExpand) {
    try {
      const results = await naverAd.getKeywordStats([kw.keyword])
      const longTails = results
        .filter(r => r.keyword !== kw.keyword && !existingSet.has(r.keyword) && !seen.has(r.keyword))
        .filter(r => r.monthlySearchVolume >= 30 && r.keyword.length >= 5)
        .map(r => ({
          keyword: r.keyword,
          volume: r.monthlySearchVolume,
          cpc: r.monthlyAvgCpc || 0,
          competition: competitionToNum(r.compIdx),
        }))
        .sort((a, b) => (b.volume / (b.competition + 1)) - (a.volume / (a.competition + 1)))
        .slice(0, 6)

      expandedKeywords.push(...longTails)
      longTails.forEach(r => { existingSet.add(r.keyword); seen.add(r.keyword) })
    } catch (err: any) {
      _errors.push(`2차(${kw.keyword}): ${err.message}`)
    }
  }
  expanded = expandedKeywords.length

  // ──────────────────────────────────────────────
  // 5. stage='expanded'로 저장
  // ──────────────────────────────────────────────
  const allNew = [
    ...uniqueTrends.map(t => ({ keyword: t.keyword, volume: 0, cpc: 0, competition: 50 })),
    ...expandedKeywords,
  ]

  // 1차 키워드는 이미 광고 API에서 받아온 것이므로 데이터가 matchedTrends에 없음
  // 광고 API 결과를 다시 가져와서 데이터 보강 — 이미 있는 건 스킵
  const toInsert: Array<Record<string, unknown>> = []
  for (const r of allNew) {
    toInsert.push({
      user_id: userId,
      keyword_text: r.keyword,
      keyword_type: 'gold' as const,
      stage: 'expanded' as const,
      monthly_search_volume: r.volume,
      cpc_estimate: r.cpc,
      competition_score: r.competition,
    })
  }

  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 50) {
      await supabase.from('keyword_pipeline').insert(toInsert.slice(i, i + 50))
    }
  }

  _debug.expandedCount = expanded
  _debug.totalAdded = toInsert.length
  return { trendFound, expanded, added: toInsert.length, _debug, _errors }
}
