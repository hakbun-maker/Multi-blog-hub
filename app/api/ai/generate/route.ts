import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { keyword, relatedKeywords = [], blogIds = [], imageCount = 0 } = body

  if (!keyword) return NextResponse.json({ error: 'keyword는 필수입니다.' }, { status: 400 })
  if (!blogIds.length) return NextResponse.json({ error: '블로그를 1개 이상 선택하세요.' }, { status: 400 })

  // 블로그 정보 조회 (AI 공급자 + 캐릭터 설정)
  const { data: blogs, error: blogsError } = await supabase
    .from('blogs')
    .select('id, name, ai_provider, ai_character_config')
    .in('id', blogIds)
    .eq('user_id', user.id)

  if (blogsError || !blogs?.length) {
    return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })
  }

  // AI API 키 조회 (공급자별)
  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const keyMap: Record<string, string> = {}
  for (const row of apiKeys ?? []) {
    try { keyMap[row.provider] = decrypt(row.encrypted_key) } catch {}
  }

  // Gemini 과부하 등 일시적 오류 시 재시도
  async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 3000): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      const isRetryable = msg.includes('high demand') || msg.includes('overloaded') || msg.includes('503') || msg.includes('rate limit')
      if (retries > 0 && isRetryable) {
        await new Promise(r => setTimeout(r, delayMs))
        return withRetry(fn, retries - 1, delayMs * 1.5)
      }
      throw e
    }
  }

  // 블로그별 병렬 생성
  const results = await Promise.allSettled(
    blogs.map(async (blog) => {
      const provider = blog.ai_provider ?? 'claude'
      const apiKey = keyMap[provider]
      if (!apiKey) throw new Error(`${provider} API 키가 등록되지 않았습니다.`)

      const adapter = await createAIAdapter(provider, apiKey)
      return withRetry(() => adapter.generatePost({
        keyword,
        relatedKeywords,
        characterConfig: blog.ai_character_config ?? {},
        imageCount,
        blogId: blog.id,
      }))
    })
  )

  const posts = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return { success: true, ...result.value }
    }
    return {
      success: false,
      blogId: blogs[i].id,
      error: result.reason?.message ?? '생성 실패',
    }
  })

  return NextResponse.json({ posts })
}
