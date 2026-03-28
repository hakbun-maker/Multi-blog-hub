import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { title, htmlContent, mode, language = 'ko' } = await request.json() as {
    title?: string
    htmlContent?: string
    mode?: 'meta' | 'image-prompt'
    language?: string
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

    // 언어별 문화권 힌트 (이미지 생성 시 활용)
    const isKorean = !language || language === 'ko'
    const cultureMap: Record<string, string> = {
      ko: 'Korean cultural context, Korean settings and aesthetics',
      en: 'Western/international cultural context, diverse modern settings',
      ja: 'Japanese cultural context, Japanese settings and aesthetics',
      de: 'German/European cultural context, European settings',
      pt_br: 'Brazilian cultural context, Brazilian settings and aesthetics',
      es: 'Hispanic/Latin cultural context, Spanish-speaking world settings',
    }
    const langNameMap: Record<string, string> = {
      ko: '한국어', en: 'English', ja: '日本語', de: 'Deutsch', pt_br: 'Português', es: 'Español',
    }
    const cultureHint = cultureMap[language] ?? cultureMap.ko
    const langName = langNameMap[language] ?? '한국어'

    if (mode === 'image-prompt') {
      const contentSummary = htmlContent
        ? `\n\nContent summary: ${htmlContent.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 500)}`
        : ''
      const prompt = `You are an expert at blog SEO and image generation prompts. Given the topic "${title}"${contentSummary}, generate the following in JSON format:

1. "imagePrompt": A single descriptive sentence in English for generating a high-quality blog illustration image. IMPORTANT: The image must reflect ${cultureHint}. Do NOT use Korean-specific imagery unless the blog language is Korean. Include composition, lighting, colors, and mood details appropriate for the target culture.
2. "imageTitle": SEO-friendly image title in ${langName} (under 30 chars). Be specific about the topic.
3. "altText": Image alt text in ${langName} (under 50 chars). Describe the image content concretely.
4. "caption": Image caption in ${langName} (under 40 chars). Brief description to help reader understanding.

Respond only in JSON:
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

      const imagePrompt = text.trim().replace(/^["']|["']$/g, '')
      return NextResponse.json({ imagePrompt })
    }

    // 메타 생성 모드 (기본) - generateText로 JSON 응답
    const plainText = (htmlContent ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)

    const prompt = isKorean
      ? `다음 블로그 글의 SEO 메타 정보와 태그를 생성해주세요.

제목: "${title}"
본문 요약: ${plainText.slice(0, 500)}

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 포함하지 마세요:
{"seoTitle": "SEO 메타 제목 (60자 이내)", "seoDescription": "SEO 메타 설명 (160자 이내)", "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]}`
      : `Generate SEO meta information and tags for the following blog post. ALL output must be in ${langName}.

Title: "${title}"
Content summary: ${plainText.slice(0, 500)}

Respond ONLY in JSON format. All values must be in ${langName}:
{"seoTitle": "SEO meta title in ${langName} (under 60 chars)", "seoDescription": "SEO meta description in ${langName} (under 160 chars)", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}`

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
