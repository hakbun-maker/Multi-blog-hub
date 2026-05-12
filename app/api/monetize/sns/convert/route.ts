/**
 * @deprecated 신규 흐름은 /api/sns/threads/generate 사용.
 * 기존 monetize 파이프라인 호환을 위해 유지하나, Threads만 지원.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateThreadsPost } from '@/lib/monetize/engines/sns-converter'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const body = await request.json()
    const { blogId, content, keyword: _keyword, platform, postSlug, postTitle } = body

    if (platform !== 'threads') {
      return NextResponse.json({ error: 'Threads만 지원합니다.' }, { status: 400 })
    }

    if (!content || !postSlug || !postTitle) {
      return NextResponse.json({ error: 'content/postSlug/postTitle 필수' }, { status: 400 })
    }

    // 블로그
    const { data: blog } = await supabase
      .from('blogs')
      .select('id, custom_domain')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()

    if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

    // AI 키
    const { data: apiKeys } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('provider', ['claude', 'openai', 'gemini'])
      .limit(1)
      .maybeSingle()

    if (!apiKeys) {
      return NextResponse.json({ error: 'AI API 키가 등록되지 않았습니다.' }, { status: 400 })
    }

    const apiKey = decrypt(apiKeys.encrypted_key)

    const result = await generateThreadsPost({
      postTitle,
      postContent: content,
      postSlug,
      blogCustomDomain: blog.custom_domain,
      aiApiKey: apiKey,
      aiProvider: apiKeys.provider as 'claude' | 'openai' | 'gemini',
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Threads 변환 실패'
    console.error('Threads convert error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
