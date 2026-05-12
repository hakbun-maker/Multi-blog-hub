/**
 * POST /api/monetize/sns/publish
 *
 * 단일 SNS 플랫폼에 게시. Threads는 사용자 레벨 토큰(ai_api_keys) 사용.
 *
 * Body: { blogId, scheduledPostId?, platform: 'threads' | 'twitter', content, imageUrl? }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'
import { publishToTwitter } from '@/lib/sns/publishers/twitter'
import { publishToThreads } from '@/lib/sns/publishers/threads'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const body = await request.json()
    const { blogId, scheduledPostId, platform, content, imageUrl } = body

    if (!blogId || !platform || !content) {
      return NextResponse.json({ error: '블로그, 플랫폼, 내용은 필수입니다.' }, { status: 400 })
    }

    if (!['twitter', 'threads'].includes(platform)) {
      return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 })
    }

    // 블로그 소유권 확인
    const { data: blog } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()
    if (!blog) {
      return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 사용자 레벨 토큰 조회 (ai_api_keys)
    const { data: tokenRow } = await supabase
      .from('ai_api_keys')
      .select('encrypted_key, is_active')
      .eq('user_id', user.id)
      .eq('provider', platform)
      .eq('is_active', true)
      .maybeSingle()

    if (!tokenRow) {
      return NextResponse.json({
        error: `${platform} 토큰이 없습니다. 설정 > API 키 관리에서 등록해주세요.`,
      }, { status: 400 })
    }

    let accessToken: string
    try {
      accessToken = decrypt(tokenRow.encrypted_key)
    } catch {
      return NextResponse.json({ error: '토큰 복호화 실패' }, { status: 500 })
    }

    // sns_posts 레코드 생성
    const { data: snsPost, error: insertError } = await supabase
      .from('sns_posts')
      .insert({
        blog_id: blogId,
        scheduled_post_id: scheduledPostId || null,
        platform,
        content,
        image_url: imageUrl || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'SNS 포스트 생성 실패: ' + insertError.message }, { status: 500 })
    }

    // 실제 발행
    const published = await publishToSNSPlatform(platform, content, imageUrl, accessToken)

    if (published) {
      await supabase
        .from('sns_posts')
        .update({
          platform_post_id: published.postId,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', snsPost.id)

      return NextResponse.json({
        success: true,
        data: { ...snsPost, platform_post_id: published.postId, status: 'published' },
      })
    }

    return NextResponse.json({ success: true, data: snsPost })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'SNS 발행 중 오류'
    console.error('SNS publish error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function publishToSNSPlatform(
  platform: string,
  content: string,
  imageUrl: string | null,
  accessToken: string,
): Promise<{ postId: string } | null> {
  switch (platform) {
    case 'twitter':
      return publishToTwitter(content, accessToken)
    case 'threads':
      return publishToThreads(content, imageUrl, accessToken)
    default:
      return null
  }
}
