import type { BlogLanguage } from '@/types/monetize'
import type { PlanId, FeatureKey } from '@/types/plan'

export type SettingsTab = 'basic' | 'categories' | 'ai' | 'layout' | 'language' | 'sns' | 'monetize'

export interface TabDef {
  id: SettingsTab
  label: string
  minPlan?: PlanId
  featureKey?: FeatureKey
  featureName?: string
}

export const TABS: TabDef[] = [
  { id: 'basic', label: '기본정보' },
  { id: 'categories', label: '카테고리' },
  { id: 'ai', label: 'AI 캐릭터' },
  { id: 'layout', label: '레이아웃' },
  { id: 'language', label: '언어/지역', minPlan: 'growth', featureKey: 'multilingual', featureName: '다국어 설정' },
  { id: 'sns', label: 'SNS', minPlan: 'pro', featureKey: 'sns_auto_deploy', featureName: 'SNS 자동배포' },
  { id: 'monetize', label: '수익화 연동', minPlan: 'pro', featureKey: 'coupang_affiliate', featureName: '수익화 연동' },
]

export const LANGUAGES = [
  { value: 'ko' as BlogLanguage, label: '한국어' },
  { value: 'en' as BlogLanguage, label: 'English' },
  { value: 'ja' as BlogLanguage, label: '日本語' },
  { value: 'de' as BlogLanguage, label: 'Deutsch' },
  { value: 'pt_br' as BlogLanguage, label: 'Português (BR)' },
  { value: 'es' as BlogLanguage, label: 'Español' },
]

export const COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

export const BLOG_TYPES = [
  { value: 'legal', label: '법률' },
  { value: 'finance', label: '금융/재테크' },
  { value: 'medical', label: '의료/건강' },
  { value: 'it-tech', label: 'IT/테크' },
  { value: 'education', label: '교육' },
  { value: 'beauty-fashion', label: '뷰티/패션' },
  { value: 'food', label: '음식/요리' },
  { value: 'travel', label: '여행' },
  { value: 'parenting', label: '육아/가족' },
  { value: 'lifestyle', label: '라이프스타일' },
  { value: 'real-estate', label: '부동산' },
  { value: 'business', label: '비즈니스/마케팅' },
  { value: 'entertainment', label: '엔터테인먼트' },
  { value: 'sports', label: '스포츠/피트니스' },
  { value: 'pets', label: '반려동물' },
  { value: 'automotive', label: '자동차' },
  { value: 'interior', label: '인테리어/홈' },
  { value: 'news', label: '뉴스/시사' },
  { value: 'science', label: '과학/기술' },
  { value: 'other', label: '기타' },
]

// ─── AI 캐릭터 필드 정의 ───

export interface CharacterField {
  key: string
  label: string
  description: string
  placeholder: string
  type: 'input' | 'textarea' | 'select'
  options?: string[]
}

export interface CharacterCategory {
  title: string
  fields: CharacterField[]
}

export const CHARACTER_CATEGORIES: CharacterCategory[] = [
  {
    title: '페르소나 (기본 정체성)',
    fields: [
      { key: 'nickname', label: '닉네임', description: '블로그 필자 이름', placeholder: '"테크민수", "소소한하루", "여행하는 나나"', type: 'input' },
      { key: 'ageRange', label: '나이대', description: '문체와 감성에 영향', placeholder: '"20대 후반", "30대 중반", "40대 초반"', type: 'input' },
      { key: 'expertise', label: '직업/전문분야', description: '글의 관점을 결정', placeholder: '"IT 개발자", "육아맘", "요리사", "금융 컨설턴트"', type: 'input' },
      { key: 'personalityKeywords', label: '성격 키워드', description: '3~5개 핵심 성격', placeholder: '"꼼꼼한, 유머러스한, 솔직한, 다정한"', type: 'input' },
      { key: 'blogPurpose', label: '블로그 운영 목적', description: '글의 방향성 결정', placeholder: '"정보 공유", "일상 기록", "수익화", "전문 지식 전달"', type: 'input' },
    ],
  },
  {
    title: '말투 & 톤 (차별화 요소)',
    fields: [
      { key: 'honorificStyle', label: '존칭 스타일', description: '문체의 기본 틀', placeholder: '~해요체', type: 'select', options: ['~해요체', '~합니다체', '반말(~임,~거든)', '~다체'] },
      { key: 'sentenceLength', label: '문장 길이 경향', description: '호흡감 차이', placeholder: '중간', type: 'select', options: ['짧고 끊어쓰기', '중간', '길고 흐르는 문체'] },
      { key: 'emotionLevel', label: '감정 표현 수준', description: '글의 온도감', placeholder: '보통', type: 'select', options: ['절제형', '보통', '풍부형'] },
      { key: 'humorStyle', label: '유머 스타일', description: '재미 요소 차별화', placeholder: '없음', type: 'select', options: ['없음', '드라이', '자기비하', '말장난'] },
      { key: 'habitExpressions', label: '습관 표현', description: '캐릭터 고유 버릇 2~3가지', placeholder: '"솔직히~", "근데 이게 진짜~", "~인 거 아시죠?"', type: 'textarea' },
      { key: 'emojiUsage', label: '이모지 사용', description: '시각적 차이', placeholder: '가끔(1~2개)', type: 'select', options: ['안 씀', '가끔(1~2개)', '자주(문단마다)'] },
    ],
  },
  {
    title: '글 구조 & 포맷',
    fields: [
      { key: 'introPattern', label: '도입부 패턴', description: '첫인상 차별화', placeholder: '질문형', type: 'select', options: ['질문형', '일화/경험형', '바로 본론형', '공감 유도형'] },
      { key: 'subtitleStyle', label: '소제목 스타일', description: '글의 시각적 구조', placeholder: '키워드형', type: 'select', options: ['번호형', '키워드형', '질문형', '안 씀'] },
      { key: 'closingPattern', label: '마무리 패턴', description: '글의 끝맺음 차이', placeholder: '요약 정리형', type: 'select', options: ['요약 정리형', '개인 감상형', '질문/소통 유도형', '한줄 마무리'] },
      { key: 'postLengthRange', label: '글 길이 범위', description: '분량 차이', placeholder: '보통(1500~2500자)', type: 'select', options: ['짧음(800~1200자)', '보통(1500~2500자)', '긴글(3000자+)'] },
    ],
  },
  {
    title: '콘텐츠 관점',
    fields: [
      { key: 'approachAngle', label: '접근 앵글', description: '같은 키워드를 다르게 해석', placeholder: '실용 정보', type: 'select', options: ['실용 정보', '개인 체험기', '비교 분석', '감성 에세이'] },
      { key: 'expertiseDepth', label: '전문성 깊이', description: '설명 수준 차이', placeholder: '중급', type: 'select', options: ['초보 눈높이', '중급', '전문가'] },
      { key: 'personalExpRatio', label: '개인 경험 비율', description: '체험담 삽입 정도', placeholder: '보통(20~30%)', type: 'select', options: ['높음(50%+)', '보통(20~30%)', '낮음(거의 없음)'] },
      { key: 'evidenceStyle', label: '근거 제시 방식', description: '신뢰감 구축 스타일', placeholder: '직접 체험형', type: 'select', options: ['직접 체험형', '전문가 인용형', '다수 의견형'] },
    ],
  },
  {
    title: '핵심 차별점',
    fields: [
      { key: 'diffKeywords', label: '핵심 차별 키워드 3개', description: '이 캐릭터를 다른 캐릭터와 구별짓는 가장 중요한 특성 3가지', placeholder: '"솔직한 체험 리뷰, 데이터 기반 분석, 유머러스한 비유"', type: 'textarea' },
      { key: 'forbiddenExpressions', label: '절대 금지 표현', description: '다른 캐릭터와 겹치지 않도록 쓰지 말아야 할 표현/패턴', placeholder: '"~하는 것이 좋을 것으로 사료됩니다", "독자 여러분께서는~"', type: 'textarea' },
    ],
  },
]

export const ALL_FIELD_KEYS = CHARACTER_CATEGORIES.flatMap(c => c.fields.map(f => f.key))
