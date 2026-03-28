import type { IntentType, Grade, BlogLanguage } from '@/types/monetize'
import { PASONA_WEIGHTS } from '../constants'

export interface WritingContext {
  keyword: string
  intentType: IntentType
  blogGrade: Grade
  adCategory: string | null
  language: BlogLanguage
  characterConfig?: {
    name?: string
    tone?: string
    style?: string
    persona?: string
  }
  clusterKeywords?: string[]
  newsArticles?: { title: string; description: string }[]
}

/** L1: PASONA × Intent 가중치 기반 본문 생성 프롬프트 */
export function buildPasonaPrompt(ctx: WritingContext): string {
  const weights = PASONA_WEIGHTS[ctx.intentType]
  const agitationLabel = ['AD', 'CRITIC'].includes(ctx.intentType) ? 'Agitation (불안 자극)' : 'Affinity (공감 형성)'

  return `당신은 전문 블로그 콘텐츠 작성자입니다.

## 작성 지시
키워드: "${ctx.keyword}"
Intent: ${ctx.intentType}
블로그 등급: ${ctx.blogGrade}
언어: ${ctx.language}
${ctx.adCategory ? `광고 카테고리: ${ctx.adCategory}` : ''}
${ctx.characterConfig?.persona ? `페르소나: ${ctx.characterConfig.persona}` : ''}
${ctx.characterConfig?.tone ? `어조: ${ctx.characterConfig.tone}` : ''}
${ctx.clusterKeywords?.length ? `관련 키워드: ${ctx.clusterKeywords.join(', ')}` : ''}
${ctx.newsArticles?.length ? `\n## 참고 뉴스 기사\n아래 뉴스 기사의 핵심 내용을 참고하되, 그대로 복사하지 말고 전문적 관점에서 재구성하세요:\n${ctx.newsArticles.map((a, i) => `${i + 1}. ${a.title} - ${a.description}`).join('\n')}` : ''}

## PASONA 구조 (가중치 기반)
각 섹션을 아래 비율로 작성하세요:
- [P] Problem (문제 제기): ${weights.P}%
- [A] ${agitationLabel}: ${weights.A}%
- [S] Solution (해결책): ${weights.S}%
- [O] Offer (제안): ${weights.O}%
- [N] Narrowing (한정/긴급성): ${weights.N}%
- [A2] Action (행동 촉구): ${weights.A2}%

## 형식 요구사항
- H2 태그로 각 PASONA 섹션 구분 (## [P] ..., ## [A] ... 등)
- 각 섹션 내 H3 소제목 1-2개
- 전체 2000-3000자
- 키워드 밀도 1-2%
- 문장 평균 40자 이내
- 단락 5줄 이내

## 출력 형식
마크다운으로 작성하세요.`
}

/** L2: SEO + AEO/GEO 발견 최적화 프롬프트 */
export function buildSEOPrompt(ctx: WritingContext, draft: string): string {
  return `아래 글을 SEO + AI 검색 최적화(AEO) 관점에서 보강하세요.

## 현재 글
${draft}

## SEO 최적화 요구사항
1. 메타 타이틀: 35자 이내, 키워드 "${ctx.keyword}" 포함
2. 메타 설명: 150자 이내
3. H2에 키워드 자연스럽게 포함
4. 이미지 alt 태그에 키워드 포함
5. 내부 링크 위치 2곳 표시 (<!-- internal-link -->)

## AEO 최적화 요구사항
1. 글 하단에 FAQ 아코디언 3개 추가 (<details><summary>질문</summary>답변 80-120자</details>)
2. 각 FAQ 답변은 핵심 내용을 간결하게
3. 구체적 수치/통계 2개 이상 포함

## JSON-LD Schema
FAQPage + Article Schema를 <script type="application/ld+json"> 태그로 생성

## 출력
보강된 전체 마크다운 + 메타데이터 JSON`
}

/** L3: 문맥광고 후처리 프롬프트 */
export function buildAdSectionPrompt(ctx: WritingContext, draft: string): string {
  return `아래 글에 문맥광고 최적화 태그를 삽입하세요.

## 글 내용
${draft}

## 광고 태그 삽입 규칙
1. PASONA [S] 섹션 시작점: <!-- google_ad_section_start(name=so) -->
2. PASONA [O] 섹션: <!-- google_ad_section_start(name=offer) -->
3. PASONA [N] 섹션 끝: <!-- google_ad_section_end -->
4. 광고 카테고리 "${ctx.adCategory || '일반'}" 관련 키워드를 광고 섹션에 집중
5. 광고 섹션 비율: 전체의 30% 이하

## 키워드 밀도 조정
- 전체 키워드 밀도: 1-2% 유지
- 광고 섹션 내 고CPC 키워드 집중

## 이미지 alt 태그
이미지가 있으면 alt에 키워드 포함

출력: 광고 태그가 삽입된 최종 마크다운`
}

/** 메타데이터 생성 */
export function buildMetaPrompt(ctx: WritingContext): string {
  return `키워드 "${ctx.keyword}"에 대한 SEO 메타데이터를 생성하세요.

JSON 형식:
{
  "title": "35자 이내 제목 (키워드 포함)",
  "description": "150자 이내 설명",
  "tags": ["태그1", "태그2", ...],
  "slug": "url-friendly-slug"
}`
}
