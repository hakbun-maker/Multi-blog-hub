export type AIProvider = 'claude' | 'openai' | 'gemini'
export type ImageProvider = 'imagen'
export type AnyAIProvider = AIProvider | ImageProvider

export interface AICharacterConfig {
  // 레거시 필드 (하위 호환)
  name?: string
  tone?: string
  style?: string
  persona?: string
  writingFormat?: string
  speechExamples?: string
  // 신규 21개 필드
  nickname?: string
  ageRange?: string
  expertise?: string
  personalityKeywords?: string
  blogPurpose?: string
  honorificStyle?: string
  sentenceLength?: string
  emotionLevel?: string
  humorStyle?: string
  habitExpressions?: string
  emojiUsage?: string
  introPattern?: string
  subtitleStyle?: string
  closingPattern?: string
  postLengthRange?: string
  approachAngle?: string
  expertiseDepth?: string
  personalExpRatio?: string
  evidenceStyle?: string
  diffKeywords?: string
  forbiddenExpressions?: string
  linkedBlogIds?: string[]
}

export type BlogLanguage = 'ko' | 'en' | 'ja' | 'de' | 'pt_br' | 'es'

export type PasonaType = 'compare' | 'solve' | 'cost'
export type AdCategory = 'insurance' | 'finance' | 'legal' | 'medical' | 'realestate' | 'automobile' | 'education' | 'travel' | 'general'

export interface MonetizeMeta {
  pasonaType: PasonaType
  adCategory: AdCategory
  factCount?: number          // 통계 주입 횟수 (AI 자가 보고)
  hasAnswerCapsule?: boolean  // Answer Capsule 포함 여부
  infoGain?: string           // 1차 데이터 (사용자 입력)
}

export interface GeneratePostParams {
  keyword: string
  relatedKeywords?: string[]
  characterConfig?: AICharacterConfig
  imageCount?: number
  blogId: string
  targetLength?: 'short' | 'medium' | 'long'
  newsArticles?: { title: string; description: string }[]
  language?: BlogLanguage
  useToc?: boolean
  // ── 수익화 글 작성 (PASONA × AEO/GEO) ──
  useMonetize?: boolean
  pasonaType?: PasonaType        // 미지정 시 keyword 패턴으로 자동
  adCategory?: AdCategory        // 미지정 시 blog_type → 매핑으로 자동
  blogType?: string | null       // 자동 매핑용 (legal/finance/...)
  infoGain?: string              // 사용자 입력 1차 데이터
}

export interface GeneratedPost {
  blogId: string
  title: string
  content: string       // markdown
  htmlContent: string   // HTML
  tags: string[]
  seoMeta: { title: string; description: string }
  monetizeMeta?: MonetizeMeta
}

// ─── 수익화 글 작성: 자동 판정 헬퍼 ───────────────────────────

/** 키워드 패턴으로 PASONA 글 유형 자동 판정 */
export function detectPasonaType(keyword: string): PasonaType {
  if (/비교|vs|순위|추천|랭킹|TOP\s*\d/i.test(keyword)) return 'compare'
  if (/비용|얼마|가격|요금|단가|시세|돈/i.test(keyword)) return 'cost'
  return 'solve'
}

/** blog_type → 광고 카테고리 매핑 (없으면 general) */
const BLOG_TYPE_TO_AD_CATEGORY: Record<string, AdCategory> = {
  legal: 'legal',
  finance: 'finance',
  medical: 'medical',
  'real-estate': 'realestate',
  automotive: 'automobile',
  education: 'education',
  travel: 'travel',
}

export function mapBlogTypeToAdCategory(blogType: string | null | undefined): AdCategory {
  if (!blogType) return 'general'
  return BLOG_TYPE_TO_AD_CATEGORY[blogType] ?? 'general'
}

/** 키워드를 추가로 보고 ad category 보정 (예: 'finance' 블로그에 '실비보험' 키워드 → 'insurance') */
export function refineAdCategoryFromKeyword(base: AdCategory, keyword: string): AdCategory {
  if (base === 'finance' && /보험/.test(keyword)) return 'insurance'
  if (base === 'general' && /보험/.test(keyword)) return 'insurance'
  if (base === 'general' && /(대출|금리|예적금)/.test(keyword)) return 'finance'
  if (base === 'general' && /변호사|소송|합의/.test(keyword)) return 'legal'
  return base
}

/** 광고 카테고리별 핵심 키워드 (S단계에 자연 포함) */
const AD_KEYWORDS_BY_CATEGORY: Record<AdCategory, string[]> = {
  insurance:  ['실비보험 비교', '보험료 견적', '무료 비교 서비스', '보장 내용', '갱신형 비갱신형'],
  finance:    ['대출 금리 비교', '한도 조회', '무료 상담', '신청 방법', '낮은 금리'],
  legal:      ['변호사 무료 상담', '법적 해결 절차', '소송 비용', '합의 방법'],
  medical:    ['치료 비용', '전문의 추천', '효과적인 치료법', '병원 선택 기준'],
  realestate: ['청약 전략', '세금 절약', '투자 수익률', '매매 타이밍'],
  automobile: ['자동차 보험 비교', '할부 조건', '견적 받기', '신차 혜택'],
  education:  ['강의 추천', '합격률 비교', '수강료', '자격증 취득 절차'],
  travel:     ['패키지 가격 비교', '최저가 예약', '여행 일정'],
  general:    [],
}

/** 광고 카테고리별 한글 라벨 */
const AD_CATEGORY_LABEL: Record<AdCategory, string> = {
  insurance: '보험', finance: '금융/대출', legal: '법률', medical: '의료/건강',
  realestate: '부동산/투자', automobile: '자동차', education: '교육/자격증',
  travel: '여행', general: '일반',
}

/** PASONA 글 유형별 라벨 */
const PASONA_TYPE_LABEL: Record<PasonaType, string> = {
  compare: '비교형 (구매 의도 최고)',
  solve: '문제해결형 (정보 탐색)',
  cost: '비용탐색형 (구매 결심 직전)',
}

export interface AIAdapter {
  provider: AIProvider
  generatePost(params: GeneratePostParams): Promise<GeneratedPost>
  generateText(prompt: string): Promise<string>
}

// 신규 캐릭터 설정을 프롬프트 섹션으로 변환
function buildCharacterSections(config: AICharacterConfig): string {
  const sections: string[] = []

  // 페르소나 (기본 정체성)
  const personaParts = [
    config.nickname && `필자명: ${config.nickname}`,
    config.ageRange && `나이대: ${config.ageRange}`,
    config.expertise && `직업/전문분야: ${config.expertise}`,
    config.personalityKeywords && `성격: ${config.personalityKeywords}`,
    config.blogPurpose && `블로그 운영 목적: ${config.blogPurpose}`,
  ].filter(Boolean)
  if (personaParts.length) sections.push(`## 페르소나\n${personaParts.join('\n')}`)

  // 말투 & 톤
  const toneParts = [
    config.honorificStyle && `존칭 스타일: ${config.honorificStyle}`,
    config.sentenceLength && `문장 길이: ${config.sentenceLength}`,
    config.emotionLevel && `감정 표현: ${config.emotionLevel}`,
    config.humorStyle && `유머 스타일: ${config.humorStyle}`,
    config.habitExpressions && `습관 표현: ${config.habitExpressions}`,
    config.emojiUsage && `이모지 사용: ${config.emojiUsage}`,
  ].filter(Boolean)
  if (toneParts.length) sections.push(`## 말투 & 톤\n${toneParts.join('\n')}`)

  // 글 구조 & 포맷
  const formatParts = [
    config.introPattern && `도입부: ${config.introPattern}`,
    config.subtitleStyle && `소제목 스타일: ${config.subtitleStyle}`,
    config.closingPattern && `마무리: ${config.closingPattern}`,
    config.postLengthRange && `글 길이: ${config.postLengthRange}`,
  ].filter(Boolean)
  if (formatParts.length) sections.push(`## 글 구조 & 포맷\n${formatParts.join('\n')}`)

  // 콘텐츠 관점
  const contentParts = [
    config.approachAngle && `접근 앵글: ${config.approachAngle}`,
    config.expertiseDepth && `전문성 깊이: ${config.expertiseDepth}`,
    config.personalExpRatio && `개인 경험 비율: ${config.personalExpRatio}`,
    config.evidenceStyle && `근거 제시 방식: ${config.evidenceStyle}`,
  ].filter(Boolean)
  if (contentParts.length) sections.push(`## 콘텐츠 관점\n${contentParts.join('\n')}`)

  // 핵심 차별점
  const diffParts = [
    config.diffKeywords && `핵심 차별 키워드: ${config.diffKeywords}`,
    config.forbiddenExpressions && `절대 금지 표현: ${config.forbiddenExpressions}`,
  ].filter(Boolean)
  if (diffParts.length) sections.push(`## 핵심 차별점\n${diffParts.join('\n')}`)

  return sections.join('\n\n')
}

// 언어별 설정
const LANG_CONFIG: Record<string, { name: string; lengthMap: Record<string, string>; cultureHint: string }> = {
  ko: { name: '한국어', lengthMap: { short: '500~800자', medium: '1200~1800자', long: '2500~3500자' }, cultureHint: '' },
  en: { name: 'English', lengthMap: { short: '300~500 words', medium: '800~1200 words', long: '1500~2500 words' }, cultureHint: 'Write naturally for an English-speaking audience. Use Western cultural references, idioms, and expressions.' },
  ja: { name: '日本語', lengthMap: { short: '500~800文字', medium: '1200~1800文字', long: '2500~3500文字' }, cultureHint: '日本語のネイティブ読者向けに自然な日本語で書いてください。日本の文化的な文脈や表現を使用してください。' },
  de: { name: 'Deutsch', lengthMap: { short: '300~500 Wörter', medium: '800~1200 Wörter', long: '1500~2500 Wörter' }, cultureHint: 'Schreiben Sie natürlich für ein deutschsprachiges Publikum. Verwenden Sie deutsche kulturelle Referenzen und Ausdrücke.' },
  pt_br: { name: 'Português (BR)', lengthMap: { short: '300~500 palavras', medium: '800~1200 palavras', long: '1500~2500 palavras' }, cultureHint: 'Escreva naturalmente para um público brasileiro. Use referências culturais e expressões do Brasil.' },
  es: { name: 'Español', lengthMap: { short: '300~500 palabras', medium: '800~1200 palabras', long: '1500~2500 palabras' }, cultureHint: 'Escribe de forma natural para un público hispanohablante. Usa referencias culturales y expresiones en español.' },
}

// 자연스러운 문장 단위 트렁케이션 (문장/단어 경계에서 끊기)
function smartTruncate(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text ?? ''

  const trimmed = text.slice(0, maxLen)

  // 1) 마지막 온전한 문장 경계 찾기 (. ! ? 。 뒤)
  const sentenceEnd = Math.max(
    trimmed.lastIndexOf('. '),
    trimmed.lastIndexOf('! '),
    trimmed.lastIndexOf('? '),
    trimmed.lastIndexOf('。'),
    trimmed.lastIndexOf('.'),
  )
  // 전체 길이의 절반 이상 위치에 문장 종결이 있으면 그 지점에서 끊기
  if (sentenceEnd > maxLen * 0.5) {
    return trimmed.slice(0, sentenceEnd + 1).trim()
  }

  // 2) 문장 종결이 없으면 마지막 공백/쉼표 위치에서 끊고 '...' 추가
  const wordBoundary = Math.max(trimmed.lastIndexOf(' '), trimmed.lastIndexOf(','), trimmed.lastIndexOf(', '))
  if (wordBoundary > maxLen * 0.5) {
    return trimmed.slice(0, wordBoundary).trim() + '...'
  }

  // 3) 한국어 등 공백 없는 경우: 조사/어미 패턴 앞에서 끊기
  const koreanBreak = trimmed.search(/[다요음됨임습죠네까](?=[^가-힣]|$)(?!.*[다요음됨임습죠네까])/)
  if (koreanBreak > maxLen * 0.5) {
    return trimmed.slice(0, koreanBreak + 1).trim()
  }

  // 4) 최후 수단: maxLen에서 잘라서 '...' 추가
  return trimmed.trim() + '...'
}

// SEO 필드 안전 트렁케이션 (DB varchar 제한 대응)
// 프롬프트에서 이미 글자수를 지시하므로 대부분 초과하지 않음.
// 초과할 경우에만 자연스러운 문장/단어 단위로 잘라서 DB 에러를 방지.
export function truncateSeoFields(seoMeta: { title: string; description: string }): { title: string; description: string } {
  return {
    title: smartTruncate(seoMeta.title, 60),
    description: smartTruncate(seoMeta.description, 155),
  }
}

// 공통 프롬프트 빌더
export function buildPrompt(params: GeneratePostParams): string {
  const { keyword, relatedKeywords = [], characterConfig = {}, targetLength = 'medium', language = 'ko' } = params
  const langCfg = LANG_CONFIG[language] ?? LANG_CONFIG.ko
  const isKorean = language === 'ko'

  // 수익화 글 작성 모드 분기 (한국어만 지원, 기타 언어는 일반 모드 사용)
  if (params.useMonetize && isKorean) {
    return buildMonetizePromptKo(params)
  }

  // 신규 필드가 있으면 새 방식, 없으면 레거시 방식
  const hasNewFields = !!(characterConfig.nickname || characterConfig.honorificStyle || characterConfig.introPattern)

  const characterPrompt = hasNewFields
    ? buildCharacterSections(characterConfig)
    : [
        characterConfig.persona ? `## 페르소나\n${characterConfig.persona}` : '',
        characterConfig.tone ? `## 글쓰기 톤\n${characterConfig.tone}` : '',
        characterConfig.style ? `## 글쓰기 스타일\n${characterConfig.style}` : '',
        characterConfig.writingFormat ? `## 글쓰기 포맷\n${characterConfig.writingFormat}` : '',
        characterConfig.speechExamples ? `## 말투 예시 (이 말투를 참고하여 작성)\n${characterConfig.speechExamples}` : '',
      ].filter(Boolean).join('\n\n')

  const sections = [
    '당신은 SEO 최적화 블로그 글을 작성하는 전문 작가입니다.',
    characterPrompt ? `\n${characterPrompt}` : '',
  ].filter(Boolean).join('\n')

  // 뉴스 기사 참고 섹션
  const newsSection = params.newsArticles?.length
    ? `\n## 참고 뉴스 기사 (전문성 있는 글 작성을 위한 참고 자료)\n아래 뉴스 기사의 핵심 내용을 참고하되, 그대로 복사하지 말고 전문적 관점에서 재구성하세요:\n${params.newsArticles.map((a, i) => `${i + 1}. ${a.title} - ${a.description}`).join('\n')}\n`
    : ''

  // 언어 강제 지시 (비한국어)
  const langDirective = isKorean ? '' : `
## CRITICAL LANGUAGE REQUIREMENT
You MUST write the ENTIRE blog post in ${langCfg.name}. This is non-negotiable.
- The title MUST be in ${langCfg.name}
- The content MUST be entirely in ${langCfg.name}
- The tags MUST be in ${langCfg.name}
- The seoTitle and seoDescription MUST be in ${langCfg.name}
- Do NOT use Korean (한국어) anywhere in the output
- Do NOT translate from Korean — write directly in ${langCfg.name} as a native speaker would
${langCfg.cultureHint}
`

  // SEO 최적화 구조 지시 (공통) — 색인 신호 강화 (분량·고유성·구조)
  const seoStructure = isKorean
    ? `
## SEO 최적화 글 구조 (반드시 준수)
다음 구조와 분량을 정확히 지키세요. 짧은 글은 색인되지 않습니다.

1. **도입부 (반드시 300자 이상, 2~3 단락)**
   - 첫 문장에 주제 키워드를 자연스럽게 포함
   - 독자의 공감을 이끄는 구체적 상황·통계·질문으로 시작 (모호한 일반론 금지)
   - 글에서 다룰 핵심 3가지를 미리 안내

2. **본문 (3~5개의 ## 소제목, 각 섹션 400자 이상)**
   - 각 ## 소제목 자체에 주제 키워드 또는 연관 키워드 1개 포함
   - 각 섹션은 도입 → 핵심 설명 → 구체 예시·수치 → 결론 순으로 작성
   - 짧은 문장만 반복 금지, 단락당 3~5문장 유지
   - 키워드는 본문 전체에서 자연스럽게 5~8회 등장 (불자연한 반복 금지)

3. **FAQ 섹션 (## 자주 묻는 질문, Q&A 4개 이상)**
   - 각 질문은 실제 검색어 형태로 구체적으로 작성 (예: "X는 얼마나 걸리나요?", "Y와 Z의 차이는?")
   - 답변은 각 80자 이상

4. **마무리 (## 결론 또는 ## 정리, 200자 이상)**
   - 핵심 3가지 요약 + 다음 행동 유도 문구

## 콘텐츠 품질 필수 규칙
- 총 분량: **2,000자 이상** (이보다 짧으면 색인 안됨)
- 모든 섹션은 고유한 정보 — 동일 내용 재진술 금지
- 추상적 표현("매우 중요합니다", "큰 도움이 됩니다") 대신 구체적 수치·예시 사용
- 1인칭 경험·구체적 사례·전문가 인용 1개 이상 포함

## 메타데이터 규칙
- seoTitle: 정확히 30~60자. 주제 키워드 포함 + 클릭 유도 (숫자/혜택/질문)
- seoDescription: 정확히 120~155자. 글의 핵심 가치 + 키워드 자연 포함
- 태그 5개: 주제 키워드 + 연관 키워드 4개

## 형식 규칙
- 목차(TOC)를 본문 content 안에 절대 포함하지 마세요 (시스템이 자동 생성합니다)
- 마크다운만 사용 (##, ###, **굵게**, *기울임*, - 리스트, 1. 번호)`
    : `
## SEO-OPTIMIZED STRUCTURE (MUST FOLLOW STRICTLY)
Posts that are short or generic will NOT be indexed by Google. Follow these rules exactly:

1. **Introduction (MUST be 300+ characters, 2-3 paragraphs)**
   - Include the main keyword naturally in the first sentence
   - Open with a specific situation, statistic, or question (NO vague generalities)
   - Preview the 3 key points the post will cover

2. **Body (3-5 ## subheadings, EACH 400+ characters)**
   - Each ## subheading must include the main keyword or a related keyword
   - Structure each section: intro → core explanation → concrete example/numbers → conclusion
   - Avoid only short sentences. Use 3-5 sentences per paragraph.
   - Keywords should appear 5-8 times naturally throughout (NO keyword stuffing)

3. **FAQ Section (## Frequently Asked Questions, 4+ Q&As)**
   - Frame questions as actual search queries (e.g., "How long does X take?", "What's the difference between Y and Z?")
   - Each answer must be 80+ characters

4. **Conclusion (## Conclusion or ## Summary, 200+ characters)**
   - Summarize 3 key points + clear call to action

## CONTENT QUALITY RULES
- Total length: **2,000+ characters** (shorter posts won't be indexed)
- Each section must have unique information — NO restating
- Use concrete numbers/examples instead of vague phrases ("very important", "great help")
- Include at least one first-person experience, specific example, or expert quote

## METADATA RULES
- seoTitle: exactly 30-60 chars. Main keyword + click incentive (numbers/benefits/questions)
- seoDescription: exactly 120-155 chars. Core value + natural keyword inclusion
- 5 tags: main keyword + 4 related keywords

## FORMAT RULES
- Do NOT include a table of contents (TOC) in the content (the system generates it automatically)
- Markdown only (##, ###, **bold**, *italic*, - list, 1. numbered)`

  return `${sections}
${newsSection}${langDirective}${seoStructure}

다음 조건으로 블로그 글을 작성하세요:
- 주제 키워드: ${keyword}
- 연관 키워드: ${relatedKeywords.join(', ') || '없음'}
- 목표 길이: ${langCfg.lengthMap[targetLength]}
- 형식: 마크다운 (제목 #, 소제목 ##)
- SEO를 위해 키워드를 자연스럽게 포함
${!isKorean ? `- 작성 언어: ${langCfg.name} (반드시 이 언어로만 작성)` : ''}
${params.newsArticles?.length ? '- 참고 뉴스 기사의 핵심 정보를 활용하여 전문성 있고 신뢰할 수 있는 글 작성' : ''}

반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력:
- content 필드의 줄바꿈은 반드시 \\n으로 이스케이프
- 큰따옴표는 \\"로 이스케이프
- seoTitle: 반드시 60자(chars) 이내
- seoDescription: 반드시 155자(chars) 이내
{
  "title": "${isKorean ? '글 제목' : `Title in ${langCfg.name}`}",
  "content": "${isKorean ? '마크다운 본문 전체 (줄바꿈은 \\n으로). 목차는 포함하지 마세요.' : `Full markdown body in ${langCfg.name} (newlines as \\\\n). Do NOT include a table of contents.`}",
  "tags": ["${isKorean ? '태그1", "태그2", "태그3", "태그4", "태그5' : `tag1 in ${langCfg.name}", "tag2", "tag3", "tag4", "tag5`}"],
  "seoTitle": "${isKorean ? 'SEO 메타 제목 (60자 이내)' : `SEO meta title in ${langCfg.name} (MUST be under 60 chars)`}",
  "seoDescription": "${isKorean ? 'SEO 메타 설명 (155자 이내)' : `SEO meta description in ${langCfg.name} (MUST be under 155 chars)`}"
}`
}

// ─── 수익화 글 작성 (PASONA × AEO/GEO) 한국어 프롬프트 빌더 ───
function buildMonetizePromptKo(params: GeneratePostParams): string {
  const { keyword, relatedKeywords = [], characterConfig = {}, blogType, infoGain } = params

  // 자동 판정: pasonaType / adCategory (외부에서 안 넘어왔을 때)
  const pasonaType: PasonaType = params.pasonaType ?? detectPasonaType(keyword)
  const baseCategory: AdCategory = params.adCategory ?? mapBlogTypeToAdCategory(blogType)
  const adCategory: AdCategory = refineAdCategoryFromKeyword(baseCategory, keyword)

  const adKeywords = AD_KEYWORDS_BY_CATEGORY[adCategory]
  const adKwLine = adKeywords.length
    ? `\n다음 광고 카테고리 키워드를 S단계 H2 소제목과 본문에 자연스럽게 포함시키세요:\n${adKeywords.map(k => `  - ${k}`).join('\n')}`
    : ''

  // 글 유형별 가이드
  const typeGuide: Record<PasonaType, string> = {
    compare: `**비교형 글** — 제목 패턴: "[A] vs [B] 솔직 비교" / "TOP N 추천". S단계는 비교 기준 3가지 + 비교표(마크다운 테이블) 포함. O단계는 "한 번에 비교하는 방법" 제시.`,
    solve: `**문제해결형 글** — 제목 패턴: "[문제 상황] 해결 방법". S단계는 근본 원인 분석 + 일반 해결법(완전한 답은 X). O단계는 "더 빠른 전문가 해결" 제시.`,
    cost: `**비용탐색형 글** — 제목 패턴: "[서비스] 비용 얼마?" / "가격 공개". S단계는 가격 범위표(마크다운 테이블) + 가격 결정 요인. O단계는 "한 번에 견적 받기" 제시. 비용 검색 = 구매 결심 직전이라 전환율 최고.`,
  }

  // 캐릭터 섹션 (있으면 포함)
  const hasNewFields = !!(characterConfig.nickname || characterConfig.honorificStyle || characterConfig.introPattern)
  const characterPrompt = hasNewFields
    ? buildCharacterSections(characterConfig)
    : [
        characterConfig.persona ? `## 페르소나\n${characterConfig.persona}` : '',
        characterConfig.tone ? `## 톤\n${characterConfig.tone}` : '',
      ].filter(Boolean).join('\n\n')

  const infoGainBlock = infoGain?.trim()
    ? `\n## 사용자 1차 데이터 (Information Gain — 반드시 본문에 자연스럽게 녹여낼 것)\n${infoGain.trim()}\n`
    : ''

  const newsSection = params.newsArticles?.length
    ? `\n## 참고 뉴스 기사 (전문성·통계 인용용)\n${params.newsArticles.map((a, i) => `${i + 1}. ${a.title} - ${a.description}`).join('\n')}\n`
    : ''

  return `당신은 SEO와 광고 수익을 동시에 최적화하는 수익화 블로그 전문 작가입니다.

${characterPrompt ? characterPrompt + '\n\n' : ''}## 글 정체성
- 유형: ${PASONA_TYPE_LABEL[pasonaType]} — ${typeGuide[pasonaType]}
- 광고 카테고리: ${AD_CATEGORY_LABEL[adCategory]}${adKwLine}
${infoGainBlock}${newsSection}

## ⚠️ 가장 중요한 규칙 (위반 시 글 폐기)
독자가 글을 읽었을 때 **PASONA 구조나 마케팅 의도를 절대 눈치채면 안 됩니다.**
다음과 같은 라벨·메타 표현은 본문에 **단 하나도 등장하면 안 됩니다**:

❌ 절대 금지 (본문 어디에도 출력 금지):
- "P:", "A:", "S:", "O:", "N:", "A:" 같은 알파벳 라벨
- "(문제)", "(공감)", "(해결)", "(제안)", "(긴박감)", "(행동)", "(긴박김)", "(행동 100자)" 같은 괄호 메타
- "200자", "100자", "400자" 같은 글자수 메타
- "Answer Capsule", "정답 캡슐", "역피라미드", "시맨틱 트리플" 같은 기법 용어
- "PASONA", "AEO", "GEO", "광고 타겟팅", "S단계", "O단계" 같은 전략 용어
- "여기에는 ~을 작성합니다" 같은 메타 안내문

✅ 올바른 출력: 자연스러운 블로그 글 그 자체. 독자는 일반 정보 글로 읽습니다.

## 글 흐름 (이 흐름을 따르되, 라벨은 절대 노출 금지)

**1. 제목** (# 1줄, 60자 내, 클릭 유도)

**2. 도입부 (300자 내외)** — 본문 시작 직전에 다음 HTML 주석을 그 줄 단독으로 출력:
\`<!-- google_ad_section_start(weight=ignore) -->\`

그리고 자연스러운 단락 2~3개로 다음 흐름을 작성 (라벨 없이 일반 산문체로):
- 첫 단락: 독자의 구체적 고통·상황을 수치·예시로 묘사 (모호한 일반론 금지). 라벨 없이 그냥 자연스러운 문장으로.
- 둘째 단락: "저도 같은 경험이 있어서 잘 압니다" 류의 1인칭 공감. 라벨 없이 자연 문장.

도입부가 끝난 직후 다음 줄에:
\`<!-- google_ad_section_end -->\`

**3. 본문 (3개의 ## 소제목)** — 다음 줄 단독으로 출력:
\`<!-- google_ad_section_start -->\`

각 ## 소제목:
- 자연어 질문형 + 광고 카테고리 키워드 1개를 자연스럽게 포함 (예: "실비보험 비교, 어떻게 시작하면 좋을까요?")
- ## 직후 첫 단락은 **40~60단어로 정답을 단독 완결되게** 제시 (정답 → 이유 → 근거 흐름, 라벨 없이)
- 그 뒤 본문 약 400자: 핵심 정보 → 구체 수치/통계 1개(출처 명시, 예: "(출처: 2024 한국○○협회)") → 1인칭 경험 → 결론
- 비교형이면 마크다운 표 1개, 비용형이면 가격 범위표 1개 포함

**4. 본문 마지막 ## 소제목 (3개 중 마지막 또는 추가)**: 더 나은 선택지를 제시하는 H2
- 예: "## 빠르고 정확하게 비교하는 방법" / "## 한 번에 견적 받아보기"
- 광고가 자연스러운 해결책처럼 느껴지도록. "광고", "클릭", "여기를 누르세요" 단어 절대 금지.

본문 끝난 직후 다음 줄에:
\`<!-- google_ad_section_end -->\`

**5. FAQ 섹션**: \`## 자주 묻는 질문\`
- Q&A 4개, 각 질문은 실제 검색어 형태(예: "○○은 얼마나 걸리나요?", "○○과 △△의 차이는?")
- 답변 80자 이상, 광고 카테고리 키워드 1~2개 자연 포함
- 형식 자유: \`### Q. 질문\` 다음 줄에 답변, 또는 \`**Q. 질문**\` 다음 답변

**6. 마무리** — 다음 줄 단독:
\`<!-- google_ad_section_start(weight=ignore) -->\`

\`## 정리\` 또는 \`## 결론\` 소제목 후, 자연스러운 산문체로 2개 단락:
- 첫 단락 (~100자): 지금이 적기인 이유를 자연스럽게 (시즌/조건/혜택). 라벨 없이.
- 둘째 단락 (~100자): 명확한 다음 행동 제안 ("무료 견적부터 받아보세요" 류). 라벨 없이.

마지막 줄에:
\`<!-- google_ad_section_end -->\`

## 추가 절대 규칙
1. 반드시 위 1~6 흐름을 끝까지 완성. 중간에 끊지 말 것.
2. 6번 마무리 직후 글 종료. 그 뒤에 추가 텍스트 출력 금지.
3. 200~250자마다 출처 있는 구체 통계·수치 1개 의무.
4. 1인칭 경험·구체 사례 1개 이상.
5. 총 분량 **1,800~2,200자**.
6. **PASONA 라벨/괄호 메타/글자수 메타가 본문에 단 하나라도 보이면 글 전체 폐기. 절대로 출력하지 말 것.**

## 작성 조건
- 주제: ${keyword}
- 연관 키워드: ${relatedKeywords.join(', ') || '없음'}
- 형식: 마크다운 (#, ##, ###, **굵게**, 리스트, 표)
- 목차(TOC) 본문 포함 금지 (시스템 자동 생성)

## 응답 형식
유효한 JSON만 출력. 다른 텍스트 일절 없이.
- content 줄바꿈은 \\n, 큰따옴표는 \\"
- seoTitle: 30~60자, seoDescription: 120~155자
- 태그 5개

{
  "title": "글 제목",
  "content": "위 흐름대로 작성된 마크다운 본문 (섹션 타겟팅 HTML 주석 4개 포함, PASONA 라벨 일체 없음)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "seoTitle": "...",
  "seoDescription": "...",
  "monetizeMeta": {
    "pasonaType": "${pasonaType}",
    "adCategory": "${adCategory}",
    "factCount": 0,
    "hasAnswerCapsule": true
  }
}`
}

/**
 * 수익화 글 후처리 안전장치 — AI가 PASONA 라벨/메타 표현을 본문에 노출했을 때 자동 제거
 * 프롬프트에서 강하게 금지했지만 AI가 가끔 무시하는 경우 대응
 *
 * 제거 대상:
 *   - "P (문제, 200자):", "A (공감, 100자):" 같은 라벨 + 괄호 메타
 *   - "P:", "A:", "S:" 같은 단순 라벨
 *   - "[1]", "[2]" 같은 단계 마커
 *   - "PASONA", "AEO", "GEO", "Answer Capsule" 같은 전략 용어 노출
 */
export function sanitizePasonaMarkers(markdown: string): string {
  if (!markdown) return ''
  let cleaned = markdown

  // 1) 라인 시작의 "P (메타):" 형태 prefix 제거 (가장 빈번한 노출)
  //    - 옵션: "- ", "* ", "**" 접두/감싸기 허용
  //    - 알파벳: P/A/S/O/N (대소문자) 그리고 한글 변형도 일부
  cleaned = cleaned.replace(
    /^(\s*[-*]\s*)?(\*\*)?\s*[PASNOpasno][\s*]*[(（][^)）]{1,40}[)）][\s*]*:?\s*/gm,
    '$1$2',
  )

  // 2) 라인 시작의 단순 "P:" "A:" 형태 prefix 제거
  cleaned = cleaned.replace(
    /^(\s*[-*]\s*)?(\*\*)?\s*[PASNOpasno]\s*:\s+/gm,
    '$1$2',
  )

  // 3) "[1] 제목", "**[3] 본문**" 같은 단계 마커 제거
  cleaned = cleaned.replace(/^\s*\*{0,2}\[\d+\]\*{0,2}[\s.):]+/gm, '')

  // 4) 전략 용어가 본문에 노출된 경우 제거 (단어만, 주변 문장은 유지)
  cleaned = cleaned.replace(
    /\b(PASONA|AEO|GEO|Answer\s*Capsule|정답\s*캡슐|역피라미드|시맨틱\s*트리플|광고\s*타겟팅|S단계|O단계)\b/gi,
    '',
  )

  // 5) 빈 마크다운 리스트 아이템(라벨만 있고 내용 없던 경우) 정리
  cleaned = cleaned.replace(/^\s*[-*]\s*$/gm, '')

  // 6) 공백 라인 3개 이상 연속 → 2개로 축약
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned
}

// 마크다운 → HTML 변환 (H2 id 자동 부여, includeToc=true일 때만 목차 삽입)
export function markdownToHtml(markdown: string, includeToc: boolean = false): string {
  if (!markdown?.trim()) return ''

  const lines = markdown.split('\n')
  const htmlParts: string[] = []
  const h2Headings: { id: string; text: string }[] = []
  let inList = false
  let paragraphLines: string[] = []
  let h2Counter = 0

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const text = paragraphLines.join(' ').trim()
      if (text) htmlParts.push(`<p>${text}</p>`)
      paragraphLines = []
    }
  }

  const flushList = () => {
    if (inList) {
      htmlParts.push('</ul>')
      inList = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // 빈 줄 → 단락 구분
    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    // HTML 주석 라인 (예: 섹션 타겟팅 태그 <!-- google_ad_section_start -->)
    // → paragraph로 감싸지 않고 그대로 통과
    if (/^<!--[\s\S]*-->$/.test(trimmed)) {
      flushParagraph()
      flushList()
      htmlParts.push(trimmed)
      continue
    }

    // 헤딩
    const h3 = trimmed.match(/^### (.+)$/)
    if (h3) { flushParagraph(); flushList(); htmlParts.push(`<h3>${h3[1]}</h3>`); continue }
    const h2 = trimmed.match(/^## (.+)$/)
    if (h2) {
      flushParagraph(); flushList()
      h2Counter++
      const sectionId = `section${h2Counter}`
      h2Headings.push({ id: sectionId, text: h2[1] })
      htmlParts.push(`<h2 id="${sectionId}">${h2[1]}</h2>`)
      continue
    }
    const h1 = trimmed.match(/^# (.+)$/)
    if (h1) { flushParagraph(); flushList(); htmlParts.push(`<h1>${h1[1]}</h1>`); continue }

    // 리스트 아이템
    const li = trimmed.match(/^[-*] (.+)$/)
    if (li) {
      flushParagraph()
      if (!inList) { htmlParts.push('<ul>'); inList = true }
      htmlParts.push(`<li>${li[1]}</li>`)
      continue
    }

    // 일반 텍스트 → 단락에 축적
    flushList()
    paragraphLines.push(trimmed)
  }

  flushParagraph()
  flushList()

  // 인라인 스타일 적용
  let body = htmlParts.join('\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

  // includeToc=true이고 H2가 2개 이상이면 목차 생성 (본문 첫 H2 앞에 삽입)
  if (includeToc && h2Headings.length >= 2) {
    const tocItems = h2Headings.map(h =>
      `<li style="margin-bottom: 8px;"><a href="#${h.id}" style="text-decoration: none; color: #2563eb; font-weight: 500;">${h.text}</a></li>`
    ).join('\n')
    const tocHtml = `<nav style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px 25px; margin: 20px 0; border-radius: 10px;">
<h3 style="font-size: 16px; font-weight: 700; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ccc; color: #333;">목차</h3>
<ol style="margin: 0; padding-left: 20px;">
${tocItems}
</ol>
</nav>`
    // 첫 번째 H2 앞에 TOC 삽입
    const firstH2Idx = body.indexOf('<h2 ')
    if (firstH2Idx > -1) {
      body = body.slice(0, firstH2Idx) + tocHtml + '\n' + body.slice(firstH2Idx)
    } else {
      body = tocHtml + '\n' + body
    }
  }

  return body
}

export function parseAIResponse(text: string, blogId: string, useToc: boolean = false): GeneratedPost {
  // 1) 코드블록 제거 (```json ... ```)
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()

  // 2) JSON 파싱 시도
  let parsed: Record<string, unknown> | null = null

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    // 2a) 직접 파싱
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // 2b) 닫는 } 보충
      try {
        let candidate = jsonMatch[0]
        const opens = (candidate.match(/\{/g) ?? []).length
        const closes = (candidate.match(/\}/g) ?? []).length
        if (opens > closes) candidate += '}'.repeat(opens - closes)
        parsed = JSON.parse(candidate)
      } catch { /* 2c로 진행 */ }
    }
  }

  // 2c) JSON.parse 실패 → regex로 개별 필드 추출 (content의 이스케이프 문제 대응)
  if (!parsed) {
    const titleMatch = cleaned.match(/"title"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)
    const tagsMatch = cleaned.match(/"tags"\s*:\s*\[([\s\S]*?)\]/)
    const seoTitleMatch = cleaned.match(/"seoTitle"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)
    const seoDescMatch = cleaned.match(/"seoDescription"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)

    // content 추출: "content" 필드 시작 위치를 찾고, 다음 최상위 필드까지의 값을 가져옴
    let rawContent = ''
    const contentStart = cleaned.match(/"content"\s*:\s*"/)
    if (contentStart && contentStart.index !== undefined) {
      const valueStart = contentStart.index + contentStart[0].length
      // 이스케이프된 따옴표를 건너뛰며 content 값의 끝 따옴표를 찾음
      let i = valueStart
      while (i < cleaned.length) {
        if (cleaned[i] === '\\') { i += 2; continue }
        if (cleaned[i] === '"') break
        i++
      }
      rawContent = cleaned.slice(valueStart, i)
    }

    if (titleMatch || rawContent) {
      // 이스케이프된 문자 복원
      let content = rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      // 섹션 타겟팅 주석 또는 PASONA 라벨이 있으면 수익화 글로 추정 → sanitize
      if (/<!--\s*google_ad_section|^[\s*-]*[PASNO]\s*[(:]/m.test(content)) {
        content = sanitizePasonaMarkers(content)
      }
      const tagStr = tagsMatch?.[1] ?? ''
      const tags = tagStr.match(/"((?:[^"\\]|\\.)*)"/g)?.map(t => t.replace(/^"|"$/g, '')) ?? []

      return {
        blogId,
        title: titleMatch?.[1]?.replace(/\\"/g, '"') ?? '(제목 없음)',
        content,
        htmlContent: markdownToHtml(content, useToc),
        tags,
        seoMeta: truncateSeoFields({
          title: seoTitleMatch?.[1]?.replace(/\\"/g, '"') ?? titleMatch?.[1] ?? '',
          description: seoDescMatch?.[1]?.replace(/\\"/g, '"') ?? '',
        }),
      }
    }

    throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다. 다시 시도해주세요.')
  }

  const rawContent = (parsed.content as string) ?? ''
  // monetizeMeta 추출 (수익화 모드일 때 AI가 반환)
  let monetizeMeta: MonetizeMeta | undefined
  const rawMeta = parsed.monetizeMeta as Record<string, unknown> | undefined
  if (rawMeta && typeof rawMeta === 'object') {
    const pasonaType = rawMeta.pasonaType
    const adCategory = rawMeta.adCategory
    if (typeof pasonaType === 'string' && typeof adCategory === 'string') {
      monetizeMeta = {
        pasonaType: pasonaType as PasonaType,
        adCategory: adCategory as AdCategory,
        factCount: typeof rawMeta.factCount === 'number' ? rawMeta.factCount : undefined,
        hasAnswerCapsule: typeof rawMeta.hasAnswerCapsule === 'boolean' ? rawMeta.hasAnswerCapsule : undefined,
      }
    }
  }
  // 수익화 글이면 PASONA 라벨/메타 노출 자동 제거 (AI가 프롬프트 무시한 경우 안전장치)
  const content = monetizeMeta ? sanitizePasonaMarkers(rawContent) : rawContent
  return {
    blogId,
    title: (parsed.title as string) ?? '(제목 없음)',
    content,
    htmlContent: markdownToHtml(content, useToc),
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    seoMeta: truncateSeoFields({
      title: (parsed.seoTitle as string) ?? (parsed.title as string) ?? '',
      description: (parsed.seoDescription as string) ?? '',
    }),
    ...(monetizeMeta ? { monetizeMeta } : {}),
  }
}

// 이미지 어댑터 팩토리
export async function createImageAdapter(provider: ImageProvider, apiKey: string) {
  switch (provider) {
    case 'imagen': {
      const { ImagenAdapter } = await import('./imagen')
      return new ImagenAdapter(apiKey)
    }
  }
}

// 텍스트 어댑터 팩토리
export async function createAIAdapter(provider: AIProvider, apiKey: string): Promise<AIAdapter> {
  switch (provider) {
    case 'claude': {
      const { ClaudeAdapter } = await import('./claude')
      return new ClaudeAdapter(apiKey)
    }
    case 'openai': {
      const { OpenAIAdapter } = await import('./openai')
      return new OpenAIAdapter(apiKey)
    }
    case 'gemini': {
      const { GeminiAdapter } = await import('./gemini')
      return new GeminiAdapter(apiKey)
    }
  }
}
