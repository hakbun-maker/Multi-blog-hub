import type { Grade, IntentType, PasonaWeights, BlogLanguage } from '@/types/monetize'

// SEO Opportunity Score 가중치
// 블로그 SEO 핵심: "경쟁 낮고 검색량 있는 키워드" = 상위 노출 가능성
// CPC는 네이버 API가 직접 제공하지 않으므로 비중 최소화
export const REVENUE_SCORE_WEIGHTS = {
  traffic: 0.25,     // 검색량 — 충분한 트래픽이 있는가
  revenue: 0.10,     // CPC — 추정값이므로 비중 최소
  difficulty: 0.45,  // 경쟁도 — 가장 중요! 낮을수록 높은 점수
  trend: 0.20,       // 트렌드 — 상승 중인 키워드 우대
} as const

// 자동 발행 임계값
export const AUTO_PUBLISH_THRESHOLD = 45

// 검수 만점
export const MAX_QUALITY_SCORE = 50

// 등급 기준 (블로그 SEO 기준)
// 경쟁도 비중이 높으므로 롱테일 키워드가 A/S 등급에 도달 가능
export const GRADE_THRESHOLDS: Record<Grade, { min: number; max: number }> = {
  S: { min: 80, max: 100 },
  A: { min: 65, max: 79 },
  B: { min: 50, max: 64 },
  C: { min: 35, max: 49 },
  D: { min: 0, max: 34 },
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
