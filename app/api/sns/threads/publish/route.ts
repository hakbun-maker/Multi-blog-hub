/**
 * POST /api/sns/threads/publish
 *
 * 글 발행 직후 호출되어 Threads에 게시.
 * 본문 4줄 + 별도 CTA + 링크는 호출 측이 이미 조합한 텍스트를 보냄.
 *
 * Body: { content: string, blogId?: string, postId?: string }
 *   - content: Threads에 게시할 텍스트 전체 (본문 + CTA + 링크 포함 가능)
 *   - blogId/postId: sns_posts 레코드 추적용 (선택)
 *
 * 토큰: ai_api_keys (provider='threads', is_active=true)
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'
import { publishToThreads } from '@/lib/sns/publishers/threads'

export const dynamic = 'force-dynamic'

interface RequestBody {
  content: string
  blogId?: string
  postId?: string
  imageUrl?: string
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Partial<RequestBody>
  const { content, blogId, postId, imageUrl } = body

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: 'content 필수' }, { status: 400 })
  }
  if (content.length > 500) {
    return NextResponse.json({ error: 'Threads 한도(500자) 초과' }, { status: 400 })
  }

  // 토큰
  const { data: tokenRow } = await supabase
    .from('ai_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('provider', 'threads')
    .eq('is_active', true)
    .maybeSingle()

  if (!tokenRow) {
    return NextResponse.json({
      error: 'Threads 토큰 없음. 설정 > API 키 관리에서 등록해주세요.',
    }, { status: 400 })
  }

  let accessToken: string
  try {
    accessToken = decrypt(tokenRow.encrypted_key)
  } catch {
    return NextResponse.json({ error: '토큰 복호화 실패' }, { status: 500 })
  }

  // 발행
  try {
    const result = await publishToThreads(content, imageUrl ?? null, accessToken)

    // sns_posts 레코드 (선택)
    if (blogId) {
      await supabase.from('sns_posts').insert({
        blog_id: blogId,
        platform: 'threads',
        content,
        image_url: imageUrl ?? null,
        platform_post_id: result.postId,
        status: 'published',
        published_at: new Date().toISOString(),
        scheduled_post_id: postId ?? null,
      })
    }

    return NextResponse.json({
      ok: true,
      threadsPostId: result.postId,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Threads 발행 실패'
    console.error('Threads publish error:', err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
