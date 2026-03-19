import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/monetize/writing/reject/[postId]
 * Reject a post: return keyword to pool, set status to 'rejected'
 */
export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const supabase = createClient()

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const { postId } = params
  const body = await request.json().catch(() => ({}))
  const { rejectionReason = '품질 기준 미달' } = body

  try {
    // Get the scheduled post
    const { data: post, error: getError } = await supabase
      .from('scheduled_posts')
      .select('id, blog_id, keyword_id, status')
      .eq('id', postId)
      .single()

    if (getError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user owns the blog
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, user_id')
      .eq('id', post.blog_id)
      .single()

    if (blogError || blog.user_id !== user.id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    // Update post status to rejected
    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If there's a keyword, mark it as rejected and return it to available pool
    if (post.keyword_id) {
      await supabase
        .from('keywords')
        .update({
          status: 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.keyword_id)
    }

    // Update quality score with rejection reason
    await supabase
      .from('post_quality_scores')
      .update({
        auto_published: false,
        review_reason: rejectionReason,
        updated_at: new Date().toISOString(),
      })
      .eq('post_id', postId)

    return NextResponse.json({
      data: {
        postId: updatedPost.id,
        status: updatedPost.status,
        keywordReturned: post.keyword_id ? true : false,
        rejectionReason,
        message: '포스트가 거절되었고 키워드는 풀로 반환되었습니다.',
      },
      status: 200,
    })
  } catch (error) {
    console.error('Error rejecting post:', error)
    return NextResponse.json({ error: '포스트 거절 실패' }, { status: 500 })
  }
}
