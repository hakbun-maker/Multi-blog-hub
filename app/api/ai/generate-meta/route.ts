import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { title, htmlContent, mode, language } = await request.json() as {
    title?: string
    htmlContent?: string
    mode?: 'meta' | 'image-prompt'
    language?: 'ko' | 'en'
  }

  // 사용자의 활성 AI 키 조회
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('provider', ['claude', 'openai', 'gemini'])
    .limit(1)

  if (!apiKeys?.length) {
    return NextResponse.json({ error: 'AI API 키가 등록되지 않았습니다.' }, { status: 400 })
  }

  const row = apiKeys[0]
  let apiKey: string
  try {
    apiKey = decrypt(row.encrypted_key)
  } catch {
    return NextResponse.json({ error: 'API 키 복호화 실패' }, { status: 500 })
  }

  try {
    const adapter = await createAIAdapter(row.provider, apiKey)

    if (mode === 'image-prompt') {
      // 이미지 프롬프트 + SEO 메타 동시 생성
      const lang = language === 'ko' ? '한국어' : 'English'
      const contentSummary = htmlContent
        ? `\n\n본문 요약: ${htmlContent.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 500)}`
        : ''
      const prompt = `You are an expert at blog SEO and image generation prompts. Given the topic "${title}"${contentSummary}, generate the following in JSON format:

1. "imagePrompt": A single descriptive sentence in ${lang} for generating a high-quality blog illustration image that captures the core message of the article. Include composition, lighting, colors, and mood details. The image should visually represent the main theme and key takeaway.
2. "imageTitle": 이 이미지의 SEO 친화적인 제목 (한국어, 30자 이내). 글의 핵심 주제를 담되 "관련 이미지" 같은 단순한 표현 대신 구체적으로.
3. "altText": 이미지 대체 텍스트 (한국어, 50자 이내). 시각장애인이 이해할 수 있도록 이미지 내용을 구체적으로 묘사.
4. "caption": 이미지 아래 표시될 설명 (한국어, 40자 이내). 독자의 이해를 돕는 간결한 설명.

반드시 JSON만 응답하세요:
{"imagePrompt": "...", "imageTitle": "...", "altText": "...", "caption": "..."}`

      const text = await adapter.generateText(prompt)
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({
          imagePrompt: (parsed.imagePrompt || '').trim().replace(/^["']|["']$/g, ''),
          imageTitle: parsed.imageTitle || '',
          altText: parsed.altText || '',
          caption: parsed.caption || '',
        })
      }

      // JSON 파싱 실패 시 텍스트만 반환
      const imagePrompt = text.trim().replace(/^["']|["']$/g, '')
      return NextResponse.json({ imagePrompt })
    }

    // 메타 생성 모드 (기본) - generateText로 JSON 응답
    const plainText = (htmlContent ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)

    const prompt = `다음 블로그 글의 SEO 메타 정보와 태그를 생성해주세요.

제목: "${title}"
본문 요약: ${plainText.slice(0, 500)}

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 포함하지 마세요:
{"seoTitle": "SEO 메타 제목 (60자 이내)", "seoDescription": "SEO 메타 설명 (160자 이내)", "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]}`

    const text = await adapter.generateText(prompt)

    // JSON 파싱 (코드블록 감싸기 처리)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      seoTitle: parsed.seoTitle || title,
      seoDescription: parsed.seoDescription || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI 생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
