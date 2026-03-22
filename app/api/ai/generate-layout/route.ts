import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter, createImageAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'
import { uploadImageFromBase64 } from '@/lib/storage/uploadImage'

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

function buildLayoutPrompt(
  userInstruction: string,
  currentConfig: Record<string, unknown>,
  blogInfo: {
    name: string
    description?: string
    blogType?: string
    characterConfig?: Record<string, string>
  }
): string {
  const blogTypeLabel = blogInfo.blogType
    ? (BLOG_TYPE_LABELS[blogInfo.blogType] ?? blogInfo.blogType)
    : ''

  const persona = blogInfo.characterConfig
    ? Object.entries(blogInfo.characterConfig)
        .filter(([, v]) => v)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
    : '(설정 없음)'

  return `당신은 블로그 레이아웃 전문 디자이너입니다. 사용자의 요청을 해석하여 블로그 레이아웃 설정을 생성합니다.

## 블로그 정보
- 블로그 이름: ${blogInfo.name}
${blogTypeLabel ? `- 블로그 유형: ${blogTypeLabel}` : ''}
${blogInfo.description ? `- 블로그 설명: ${blogInfo.description}` : ''}

## AI 캐릭터 페르소나
${persona}

## 현재 레이아웃 설정
${JSON.stringify(currentConfig, null, 2)}

## 사용자 요청
${userInstruction}

## 작업 지침
1. 사용자의 요청을 해석하여 레이아웃 설정을 수정해주세요.
2. 블로그 유형과 AI 캐릭터 페르소나의 성격을 반영하여 창의적으로 디자인해주세요.
3. 색상 조합은 전문적이고 조화로운 것을 선택해주세요.
4. 로고 이미지가 필요하다고 판단되면 logo_type을 "image"로, logo_image_url을 "__GENERATE_LOGO__"로 설정해주세요.
5. header.notice_bar에 환영 문구나 공지를 넣을지 판단해주세요.

## 반환 형식
반드시 유효한 JSON 형식의 LayoutConfig만 반환하세요. 다른 텍스트 없이 JSON만 출력하세요.
다음 구조를 따르세요:

{
  "header": {
    "logo_type": "text" | "image",
    "logo_image_url": string | null,
    "bg_color": "#hex",
    "text_color": "#hex",
    "sticky": boolean,
    "height": "compact" | "normal" | "tall",
    "notice_bar": { "enabled": boolean, "text": string, "bg_color": "#hex" },
    "nav_items": [{ "label": string, "url": string }]
  },
  "layout": {
    "preset": "minimal" | "right_sidebar" | "left_sidebar" | "both_sidebar" | "magazine",
    "max_width": "768px" | "960px" | "1200px" | "100%",
    "bg_color": "#hex",
    "font": "Pretendard" | "Noto Sans KR" | "NanumGothic" | "Malgun Gothic",
    "font_size": number (14~20),
    "line_height": number (1.4~2.0)
  },
  "related_posts": {
    "enabled": boolean,
    "type": "recent" | "popular",
    "count": 3 | 5 | 10,
    "section_title": string
  },
  "ads": { ... (현재 설정 유지) },
  "footer": {
    "bg_color": "#hex",
    "text_color": "#hex",
    "columns": 1 | 2 | 3,
    "column_data": [{ "title": string, "items": [{ "label": string, "url": string }] }],
    "copyright": string,
    "sns": [{ "type": "instagram"|"youtube"|"twitter"|"facebook"|"tiktok"|"blog", "url": string }]
  },
  "tracking": { ... (현재 설정 유지) }
}

중요: ads와 tracking 섹션은 사용자가 명시적으로 변경을 요청하지 않는 한 현재 설정을 그대로 유지하세요.`
}

function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)
}

async function translateToEnglish(
  text: string,
  adapter: { generateText(prompt: string): Promise<string> }
): Promise<string> {
  try {
    const translated = await adapter.generateText(
      `Translate the following Korean image generation prompt to English. Output ONLY the translated prompt, nothing else:\n\n${text}`
    )
    return translated.trim() || text
  } catch {
    return text
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { blogId, instruction, currentConfig } = body as {
    blogId: string
    instruction: string
    currentConfig: Record<string, unknown>
  }

  if (!blogId) return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })
  if (!instruction?.trim()) return NextResponse.json({ error: '레이아웃 수정 지시를 입력해주세요.' }, { status: 400 })

  // 블로그 정보 조회
  const { data: blog } = await supabase
    .from('blogs')
    .select('name, description, blog_type, ai_provider, ai_character_config')
    .eq('id', blogId)
    .eq('user_id', user.id)
    .single()

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  // AI API 키 조회
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const keyMap: Record<string, string> = {}
  for (const row of apiKeys ?? []) {
    try { keyMap[row.provider] = decrypt(row.encrypted_key) } catch {}
  }

  const aiProvider = (blog.ai_provider ?? 'gemini') as 'claude' | 'gemini'
  const aiKey = keyMap[aiProvider]
  if (!aiKey) {
    return NextResponse.json({ error: `${aiProvider} API 키가 등록되지 않았습니다.` }, { status: 400 })
  }

  try {
    const adapter = await createAIAdapter(aiProvider, aiKey)

    // AI에게 레이아웃 설정 생성 요청
    const prompt = buildLayoutPrompt(instruction, currentConfig, {
      name: blog.name,
      description: blog.description,
      blogType: blog.blog_type,
      characterConfig: blog.ai_character_config,
    })

    const text = await adapter.generateText(prompt)
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 응답에서 JSON을 추출할 수 없습니다.')

    const layoutConfig = JSON.parse(jsonMatch[0])

    // 로고 이미지 생성이 필요한 경우
    if (layoutConfig.header?.logo_image_url === '__GENERATE_LOGO__') {
      const imagenKey = keyMap['imagen']
      if (imagenKey) {
        try {
          const imageAdapter = await createImageAdapter('imagen', imagenKey)
          if (imageAdapter) {
            const blogTypeLabel = blog.blog_type
              ? (BLOG_TYPE_LABELS[blog.blog_type] ?? blog.blog_type)
              : 'general'

            let logoPrompt = `Modern, clean, professional blog logo for a ${blogTypeLabel} blog named "${blog.name}". Minimalistic design, suitable for website header. White or transparent background.`

            if (blog.ai_character_config?.personalityKeywords) {
              logoPrompt += ` Personality: ${blog.ai_character_config.personalityKeywords}.`
            }

            if (containsKorean(logoPrompt)) {
              logoPrompt = await translateToEnglish(logoPrompt, adapter)
            }

            const images = await imageAdapter.generateImage({
              prompt: logoPrompt,
              count: 1,
              aspectRatio: '16:9',
            })

            if (images && images.length > 0) {
              const url = await uploadImageFromBase64(
                images[0].base64,
                images[0].mimeType,
                user.id,
                `${blog.name}-logo`
              )
              layoutConfig.header.logo_image_url = url
            } else {
              layoutConfig.header.logo_type = 'text'
              layoutConfig.header.logo_image_url = null
            }
          }
        } catch {
          // 이미지 생성 실패 시 텍스트 로고로 대체
          layoutConfig.header.logo_type = 'text'
          layoutConfig.header.logo_image_url = null
        }
      } else {
        layoutConfig.header.logo_type = 'text'
        layoutConfig.header.logo_image_url = null
      }
    }

    return NextResponse.json({ layoutConfig })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI 레이아웃 생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
