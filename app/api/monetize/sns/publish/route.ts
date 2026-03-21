import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'
import { publishToInstagram } from '@/lib/sns/publishers/instagram'
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
      return NextResponse.json(
        { error: '블로그, 플랫폼, 내용은 필수입니다.' },
        { status: 400 }
      )
    }

    if (!['instagram', 'twitter', 'threads'].includes(platform)) {
      return NextResponse.json(
        { error: '지원하지 않는 플랫폼입니다.' },
        { status: 400 }
      )
    }

    // 블로그 소유권 확인 + SNS 설정 조회
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, settings')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()

    if (blogError || !blog) {
      return NextResponse.json(
        { error: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 플랫폼 연결 상태 확인
    const snsSettings = blog.settings?.snsSettings || {}
    const platformConfig = snsSettings[platform]
    if (!platformConfig?.accessToken) {
      return NextResponse.json(
        { error: `${platform} 계정이 연결되지 않았습니다. 먼저 OAuth 인증을 완료해주세요.` },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'SNS 포스트 생성 실패: ' + insertError.message },
        { status: 500 }
      )
    }

    // Access Token 복호화
    const accessToken = decrypt(platformConfig.accessToken)

    // 실제 SNS 플랫폼에 게시
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
        data: {
          ...snsPost,
          platform_post_id: published.postId,
          status: 'published',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: snsPost,
    })
  } catch (error: any) {
    console.error('SNS publish error:', error)
    return NextResponse.json(
      { error: error.message || 'SNS 발행 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

async function publishToSNSPlatform(
  platform: string,
  content: string,
  imageUrl: string | null,
  accessToken: string
): Promise<{ postId: string } | null> {
  switch (platform) {
    case 'instagram':
      return publishToInstagram(content, imageUrl, accessToken)
    case 'twitter':
      return publishToTwitter(content, accessToken)
    case 'threads':
      return publishToThreads(content, imageUrl, accessToken)
    default:
      return null
  }
}
