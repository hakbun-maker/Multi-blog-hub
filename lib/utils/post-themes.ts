/**
 * 블로그 글 디자인 컬러 테마 — 10개
 *
 * 출처: docs/etc/SEO 최적화 정부정책 블로그 지침.txt
 * 외부 플랫폼(Tistory 등)이 외부 CSS를 차단하므로 모든 색은 인라인 스타일로 주입된다.
 *
 * 현재 적용 범위: 표(table/th/td/tr)
 * 향후 확장: 메타 박스, 팁/주의 박스, h2 헤딩 강조선, 목차 박스, 해시태그 박스 등
 */

export type PostThemeId =
  | 'blue-gray'
  | 'green-orange'
  | 'purple-yellow'
  | 'teal-lightgray'
  | 'terracotta-lightgray'
  | 'classic-blue'
  | 'nature-green'
  | 'royal-purple'
  | 'future-teal'
  | 'earth-terracotta'

export interface PostTheme {
  id: PostThemeId
  label: string
  feel: string
  /** 제목/링크/포커스 색 (h2 강조선, 목차 링크 등에 사용) */
  primary: string
  /** primary의 진한 변형 (강조) */
  primaryDark: string
  /** th 배경 — 부드러운 그레이/톤 */
  thBg: string
  /** 짝수행 zebra 배경 */
  evenRow: string
  /** 표 셀 테두리 */
  border: string
  /** 메타/팁 박스 배경 */
  tipBg: string
  /** 경고 박스 배경 */
  warnBg: string
  /** 경고 박스 강조선 */
  warnAccent: string
  /** 하이라이트 형광 배경 */
  highlight: string
}

const THEMES: Record<PostThemeId, PostTheme> = {
  'blue-gray': {
    id: 'blue-gray', label: '블루-그레이', feel: '차분하고 전문적',
    primary: '#1a73e8', primaryDark: '#0056b3',
    thBg: '#f5f5f5', evenRow: '#f9f9f9', border: '#dddddd',
    tipBg: '#e8f4fd', warnBg: '#ffebee', warnAccent: '#f44336',
    highlight: '#fffde7',
  },
  'green-orange': {
    id: 'green-orange', label: '그린-오렌지', feel: '활기차고 친근',
    primary: '#2e7d32', primaryDark: '#1b5e20',
    thBg: '#f1f8e9', evenRow: '#f9fbe7', border: '#c5e1a5',
    tipBg: '#fff3e0', warnBg: '#ffebee', warnAccent: '#ff7043',
    highlight: '#fff9c4',
  },
  'purple-yellow': {
    id: 'purple-yellow', label: '퍼플-옐로우', feel: '세련되고 창의적',
    primary: '#6a1b9a', primaryDark: '#4a148c',
    thBg: '#f3e5f5', evenRow: '#fafafa', border: '#ce93d8',
    tipBg: '#fff8e1', warnBg: '#fce4ec', warnAccent: '#ec407a',
    highlight: '#fff59d',
  },
  'teal-lightgray': {
    id: 'teal-lightgray', label: '틸-라이트그레이', feel: '안정적이고 현대적',
    primary: '#00838f', primaryDark: '#006064',
    thBg: '#eceff1', evenRow: '#f5f7f8', border: '#b0bec5',
    tipBg: '#e0f7fa', warnBg: '#fff3e0', warnAccent: '#ff8a65',
    highlight: '#fff9c4',
  },
  'terracotta-lightgray': {
    id: 'terracotta-lightgray', label: '테라코타-라이트그레이', feel: '따뜻하고 편안',
    primary: '#bf5b3e', primaryDark: '#8d3b1f',
    thBg: '#f5f0ec', evenRow: '#fbf7f4', border: '#d7ccc8',
    tipBg: '#fff3e0', warnBg: '#ffebee', warnAccent: '#e57373',
    highlight: '#ffe0b2',
  },
  'classic-blue': {
    id: 'classic-blue', label: '클래식 블루', feel: '신뢰할 수 있고 안정적',
    primary: '#0d47a1', primaryDark: '#002171',
    thBg: '#e3f2fd', evenRow: '#f5f9ff', border: '#90caf9',
    tipBg: '#e3f2fd', warnBg: '#ffebee', warnAccent: '#d32f2f',
    highlight: '#fff9c4',
  },
  'nature-green': {
    id: 'nature-green', label: '네이처 그린', feel: '생기 있고 조화로운',
    primary: '#388e3c', primaryDark: '#1b5e20',
    thBg: '#e8f5e9', evenRow: '#f5fbf6', border: '#a5d6a7',
    tipBg: '#e8f5e9', warnBg: '#fff8e1', warnAccent: '#fbc02d',
    highlight: '#dcedc8',
  },
  'royal-purple': {
    id: 'royal-purple', label: '로얄 퍼플', feel: '우아하고 독창적',
    primary: '#5e35b1', primaryDark: '#311b92',
    thBg: '#ede7f6', evenRow: '#f7f5fb', border: '#b39ddb',
    tipBg: '#ede7f6', warnBg: '#fce4ec', warnAccent: '#ad1457',
    highlight: '#fff59d',
  },
  'future-teal': {
    id: 'future-teal', label: '퓨처 틸', feel: '혁신적이고 활기찬',
    primary: '#00897b', primaryDark: '#004d40',
    thBg: '#e0f2f1', evenRow: '#f1fafa', border: '#80cbc4',
    tipBg: '#e0f7fa', warnBg: '#ffebee', warnAccent: '#e53935',
    highlight: '#fff9c4',
  },
  'earth-terracotta': {
    id: 'earth-terracotta', label: '어스 테라코타', feel: '온화하고 견고한',
    primary: '#a0522d', primaryDark: '#6f3a1f',
    thBg: '#efebe9', evenRow: '#faf6f3', border: '#bcaaa4',
    tipBg: '#fff3e0', warnBg: '#ffebee', warnAccent: '#bf360c',
    highlight: '#ffe0b2',
  },
}

export const DEFAULT_THEME_ID: PostThemeId = 'blue-gray'

export function getTheme(id?: PostThemeId | string | null): PostTheme {
  if (!id) return THEMES[DEFAULT_THEME_ID]
  return THEMES[id as PostThemeId] ?? THEMES[DEFAULT_THEME_ID]
}

export function listThemes(): PostTheme[] {
  return Object.values(THEMES)
}

/**
 * 블로그 유형 → 테마 자동 매핑
 *
 * blog_type 값은 lib/ai/adapter.ts의 BLOG_TYPE_TO_AD_CATEGORY 키와 호환:
 *   legal, finance, medical, real-estate, automotive, education, travel, general
 *   + monetize/general 카테고리도 일부 수용
 */
const BLOG_TYPE_THEME_MAP: Record<string, PostThemeId> = {
  legal: 'classic-blue',          // 법률 — 신뢰·안정
  finance: 'blue-gray',           // 금융 — 차분·전문
  insurance: 'classic-blue',      // 보험 — 신뢰
  medical: 'nature-green',        // 의료/건강 — 생기·조화
  'real-estate': 'earth-terracotta', // 부동산 — 견고·안정
  realestate: 'earth-terracotta',
  automotive: 'future-teal',      // 자동차 — 혁신
  automobile: 'future-teal',
  education: 'green-orange',      // 교육 — 활기·친근
  travel: 'terracotta-lightgray', // 여행 — 따뜻
  policy: 'classic-blue',         // 정책/공공 — 신뢰
  tech: 'future-teal',            // 기술 — 혁신
  lifestyle: 'green-orange',      // 라이프스타일 — 친근
  beauty: 'royal-purple',         // 뷰티 — 우아
  fashion: 'purple-yellow',       // 패션 — 창의
  food: 'green-orange',           // 음식 — 활기
  general: 'blue-gray',           // 일반
}

export function pickThemeForBlogType(blogType?: string | null): PostTheme {
  if (!blogType) return THEMES[DEFAULT_THEME_ID]
  const id = BLOG_TYPE_THEME_MAP[blogType.toLowerCase()] ?? DEFAULT_THEME_ID
  return THEMES[id]
}
