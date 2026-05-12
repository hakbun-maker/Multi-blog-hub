/**
 * POST /api/sns/threads/generate
 *
 * 에디터에서 "AI 생성" 버튼 클릭 시 호출.
 * 글 본문 + 제목 + slug + blogId를 받아 100만 공식 4줄 + CTA + 링크 반환.
 *
 * Body: { blogId, postTitle, postContent, postSlug }
 * 응답: { threadsText, ctaText, postUrl, characterCount, lineValidations }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateThreadsPost } from '@/lib/monetize/engines/sns-converter'
import { decrypt } from '@/lib/utils/encryption'

export const dynamic = 'force-dynamic'

interface RequestBody {
  blogId: string
  postTitle: string
  postContent: string
  postSlug: string
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Partial<RequestBody>
  const { blogId, postTitle, postContent, postSlug } = body

  if (!blogId || !postTitle || !postContent || !postSlug) {
    return NextResponse.json({
      error: 'blogId, postTitle, postContent, postSlug 모두 필수입니다.',
    }, { status: 400 })
  }

  // 블로그 정보 (custom_domain 추출)
  const { data: blog } = await supabase
    .from('blogs')
    .select('id, custom_domain')
    .eq('id', blogId)
    .eq('user_id', user.id)
    .single()

  if (!blog) {
    return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })
  }

  if (!blog.custom_domain) {
    return NextResponse.json({
      error: '이 블로그는 custom_domain이 없어 Threads 발행 시 링크를 생성할 수 없습니다. 블로그 설정 > 도메인을 먼저 등록해주세요.',
    }, { status: 400 })
  }

  // AI 키 조회 (글로벌 ai_api_keys)
  const { data: aiKey } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('provider', ['claude', 'openai', 'gemini'])
    .limit(1)
    .maybeSingle()

  if (!aiKey) {
    return NextResponse.json({
      error: 'AI 키가 없습니다. 설정 > API 키 관리에서 Claude/OpenAI/Gemini 중 하나를 등록해주세요.',
    }, { status: 400 })
  }

  let apiKey: string
  try {
    apiKey = decrypt(aiKey.encrypted_key)
  } catch {
    return NextResponse.json({ error: 'AI 키 복호화 실패' }, { status: 500 })
  }

  try {
    const result = await generateThreadsPost({
      postTitle,
      postContent,
      postSlug,
      blogCustomDomain: blog.custom_domain,
      aiApiKey: apiKey,
      aiProvider: aiKey.provider as 'claude' | 'openai' | 'gemini',
    })

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Threads 생성 실패'
    console.error('Threads generate error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
