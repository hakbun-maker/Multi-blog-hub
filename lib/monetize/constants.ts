import type { Grade, IntentType, PasonaWeights, BlogLanguage } from '@/types/monetize'

// ─── 키워드 등급 평가 4축 (기획서 기준) ───────────────────────────
// ① 검색 의도 강도: 40점 — 구매/행동 의도가 구체적일수록 높은 점수
// ② 경쟁 강도 역산: 30점 — 롱테일 + 낮은 경쟁 = 상위 노출 가능
// ③ 수익 연결성:   20점 — 제품 구매/고CPC 카테고리 직결
// ④ 콘텐츠 확장성: 10점 — 시리즈/내부링크 확장 가능성

// Intent별 검색 의도 점수 (40점 만점)
export const INTENT_SCORE: Record<IntentType, number> = {
  AD: 40,       // 구매/행동 직전
  COMPARE: 30,  // 비교/선택
  REVIEW: 25,   // 경험 검증
  CRITIC: 20,   // 비판적 탐색
  INFO: 15,     // 정보 수집
  TREND: 10,    // 트렌드/뉴스
}

// AdSense 카테고리별 보정값 (기획서: AdSense 카테고리별 가중치.txt)
export const CATEGORY_BONUS: Record<string, {
  intentBonus: number
  competitionBonus: number
  revenueBonus: number
  expansionBonus: number
  total: number
  gradeOffset: number // S등급 기준 하향폭
}> = {
  'medical':       { intentBonus: 5, competitionBonus: -3, revenueBonus: 7, expansionBonus: 4, total: 13, gradeOffset: 13 },
  'finance':       { intentBonus: 5, competitionBonus: -3, revenueBonus: 8, expansionBonus: 3, total: 13, gradeOffset: 13 },
  'real-estate':   { intentBonus: 4, competitionBonus: -3, revenueBonus: 7, expansionBonus: 3, total: 11, gradeOffset: 11 },
  'entertainment': { intentBonus: 1, competitionBonus: 0,  revenueBonus: 1, expansionBonus: 2, total: 4,  gradeOffset: 4 },
  'it-tech':       { intentBonus: 3, competitionBonus: -2, revenueBonus: 4, expansionBonus: 3, total: 8,  gradeOffset: 8 },
  'food':          { intentBonus: 1, competitionBonus: 0,  revenueBonus: 2, expansionBonus: 2, total: 5,  gradeOffset: 5 },
  'travel':        { intentBonus: 2, competitionBonus: -1, revenueBonus: 3, expansionBonus: 3, total: 7,  gradeOffset: 7 },
  'pets':          { intentBonus: 2, competitionBonus: -1, revenueBonus: 3, expansionBonus: 2, total: 6,  gradeOffset: 6 },
  'sports':        { intentBonus: 2, competitionBonus: -1, revenueBonus: 3, expansionBonus: 3, total: 7,  gradeOffset: 7 },
  'education':     { intentBonus: 3, competitionBonus: -2, revenueBonus: 4, expansionBonus: 3, total: 8,  gradeOffset: 8 },
}

// 등급 기준 (보정 전 기본 — 100점 만점)
// 카테고리 보정으로 등급컷이 하향됨 (medical S: 85-13=72점)
export const GRADE_THRESHOLDS: Record<Grade, { min: number; max: number }> = {
  S: { min: 85, max: 100 },
  A: { min: 70, max: 84 },
  B: { min: 55, max: 69 },
  C: { min: 40, max: 54 },
  D: { min: 0, max: 39 },
}

// 하위 호환: 기존 코드에서 참조하는 가중치 (utils.ts에서 사용)
export const REVENUE_SCORE_WEIGHTS = {
  traffic: 0,      // 사용 안 함 (새 4축 체계로 대체)
  revenue: 0,
  difficulty: 0,
  trend: 0,
} as const

// 자동 발행 임계값
export const AUTO_PUBLISH_THRESHOLD = 45

// 검수 만점
export const MAX_QUALITY_SCORE = 50

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
