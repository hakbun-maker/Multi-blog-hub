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
import { EVENT_PHASES, inferEventCategory, competitionToNum } from './shared'
import type { IntentType } from '@/types/monetize'

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

  // A. 날짜 있는 이벤트: D-7 ~ D+90 범위 (확대)
  const datedEvents = allEvents
    .filter(e => e.date && e.dDay !== null && e.dDay >= -7 && e.dDay <= 90)
    .slice(0, 15)

  // B. 날짜 없는 이벤트: 공연/축제 카테고리만 (이벤트명으로 키워드 생성)
  const undatedEvents = allEvents
    .filter(e => !e.date && (e.category === 'concert' || e.category === 'festival' || e.category === 'sports'))
    .slice(0, 10)

  const validEvents = [...datedEvents, ...undatedEvents]
  eventsFound = validEvents.length
  _debug.totalEvents = allEvents.length
  _debug.datedEvents = datedEvents.length
  _debug.undatedEvents = undatedEvents.length
  _debug.eventSample = validEvents.slice(0, 8).map(e =>
    `${e.title.slice(0, 20)}(${e.category}, ${e.date ? `D${e.dDay! >= 0 ? '+' : ''}${e.dDay}` : '날짜없음'})`
  )

  if (validEvents.length === 0) {
    return { eventsFound: 0, keywordsGenerated: 0, _debug, _errors: ['이벤트 없음'] }
  }

  // ──────────────────────────────────────────────
  // 4. 이벤트별 D-Day 단계 키워드 생성
  // ──────────────────────────────────────────────
  // competitionToNum은 shared.ts에서 import
  const now = new Date()

  // 이벤트명 → 네이버 광고 API 결과 캐시 (동일 시드 중복 호출 방지)
  const seedCache = new Map<string, { volume: number; cpc: number; comp: number }>()

  for (const event of validEvents) {
    const eventTitle = event.title.replace(/<[^>]*>/g, '').trim()
    const eventSeed = eventTitle.replace(/\s+/g, '').slice(0, 15)
    if (eventSeed.length < 3) continue

    const category = inferEventCategory(eventTitle)
    const phases = EVENT_PHASES[category] ?? EVENT_PHASES.other

    // 네이버 광고 API로 검색량 확인 (캐시)
    if (!seedCache.has(eventSeed)) {
      try {
        const results = await naverAd.getKeywordStats([eventSeed])
        const mainResult = results.find(r => r.keyword === eventSeed)
        seedCache.set(eventSeed, {
          volume: mainResult?.monthlySearchVolume ?? 0,
          cpc: mainResult?.monthlyAvgCpc ?? 0,
          comp: mainResult ? competitionToNum(mainResult.compIdx) : 50,
        })
      } catch {
        seedCache.set(eventSeed, { volume: 0, cpc: 0, comp: 50 })
      }
    }
    const seedData = seedCache.get(eventSeed)!

    if (event.date) {
      // A. 날짜 있는 이벤트 → D-Day 단계별 키워드 생성
      const eventDate = new Date(event.date)

      for (const phase of phases) {
        const publishDate = new Date(eventDate)
        publishDate.setDate(publishDate.getDate() + phase.dDayOffset)
        if (publishDate < now) continue

        const phaseKeyword = `${eventSeed}${phase.suffix}`.replace(/\s+/g, '')
        if (existingSet.has(phaseKeyword) || phaseKeyword.length > 30) continue

        try {
          await supabase.from('keyword_pipeline').insert({
            user_id: userId,
            keyword_text: phaseKeyword,
            keyword_type: 'event',
            stage: 'expanded',
            monthly_search_volume: seedData.volume,
            cpc_estimate: seedData.cpc,
            competition_score: seedData.comp,
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
          _errors.push(`dated(${eventSeed}): ${err.message}`)
        }
      }
    } else {
      // B. 날짜 없는 이벤트 → INFO + REVIEW 키워드만 생성 (발행일 없음)
      const basicSuffixes = [
        { suffix: '정보총정리', intentType: 'INFO' as IntentType },
        { suffix: '후기', intentType: 'REVIEW' as IntentType },
        { suffix: '티켓예매', intentType: 'AD' as IntentType },
      ]

      for (const { suffix, intentType } of basicSuffixes) {
        const kw = `${eventSeed}${suffix}`.replace(/\s+/g, '')
        if (existingSet.has(kw) || kw.length > 30) continue

        try {
          await supabase.from('keyword_pipeline').insert({
            user_id: userId,
            keyword_text: kw,
            keyword_type: 'event',
            stage: 'expanded',
            monthly_search_volume: seedData.volume,
            cpc_estimate: seedData.cpc,
            competition_score: seedData.comp,
            intent_type: intentType,
            assigned_blog_id: (entertainmentBlog as any).id,
            assigned_blog_name: (entertainmentBlog as any).name,
            event_title: eventTitle,
          })
          existingSet.add(kw)
          keywordsGenerated++
        } catch (err: any) {
          _errors.push(`undated(${eventSeed}): ${err.message}`)
        }
      }
    }

    // 이벤트 처리 완료 후 다음 (중복 방지를 위해 continue 전에 skip 체크 없음)
    if (keywordsGenerated >= 60) break // 최대 60개 키워드

  }

  _debug.keywordsGenerated = keywordsGenerated
  return { eventsFound, keywordsGenerated, _debug, _errors }
}
