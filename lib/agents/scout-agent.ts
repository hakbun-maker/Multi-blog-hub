/**
 * Scout 에이전트 — 키워드 자동 발굴
 * 블로그 설명/카테고리를 기반으로 경쟁력 있는 롱테일 키워드를 발굴합니다.
 * 시즌 키워드는 보조적으로만 사용합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { EventAPI } from '@/lib/monetize/apis/event-api'
import { ANNUAL_EVENTS } from '@/lib/monetize/constants'
import type { AgentRunResult } from './types'

/**
 * 블로그 설명과 카테고리에서 검색 가능한 시드 키워드를 추출합니다.
 * 예: "건강, 영양, 노화 방지 전문 블로그" → ["건강 관리법", "영양제 추천", "노화 방지 방법"]
 */
function extractSeedsFromBlog(blog: {
  name: string
  description: string | null
  primary_ad_category: string | null
}): string[] {
  const seeds: string[] = []
  const desc = blog.description ?? ''
  const cat = blog.primary_ad_category ?? ''
  const combined = `${blog.name} ${desc} ${cat}`.toLowerCase()

  // 블로그 설명에서 핵심 명사 추출 (한글 2글자 이상 단어)
  const koreanWords = combined.match(/[가-힣]{2,}/g) ?? []
  const meaningfulWords = koreanWords.filter(w =>
    !['블로그', '전문', '관련', '정보', '소개', '대한', '위한', '모든', '최신'].includes(w)
  )

  // 핵심 단어로 검색 가능한 조합 생성
  const suffixes = ['추천', '비교', '방법', '순위', '후기', '가격', '효과', '종류']
  for (const word of meaningfulWords.slice(0, 5)) {
    seeds.push(word)
    // 롱테일: 단어 + 서픽스
    for (const suffix of suffixes.slice(0, 2)) {
      seeds.push(`${word} ${suffix}`)
    }
  }

  // 카테고리 기반 시드 추가
  if (cat) {
    const catSeeds = CATEGORY_SEED_MAP[cat.toLowerCase()]
    if (catSeeds) seeds.push(...catSeeds)
  }

  return Array.from(new Set(seeds)).slice(0, 20)
}

/** 카테고리별 롱테일 시드 키워드 (상위 노출 가능한 구체적 키워드) */
const CATEGORY_SEED_MAP: Record<string, string[]> = {
  tech: ['AI 도구 추천 2026', '노트북 가성비 순위', '아이폰 vs 갤럭시 비교', '프로그래밍 독학 방법', '무료 앱 추천'],
  health: ['혈당 낮추는 음식', '무릎 통증 원인', '비타민D 효능 부작용', '간헐적 단식 방법', '중년 운동 루틴'],
  finance: ['ISA 계좌 장단점', '주식 초보 종목 추천', '부동산 전망 2026', '월배당 ETF 비교', '연금저축 세액공제'],
  food: ['집밥 레시피 간단', '에어프라이어 요리', '밀키트 추천 순위', '다이어트 식단 일주일', '편의점 신상 후기'],
  travel: ['제주도 숨은 명소', '일본 여행 경비', '유럽 자유여행 코스', '국내 글램핑 추천', '비행기표 싸게 사는 법'],
  beauty: ['수분크림 추천 순위', '여드름 흉터 관리', '선크림 성분 비교', '40대 안티에이징', '올리브영 세일 목록'],
  fashion: ['봄 코디 추천 남자', '가성비 브랜드 순위', '명품 입문 가방', '운동화 추천 2026', '오피스룩 코디'],
  parenting: ['유아 영어 교육 시기', '이유식 시작 가이드', '어린이 보험 비교', '초등 학습지 추천', '아기 수면 교육'],
  pets: ['강아지 사료 등급 비교', '고양이 모래 추천', '반려동물 보험 가격', '강아지 훈련 방법', '고양이 구토 원인'],
  education: ['토익 독학 공부법', 'IT 자격증 순위', '코딩 부트캠프 비교', '영어회화 앱 추천', '공무원 시험 과목'],
  entertainment: ['넷플릭스 신작 추천', 'OTT 비교 가격', '인디 게임 추천', 'K-POP 컴백 일정', '웹툰 완결 추천'],
  home: ['원룸 인테리어 꿀팁', '공기청정기 추천 순위', '셀프 인테리어 비용', '음식물 처리기 비교', '이사 체크리스트'],
  auto: ['전기차 보조금 2026', '중고차 시세 확인', '자동차 보험 비교', '타이어 교체 시기', '하이브리드 SUV 추천'],
  sports: ['홈트레이닝 루틴', '런닝화 추천 순위', '골프 입문 비용', '등산 코스 서울 근교', '수영 효과 칼로리'],
  medical: ['건강검진 항목 30대', '혈압약 부작용', '탈모 치료 비용', '치과 임플란트 가격', '갑상선 증상 자가진단'],
  culture: ['뮤지컬 추천 초보', '전시회 일정 서울', '클래식 입문 곡', '독서 모임 온라인', '영화 평점 순위'],
}

export async function runScoutAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'scout', async () => {
    const supabase = getServiceClient()
    let goldFound = 0
    let eventFound = 0
    let seasonFound = 0

    // 1. 사용자의 블로그 목록 (이름, 설명, 카테고리, 언어 포함)
    const { data: blogs } = await supabase
      .from('blogs')
      .select('id, name, description, primary_ad_category, language')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!blogs || blogs.length === 0) return { goldFound: 0, eventFound: 0, seasonFound: 0, total: 0 }

    // 블로그별 시드 키워드 생성 (설명 기반)
    const allSeeds = new Set<string>()
    for (const blog of blogs) {
      const seeds = extractSeedsFromBlog(blog)
      seeds.forEach(s => allSeeds.add(s))
    }

    // API 키 조회
    const { data: apiKeys } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key, encrypted_secret')
      .eq('user_id', userId)
      .in('provider', ['naver_ad', 'naver_search'])
      .eq('is_active', true)

    const naverAdKey = apiKeys?.find(k => k.provider === 'naver_ad')

    // 기존 파이프라인 키워드 (중복 방지)
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
        const results = await naverAd.getKeywordStats(Array.from(allSeeds).slice(0, 20))

        const newKeywords = results
          .filter(r => !existingSet.has(r.keyword))
          .filter(r => NaverAdAPI.getTotalSearchVolume(r) >= 100) // 최소 검색량 필터
          .slice(0, 40)

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
    } else {
      // API 키 없을 때: 블로그 설명 기반 시드 키워드를 직접 등록 (최소한의 발굴)
      const fallbackSeeds = Array.from(allSeeds)
        .filter(s => s.includes(' ')) // 롱테일만 (2단어 이상)
        .filter(s => !existingSet.has(s))
        .slice(0, 15)

      if (fallbackSeeds.length > 0) {
        const rows = fallbackSeeds.map(kw => ({
          user_id: userId,
          keyword_text: kw,
          keyword_type: 'gold',
          stage: 'discovered',
          monthly_search_volume: 0, // API 없으므로 0
        }))
        await supabase.from('keyword_pipeline').insert(rows)
        goldFound = fallbackSeeds.length
        fallbackSeeds.forEach(s => existingSet.add(s))
      }
    }

    // 3. 이벤트 키워드 발굴 (공연/경기/축제)
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

    // 4. 시즌 키워드 (보조적으로만, 롱테일 변환하여 사용)
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

      const seasonalBase: string[] = []
      for (const month of [currentMonth, nextMonth]) {
        const ae = ANNUAL_EVENTS.find(a => a.month === month)
        if (ae) seasonalBase.push(...ae.events)
      }

      // 롱테일로 변환: "어린이날" → "어린이날 선물 추천", "어린이날 나들이 장소"
      const seasonSuffixes = ['선물 추천', '이벤트', '준비물', '나들이 장소', '할인 행사']
      const longTailSeasonal = seasonalBase.flatMap(base =>
        seasonSuffixes.slice(0, 2).map(suffix => `${base} ${suffix}`)
      ).filter(kw => !existingSet.has(kw)).slice(0, 10)

      if (longTailSeasonal.length > 0) {
        const rows = longTailSeasonal.map(kw => ({
          user_id: userId,
          keyword_text: kw,
          keyword_type: 'seasonal',
          stage: 'discovered',
        }))
        await supabase.from('keyword_pipeline').insert(rows)
        seasonFound = longTailSeasonal.length
      }
    } catch (err) {
      console.error('[Scout] Seasonal discovery error:', err)
    }

    return { goldFound, eventFound, seasonFound, total: goldFound + eventFound + seasonFound }
  })
}
