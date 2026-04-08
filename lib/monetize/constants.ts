import type { Grade, IntentType, PasonaWeights, BlogLanguage } from '@/types/monetize'

// Revenue Score 가중치
// - traffic(검색량): 네이버 광고 API에서 안정적으로 제공
// - revenue(CPC): 네이버 monthlyAvgCpc 활용 (Google KWP 보조)
// - difficulty(경쟁도): 네이버 compIdx에서 제공
// - trend(트렌드): DataLab API에서 제공 (실패 시 기본값 주의)
export const REVENUE_SCORE_WEIGHTS = {
  traffic: 0.30,
  revenue: 0.30,
  difficulty: 0.25,
  trend: 0.15,
} as const

// 자동 발행 임계값
export const AUTO_PUBLISH_THRESHOLD = 45

// 검수 만점
export const MAX_QUALITY_SCORE = 50

// 등급 기준
export const GRADE_THRESHOLDS: Record<Grade, { min: number; max: number }> = {
  S: { min: 90, max: 100 },
  A: { min: 75, max: 89 },
  B: { min: 60, max: 74 },
  C: { min: 45, max: 59 },
  D: { min: 0, max: 44 },
}

// Intent 우선순위 점수 (IPS)
export const INTENT_PRIORITY: Record<IntentType, number> = {
  AD: 1.0,
  COMPARE: 0.9,
  REVIEW: 0.7,
  CRITIC: 0.5,
  INFO: 0.4,
  TREND: 0.2,
}

// Intent × BlogGrade 적합도 매트릭스 (0 = 부적합, 1~3 = 적합도)
export const INTENT_BLOG_FIT: Record<IntentType, Record<Grade, number>> = {
  AD:      { S: 3, A: 2, B: 1, C: 1, D: 0 },
  COMPARE: { S: 3, A: 2, B: 1, C: 1, D: 0 },
  REVIEW:  { S: 2, A: 3, B: 2, C: 1, D: 0 },
  CRITIC:  { S: 2, A: 3, B: 2, C: 1, D: 0 },
  INFO:    { S: 1, A: 2, B: 3, C: 2, D: 1 },
  TREND:   { S: 0, A: 1, B: 3, C: 2, D: 1 },
}

// Intent별 PASONA 가중치 매트릭스
export const PASONA_WEIGHTS: Record<IntentType, PasonaWeights> = {
  AD:      { P: 15, A: 15, S: 10, O: 30, N: 10, A2: 20 },
  REVIEW:  { P: 10, A: 10, S: 30, O: 20, N: 15, A2: 15 },
  INFO:    { P: 10, A: 10, S: 35, O: 15, N: 20, A2: 10 },
  CRITIC:  { P: 20, A: 20, S: 25, O: 10, N: 15, A2: 10 },
  COMPARE: { P: 10, A: 10, S: 30, O: 25, N: 15, A2: 10 },
  TREND:   { P: 15, A: 15, S: 25, O: 15, N: 15, A2: 15 },
}

// 연간 이벤트 캘린더 (시즌 키워드 기준)
export const ANNUAL_EVENTS: { month: number; events: string[] }[] = [
  { month: 1, events: ['신년', '새해', '설날', '겨울방학', 'CES'] },
  { month: 2, events: ['발렌타인데이', '졸업시즌', '입학준비'] },
  { month: 3, events: ['화이트데이', '벚꽃', '이사시즌', '개학'] },
  { month: 4, events: ['봄나들이', '식목일', '코첼라'] },
  { month: 5, events: ['어버이날', '어린이날', '가정의달', '석가탄신일'] },
  { month: 6, events: ['여름준비', '장마', '워터파크', '중간고사'] },
  { month: 7, events: ['여름휴가', '바캉스', '여름세일', '복날'] },
  { month: 8, events: ['광복절', '여름방학', '가을준비'] },
  { month: 9, events: ['추석', '가을여행', '개강'] },
  { month: 10, events: ['핼러윈', '가을축제', '단풍'] },
  { month: 11, events: ['블랙프라이데이', '수능', '빼빼로데이', '김장'] },
  { month: 12, events: ['크리스마스', '연말', '송년회', '겨울여행'] },
]

// 언어별 데이터소스 설정
export const LANGUAGE_DATA_SOURCE: Record<BlogLanguage, { primary: string; secondary: string; timezone: string }> = {
  ko: { primary: 'naver_ad', secondary: 'google_kwp', timezone: 'Asia/Seoul' },
  en: { primary: 'google_kwp', secondary: 'google_kwp', timezone: 'America/Los_Angeles' },
  ja: { primary: 'google_kwp', secondary: 'google_kwp', timezone: 'Asia/Tokyo' },
  de: { primary: 'google_kwp', secondary: 'google_kwp', timezone: 'Europe/Berlin' },
  pt_br: { primary: 'google_kwp', secondary: 'google_kwp', timezone: 'America/Sao_Paulo' },
  es: { primary: 'google_kwp', secondary: 'google_kwp', timezone: 'Europe/Madrid' },
}

// 언어별 기본 제휴 플랫폼
export const LANGUAGE_DEFAULT_AFFILIATE: Record<BlogLanguage, 'coupang' | 'amazon'> = {
  ko: 'coupang',
  en: 'amazon',
  ja: 'amazon',
  de: 'amazon',
  pt_br: 'amazon',
  es: 'amazon',
}
