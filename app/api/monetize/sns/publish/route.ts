import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // 블로그 소유권 확인
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()

    if (blogError || !blog) {
      return NextResponse.json(
        { error: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
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

    // 실제 SNS 플랫폼에 게시 (주석 처리 - 플랫폼 인증 필요)
    // const published = await publishToSNSPlatform(platform, content, imageUrl, accessToken)
    // if (published) {
    //   await supabase
    //     .from('sns_posts')
    //     .update({
    //       platform_post_id: published.postId,
    //       status: 'published',
    //       published_at: new Date().toISOString(),
    //     })
    //     .eq('id', snsPost.id)
    // }

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

/**
 * 실제 SNS 플랫폼에 게시하는 함수 (향후 구현)
 */
// async function publishToSNSPlatform(
//   platform: string,
//   content: string,
//   imageUrl: string | null,
//   accessToken: string
// ) {
//   switch (platform) {
//     case 'instagram':
//       return publishToInstagram(content, imageUrl, accessToken)
//     case 'twitter':
//       return publishToTwitter(content, accessToken)
//     case 'threads':
//       return publishToThreads(content, imageUrl, accessToken)
//     default:
//       return null
//   }
// }
