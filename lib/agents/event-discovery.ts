/**
 * 이벤트/공연 키워드 발굴 — D-Day 기반 단계별 키워드 자동 생성
 *
 * 1) EventAPI로 공연/경기/축제/전시 이벤트 수집
 * 2) 날짜가 있는 이벤트만 필터 (D-3 ~ D+60)
 * 3) 이벤트 카테고리별 D-Day 단계에 맞는 키워드 자동 생성
 *    예: "BTS콘서트" → D-30 "BTS콘서트정보총정리", D-7 "BTS콘서트준비물"
 * 4) 네이버 광고 API로 검색량 확인
 * 5) stage='expanded'로 저장 + 발행예정일 자동 설정
 */
import { getServiceClient } from './agent-runner'
import { NaverAdAPI } from '@/lib/monetize/apis/naver-ad-api'
import { EventAPI } from '@/lib/monetize/apis/event-api'
import { decrypt } from '@/lib/utils/encryption'
import type { IntentType } from '@/types/monetize'

// 이벤트 카테고리별 D-Day 단계 설정
const EVENT_PHASES: Record<string, { dDayOffset: number; intentType: IntentType; suffix: string }[]> = {
  concert: [
    { dDayOffset: -30, intentType: 'INFO', suffix: '정보총정리' },
    { dDayOffset: -14, intentType: 'COMPARE', suffix: '좌석추천가격비교' },
    { dDayOffset: -7, intentType: 'AD', suffix: '준비물주변맛집' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기현장리뷰' },
  ],
  sports: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '경기일정정보' },
    { dDayOffset: -1, intentType: 'COMPARE', suffix: '승부예측분석' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '경기결과하이라이트' },
  ],
  festival: [
    { dDayOffset: -21, intentType: 'INFO', suffix: '일정프로그램안내' },
    { dDayOffset: -7, intentType: 'AD', suffix: '입장권교통편준비' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '축제후기현장' },
  ],
  exhibition: [
    { dDayOffset: -14, intentType: 'INFO', suffix: '전시정보관람포인트' },
    { dDayOffset: -3, intentType: 'AD', suffix: '티켓예매할인' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '관람후기' },
  ],
  other: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '정보' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기' },
  ],
}

function inferCategory(title: string): string {
  if (/콘서트|공연|뮤지컬|팬미팅|가수|아이돌/.test(title)) return 'concert'
  if (/야구|축구|농구|KBO|K리그|경기/.test(title)) return 'sports'
  if (/축제|페스티벌|코첼라/.test(title)) return 'festival'
  if (/전시|박람회|미술/.test(title)) return 'exhibition'
  return 'other'
}

export async function runEventDiscovery(userId: string) {
  const supabase = getServiceClient()
  let eventsFound = 0
  let keywordsGenerated = 0
  const _debug: Record<string, unknown> = {}
  const _errors: string[] = []

  // 1. 블로그 확인 (entertainment 블로그가 있어야 의미 있음)
  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, name, blog_type, language')
    .eq('user_id', userId)
    .eq('is_active', true)

  const entertainmentBlog = (blogs ?? []).find(
    (b: any) => b.blog_type === 'entertainment' && (b.language === 'ko' || !b.language)
  )
  if (!entertainmentBlog) {
    return { eventsFound: 0, keywordsGenerated: 0, _debug, _errors: ['엔터테인먼트 블로그 없음'] }
  }
  _debug.blogName = (entertainmentBlog as any).name

  // 2. API 키
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key, encrypted_secret, encrypted_extra')
    .eq('user_id', userId)
    .in('provider', ['naver_ad', 'naver_search'])
    .eq('is_active', true)

  const naverAdKeyRaw = apiKeys?.find((k: any) => k.provider === 'naver_ad')
  if (!naverAdKeyRaw) {
    return { eventsFound: 0, keywordsGenerated: 0, _debug, _errors: ['네이버 광고 API 키 없음'] }
  }

  let naverAdKey: { apiKey: string; secretKey: string; customerId: string }
  try {
    naverAdKey = {
      apiKey: decrypt(naverAdKeyRaw.encrypted_key),
      secretKey: naverAdKeyRaw.encrypted_secret ? decrypt(naverAdKeyRaw.encrypted_secret) : '',
      customerId: naverAdKeyRaw.encrypted_extra ? decrypt(naverAdKeyRaw.encrypted_extra) : '',
    }
  } catch {
    return { eventsFound: 0, keywordsGenerated: 0, _debug, _errors: ['API 키 복호화 실패'] }
  }

  const naverAd = new NaverAdAPI()
  naverAd.initializeWithKeys(naverAdKey.apiKey, naverAdKey.secretKey, naverAdKey.customerId)

  // 기존 키워드
  const { data: existingAll } = await supabase
    .from('keyword_pipeline')
    .select('keyword_text')
    .eq('user_id', userId)
  const existingSet = new Set((existingAll ?? []).map((p: any) => p.keyword_text))

  // ──────────────────────────────────────────────
  // 3. EventAPI로 이벤트 수집
  // ──────────────────────────────────────────────
  const eventAPI = new EventAPI(userId)
  await eventAPI.initializeWithClient(supabase)
  const allEvents = await eventAPI.fetchAllEvents()

  // 날짜가 있고, D-3 ~ D+60 범위인 이벤트만
  const validEvents = allEvents
    .filter(e => e.date && e.dDay !== null && e.dDay >= -3 && e.dDay <= 60)
    .slice(0, 15) // 최대 15개 이벤트

  eventsFound = validEvents.length
  _debug.totalEvents = allEvents.length
  _debug.validEvents = validEvents.length
  _debug.eventSample = validEvents.slice(0, 5).map(e =>
    `${e.title}(${e.category}, D${e.dDay! >= 0 ? '+' : ''}${e.dDay}, ${e.date})`
  )

  if (validEvents.length === 0) {
    return { eventsFound: 0, keywordsGenerated: 0, _debug, _errors: ['날짜가 있는 이벤트 없음'] }
  }

  // ──────────────────────────────────────────────
  // 4. 이벤트별 D-Day 단계 키워드 생성
  // ──────────────────────────────────────────────
  const compScore = (c: string) => c === '높음' ? 80 : c === '낮음' ? 20 : 50
  const now = new Date()

  for (const event of validEvents) {
    const eventTitle = event.title.replace(/<[^>]*>/g, '').trim()
    // 이벤트명에서 핵심 단어 추출 (공백 제거, 15자 이내)
    const eventSeed = eventTitle.replace(/\s+/g, '').slice(0, 15)
    const category = inferCategory(eventTitle)
    const phases = EVENT_PHASES[category] ?? EVENT_PHASES.other
    const eventDate = new Date(event.date!)

    for (const phase of phases) {
      // 발행 예정일 계산
      const publishDate = new Date(eventDate)
      publishDate.setDate(publishDate.getDate() + phase.dDayOffset)

      // 이미 지난 발행일은 건너뜀
      if (publishDate < now) continue

      // 키워드 생성: "이벤트명 + 단계 suffix"
      const phaseKeyword = `${eventSeed}${phase.suffix}`.replace(/\s+/g, '')

      if (existingSet.has(phaseKeyword) || phaseKeyword.length > 25) continue

      // 네이버 광고 API로 검색량 확인
      try {
        const results = await naverAd.getKeywordStats([eventSeed])
        const mainResult = results.find(r => r.keyword === eventSeed)
        const volume = mainResult?.monthlySearchVolume ?? 0

        await supabase.from('keyword_pipeline').insert({
          user_id: userId,
          keyword_text: phaseKeyword,
          keyword_type: 'event',
          stage: 'expanded',
          monthly_search_volume: volume,
          cpc_estimate: mainResult?.monthlyAvgCpc ?? 0,
          competition_score: mainResult ? compScore(mainResult.compIdx) : 50,
          intent_type: phase.intentType,
          assigned_blog_id: (entertainmentBlog as any).id,
          assigned_blog_name: (entertainmentBlog as any).name,
          scheduled_date: publishDate.toISOString().split('T')[0],
          scheduled_time: '09:00',
          event_title: eventTitle,
          event_date: event.date,
          event_d_day: phase.dDayOffset,
          event_phase: phase.dDayOffset <= -14 ? 'pre_info'
            : phase.dDayOffset <= -3 ? 'comparison'
            : phase.dDayOffset <= 0 ? 'preparation'
            : 'review',
        })

        existingSet.add(phaseKeyword)
        keywordsGenerated++
      } catch (err: any) {
        _errors.push(`${eventSeed}: ${err.message}`)
      }
    }
  }

  _debug.keywordsGenerated = keywordsGenerated
  return { eventsFound, keywordsGenerated, _debug, _errors }
}
