import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'

const CHARACTER_FIELDS = {
  // 카테고리 1: 페르소나
  nickname: '닉네임 (블로그 필자 이름)',
  ageRange: '나이대 (문체와 감성에 영향)',
  expertise: '직업/전문분야 (글의 관점을 결정)',
  personalityKeywords: '성격 키워드 3~5개',
  blogPurpose: '블로그 운영 목적',
  // 카테고리 2: 말투 & 톤
  honorificStyle: '존칭 스타일 (~해요체, ~합니다체, 반말, ~다체 중 택1)',
  sentenceLength: '문장 길이 경향 (짧고 끊어쓰기, 중간, 길고 흐르는 문체 중 택1)',
  emotionLevel: '감정 표현 수준 (절제형, 보통, 풍부형 중 택1)',
  humorStyle: '유머 스타일 (없음, 드라이, 자기비하, 말장난 중 택1)',
  habitExpressions: '습관 표현 (캐릭터 고유 버릇 2~3가지)',
  emojiUsage: '이모지 사용 (안 씀, 가끔, 자주 중 택1)',
  // 카테고리 3: 글 구조 & 포맷
  introPattern: '도입부 패턴 (질문형, 일화/경험형, 바로 본론형, 공감 유도형 중 택1)',
  subtitleStyle: '소제목 스타일 (번호형, 키워드형, 질문형, 안 씀 중 택1)',
  closingPattern: '마무리 패턴 (요약 정리형, 개인 감상형, 질문/소통 유도형, 한줄 마무리 중 택1)',
  postLengthRange: '글 길이 범위 (짧음 800~1200자, 보통 1500~2500자, 긴글 3000자+ 중 택1)',
  // 카테고리 4: 콘텐츠 관점
  approachAngle: '접근 앵글 (실용 정보, 개인 체험기, 비교 분석, 감성 에세이 중 택1)',
  expertiseDepth: '전문성 깊이 (초보 눈높이, 중급, 전문가 중 택1)',
  personalExpRatio: '개인 경험 비율 (높음 50%+, 보통 20~30%, 낮음 중 택1)',
  evidenceStyle: '근거 제시 방식 (직접 체험형, 전문가 인용형, 다수 의견형 중 택1)',
  // 카테고리 5: 핵심 차별점
  diffKeywords: '핵심 차별 키워드 3개',
  forbiddenExpressions: '절대 금지 표현/패턴',
}

const BLOG_TYPE_LABELS: Record<string, string> = {
  'legal': '법률',
  'finance': '금융/재테크',
  'medical': '의료/건강',
  'it-tech': 'IT/테크',
  'education': '교육',
  'beauty-fashion': '뷰티/패션',
  'food': '음식/요리',
  'travel': '여행',
  'parenting': '육아/가족',
  'lifestyle': '라이프스타일',
  'real-estate': '부동산',
  'business': '비즈니스/마케팅',
  'entertainment': '엔터테인먼트',
  'sports': '스포츠/피트니스',
  'pets': '반려동물',
  'automotive': '자동차',
  'interior': '인테리어/홈',
  'news': '뉴스/시사',
  'science': '과학/기술',
  'other': '기타',
}

function buildCharacterPrompt(
  blogInfo: { name: string; description?: string; blogType?: string; categories?: string[] },
  fieldKey?: string,
  existingConfig?: Record<string, string>,
): string {
  const blogTypeLabel = blogInfo.blogType ? (BLOG_TYPE_LABELS[blogInfo.blogType] ?? blogInfo.blogType) : ''

  const context = [
    `블로그 이름: ${blogInfo.name}`,
    blogTypeLabel ? `블로그 유형: ${blogTypeLabel}` : '',
    blogInfo.description ? `블로그 설명: ${blogInfo.description}` : '',
    blogInfo.categories?.length ? `블로그 카테고리: ${blogInfo.categories.join(', ')}` : '',
  ].filter(Boolean).join('\n')

  // 단일 필드 재생성
  if (fieldKey && existingConfig) {
    const fieldDesc = CHARACTER_FIELDS[fieldKey as keyof typeof CHARACTER_FIELDS] ?? fieldKey
    const otherContext = Object.entries(existingConfig)
      .filter(([k, v]) => k !== fieldKey && v)
      .map(([k, v]) => `- ${CHARACTER_FIELDS[k as keyof typeof CHARACTER_FIELDS] ?? k}: ${v}`)
      .join('\n')

    return `당신은 블로그 AI 캐릭터 전문 설계사입니다.

## 블로그 정보
${context}

## 기존 캐릭터 설정
${otherContext || '(아직 없음)'}

위 블로그와 기존 캐릭터 설정을 참고하여, 아래 항목 하나를 새로 작성해주세요.
기존 설정과 일관성을 유지하면서도 더 매력적으로 만들어주세요.

작성할 항목: ${fieldDesc}

반드시 해당 항목의 값만 텍스트로 응답하세요. JSON이나 다른 포맷 없이 순수 텍스트만 출력하세요.`
  }

  // 전체 일괄 생성
  const fieldList = Object.entries(CHARACTER_FIELDS)
    .map(([key, desc]) => `"${key}": "${desc}"`)
    .join(',\n  ')

  return `당신은 블로그 AI 캐릭터 전문 설계사입니다.

## 블로그 정보
${context}

위 블로그에 어울리는 AI 캐릭터를 설계해주세요.
${blogTypeLabel ? `특히 "${blogTypeLabel}" 유형의 블로그에 적합한 전문성과 신뢰감 있는 캐릭터를 만들어주세요.` : ''}
${blogInfo.categories?.length ? `블로그의 카테고리(${blogInfo.categories.join(', ')})를 참고하여 해당 분야에 맞는 캐릭터를 구성해주세요.` : ''}

아래 21개 항목을 **빠짐없이 모두** 작성해주세요. 각 항목은 한국어로, 구체적이고 개성 있게 작성하세요.

특히 다음 항목들은 반드시 구체적으로 작성해주세요:
- habitExpressions: 캐릭터 고유 습관 표현 2~3가지를 구체적인 예시 문장으로 작성 (예: "솔직히~", "근데 이게 진짜~")
- diffKeywords: 이 캐릭터만의 핵심 차별 키워드 3개를 쉼표로 구분하여 작성
- forbiddenExpressions: 이 캐릭터가 절대 쓰지 않을 표현이나 패턴을 구체적으로 작성

반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력. 21개 키를 모두 포함:
{
  ${fieldList}
}`
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { blogId, provider = 'gemini', fieldKey, existingConfig, blogInfo } = body

  if (!blogId) return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })

  // 블로그 소유권 확인 (select * 로 컬럼 문제 방지)
  const { data: blog } = await supabase
    .from('blogs')
    .select('*')
    .eq('id', blogId)
    .eq('user_id', user.id)
    .single()

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  // 클라이언트에서 전달한 blogInfo를 우선 사용, 없으면 DB에서 가져온 데이터 사용
  const resolvedBlogInfo = blogInfo ?? {
    name: blog.name,
    description: blog.description,
    blogType: blog.blog_type,
  }

  // API 키 조회
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const keyMap: Record<string, string> = {}
  for (const row of apiKeys ?? []) {
    try { keyMap[row.provider] = decrypt(row.encrypted_key) } catch {}
  }

  const aiProvider = provider as 'claude' | 'gemini'
  const apiKey = keyMap[aiProvider]
  if (!apiKey) {
    return NextResponse.json({ error: `${aiProvider} API 키가 등록되지 않았습니다.` }, { status: 400 })
  }

  const adapter = await createAIAdapter(aiProvider, apiKey)
  const prompt = buildCharacterPrompt(resolvedBlogInfo, fieldKey, existingConfig)

  try {
    const text = await adapter.generateText(prompt)

    // 단일 필드 재생성
    if (fieldKey) {
      return NextResponse.json({ value: text.trim() })
    }

    // 전체 생성 → JSON 파싱
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON 파싱 실패')

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ character: parsed })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI 생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
