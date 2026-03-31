import type { IntentType } from '@/types/monetize'

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface EventInput {
  title: string
  date: string // YYYY-MM-DD
  category: 'concert' | 'sports' | 'festival' | 'exhibition' | 'other'
  venue?: string
  source: string
}

export interface EventClusterKeyword {
  keyword: string
  eventTitle: string
  eventDate: string
  scheduledDate: string // When this keyword should be published (YYYY-MM-DD)
  intentType: IntentType
  phase: 'pre_info' | 'comparison' | 'preparation' | 'review'
  dDay: number // Positive = future (D-N before event), negative = past (D+N after event)
  priority: number // Higher = more important
}

export interface EventClusterResult {
  event: EventInput
  keywords: EventClusterKeyword[]
  skippedPhases: string[] // Phases that were skipped (already past)
}

// ---------------------------------------------------------------------------
// Phase type (declared before CATEGORY_PATTERNS which references it)
// ---------------------------------------------------------------------------

type EventPhase = 'pre_info' | 'comparison' | 'preparation' | 'review'

// ---------------------------------------------------------------------------
// Category-specific keyword patterns (exported for external extension)
// ---------------------------------------------------------------------------

export const CATEGORY_PATTERNS: Record<
  EventInput['category'],
  Record<EventPhase, string[]>
> = {
  concert: {
    pre_info: ['정보', '라인업', '출연진', '세트리스트'],
    comparison: ['좌석 추천', '가격 비교', '티켓 예매 방법', '좌석 배치도'],
    preparation: ['준비물', '교통편', '주변 맛집', '드레스코드'],
    review: ['후기', '현장 사진', '콘서트 직캠', '떼창'],
  },
  sports: {
    pre_info: ['일정', '선발 라인업', '전력 분석'],
    comparison: ['승부 예측', '맞대결 전적', '배당률'],
    preparation: ['좌석 추천', '직관 준비물', '응원 도구'],
    review: ['결과', '하이라이트', '경기 리뷰', 'MVP'],
  },
  festival: {
    pre_info: ['정보', '라인업', '타임테이블'],
    comparison: ['가격 비교', '1일권 vs 통합권'],
    preparation: ['준비물', '교통편', '캠핑 정보'],
    review: ['후기', '현장 사진', '베스트 무대'],
  },
  exhibition: {
    pre_info: ['정보', '작품 소개', '작가'],
    comparison: ['입장료 할인', '예매 vs 현장'],
    preparation: ['관람 동선', '주변 카페'],
    review: ['후기', '감상평', '포토존'],
  },
  other: {
    pre_info: ['정보', '일정'],
    comparison: ['가격', '예매'],
    preparation: ['준비', '교통'],
    review: ['후기', '현장'],
  },
}

// ---------------------------------------------------------------------------
// Phase intent mapping
// ---------------------------------------------------------------------------

/** Default intent type per phase keyword suffix */
const PHASE_DEFAULT_INTENT: Record<EventPhase, IntentType> = {
  pre_info: 'INFO',
  comparison: 'COMPARE',
  preparation: 'AD',
  review: 'REVIEW',
}

/**
 * Some keywords within a phase carry a different intent than the phase default.
 * This map overrides the default for specific suffix strings.
 */
const KEYWORD_INTENT_OVERRIDES: Record<string, IntentType> = {
  // comparison phase
  '티켓 예매 방법': 'AD',
  '배당률': 'AD',
  '입장료 할인': 'AD',
  '예매 vs 현장': 'AD',
  '예매': 'AD',

  // preparation phase
  '교통편': 'INFO',
  '주변 맛집': 'AD',
  '주변 카페': 'AD',
  '직관 준비물': 'AD',
  '준비물': 'AD',
  '드레스코드': 'INFO',
  '캠핑 정보': 'INFO',
  '좌석 추천': 'COMPARE',
  '관람 동선': 'INFO',
  '응원 도구': 'AD',
  '교통': 'INFO',
  '준비': 'AD',

  // review phase
  '현장 사진': 'TREND',
  '콘서트 직캠': 'TREND',
  '떼창': 'TREND',
  '현장': 'TREND',
  '하이라이트': 'TREND',
  '베스트 무대': 'TREND',
  '포토존': 'TREND',
  '사진': 'TREND',
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse YYYY-MM-DD string to a UTC midnight Date to avoid timezone drift */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

/** Format a Date to YYYY-MM-DD string (UTC) */
function formatDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Return today as UTC midnight Date */
function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Add days to a Date, returning a new Date */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

/** Resolve intent for a keyword suffix within a given phase */
function resolveIntent(suffix: string, phase: EventPhase): IntentType {
  return KEYWORD_INTENT_OVERRIDES[suffix] ?? PHASE_DEFAULT_INTENT[phase]
}

// ---------------------------------------------------------------------------
// Phase builders
// ---------------------------------------------------------------------------

interface PhaseContext {
  event: EventInput
  eventDate: Date
  today: Date
  currentDDay: number // positive = before event, negative = after event
}

function buildPhaseKeywords(
  ctx: PhaseContext,
  phase: EventPhase,
  scheduledDate: Date,
  dDay: number,
  priority: number,
  suffixes: string[],
  venueOnlySuffixes?: string[]
): EventClusterKeyword[] {
  const scheduledDateStr = formatDate(scheduledDate)
  const keywords: EventClusterKeyword[] = []

  for (const suffix of suffixes) {
    // Skip venue-specific keywords when venue is absent
    if (venueOnlySuffixes?.includes(suffix) && !ctx.event.venue) continue

    keywords.push({
      keyword: `${ctx.event.title} ${suffix}`,
      eventTitle: ctx.event.title,
      eventDate: ctx.event.date,
      scheduledDate: scheduledDateStr,
      intentType: resolveIntent(suffix, phase),
      phase,
      dDay,
      priority,
    })
  }

  return keywords
}

// ---------------------------------------------------------------------------
// Core single-event engine
// ---------------------------------------------------------------------------

export function createEventCluster(event: EventInput): EventClusterResult {
  const today = todayUtc()
  const eventDate = parseDate(event.date)

  // Positive = days remaining before event; negative = days since event ended
  const currentDDay = Math.round(
    (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  const patterns = CATEGORY_PATTERNS[event.category]
  const keywords: EventClusterKeyword[] = []
  const skippedPhases: string[] = []

  // ----- Phase 1: pre_info (D-30) -----
  if (currentDDay < 25) {
    skippedPhases.push('pre_info')
  } else {
    const scheduledDate = addDays(eventDate, -30)
    // If the calculated schedule date is already past, publish today
    const effectiveDate = scheduledDate < today ? today : scheduledDate

    keywords.push(
      ...buildPhaseKeywords(
        { event, eventDate, today, currentDDay },
        'pre_info',
        effectiveDate,
        30,
        3,
        patterns.pre_info
      )
    )
  }

  // ----- Phase 2: comparison (D-14) -----
  if (currentDDay < 10) {
    skippedPhases.push('comparison')
  } else {
    const scheduledDate = addDays(eventDate, -14)
    const effectiveDate = scheduledDate < today ? today : scheduledDate

    keywords.push(
      ...buildPhaseKeywords(
        { event, eventDate, today, currentDDay },
        'comparison',
        effectiveDate,
        14,
        5,
        patterns.comparison
      )
    )
  }

  // ----- Phase 3: preparation (D-7) -----
  if (currentDDay < 3) {
    skippedPhases.push('preparation')
  } else {
    const scheduledDate = addDays(eventDate, -7)
    const effectiveDate = scheduledDate < today ? today : scheduledDate

    // Venue-specific suffixes differ by category
    const venueOnlySuffixes: Record<EventInput['category'], string[]> = {
      concert: ['주변 맛집', '드레스코드'],
      sports: ['좌석 추천', '응원 도구'],
      festival: ['캠핑 정보'],
      exhibition: ['주변 카페', '관람 동선'],
      other: ['교통'],
    }

    keywords.push(
      ...buildPhaseKeywords(
        { event, eventDate, today, currentDDay },
        'preparation',
        effectiveDate,
        7,
        7,
        patterns.preparation,
        event.venue ? [] : venueOnlySuffixes[event.category]
      )
    )
  }

  // ----- Phase 4: review (D-Day to D+3) -----
  // Include only if the event hasn't been over for more than 3 days
  if (currentDDay < -3) {
    skippedPhases.push('review')
  } else {
    // Schedule date is event day itself
    const effectiveDate = eventDate < today ? today : eventDate

    keywords.push(
      ...buildPhaseKeywords(
        { event, eventDate, today, currentDDay },
        'review',
        effectiveDate,
        0,
        9,
        patterns.review
      )
    )
  }

  // ----- Deduplication within this event -----
  const deduped = deduplicateKeywords(keywords)

  return {
    event,
    keywords: deduped,
    skippedPhases,
  }
}

// ---------------------------------------------------------------------------
// Batch function
// ---------------------------------------------------------------------------

export function createEventClusters(events: EventInput[]): EventClusterResult[] {
  return events.map(createEventCluster)
}

// ---------------------------------------------------------------------------
// Deduplication helper
// ---------------------------------------------------------------------------

/**
 * When the same keyword text appears more than once (e.g. two phases produce
 * an identical string), keep only the entry with the higher priority value.
 */
function deduplicateKeywords(keywords: EventClusterKeyword[]): EventClusterKeyword[] {
  const map = new Map<string, EventClusterKeyword>()

  for (const kw of keywords) {
    const existing = map.get(kw.keyword)
    if (!existing || kw.priority > existing.priority) {
      map.set(kw.keyword, kw)
    }
  }

  return Array.from(map.values())
}
