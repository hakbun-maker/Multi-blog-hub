import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { keywords } = await request.json() as { keywords: string[] }
  if (!keywords?.length) {
    return NextResponse.json({ error: '키워드를 1개 이상 입력하세요.' }, { status: 400 })
  }

  // 사용자의 활성 AI 키 조회 (아무거나 하나)
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('provider', ['claude', 'openai', 'gemini'])
    .limit(1)

  if (!apiKeys?.length) {
    return NextResponse.json({ error: 'AI API 키가 등록되지 않았습니다. 설정에서 등록해주세요.' }, { status: 400 })
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

    const prompt = `다음 키워드들에 대해 블로그 SEO에 도움이 되는 연관 키워드와 형태소를 분석해주세요.

키워드: ${keywords.join(', ')}

연관 키워드 10~15개를 JSON 배열로만 응답하세요. 다른 텍스트 없이 JSON만:
["연관키워드1", "연관키워드2", "연관키워드3"]`

    const text = await adapter.generateText(prompt)

    // JSON 파싱
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    let relatedKeywords: string[] = []

    if (arrMatch) {
      const parsed = JSON.parse(arrMatch[0])
      if (Array.isArray(parsed)) {
        relatedKeywords = parsed.filter((k): k is string => typeof k === 'string')
      }
    }

    // 원본 키워드의 형태소 분석 (간단한 한국어 분리)
    for (const kw of keywords) {
      const parts = kw.split(/\s+/)
      for (const p of parts) {
        if (p.length >= 2 && !keywords.includes(p) && !relatedKeywords.includes(p)) {
          relatedKeywords.push(p)
        }
      }
    }

    return NextResponse.json({ relatedKeywords: relatedKeywords.slice(0, 15) })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI 분석 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
