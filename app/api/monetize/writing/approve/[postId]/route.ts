import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/monetize/writing/approve/[postId]
 * Approve and auto-publish a post (set status to 'published')
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

  try {
    // Get the scheduled post
    const { data: post, error: getError } = await supabase
      .from('scheduled_posts')
      .select('id, blog_id, status, content_draft')
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

    // Update post status to published
    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update quality score auto_published flag
    await supabase
      .from('post_quality_scores')
      .update({ auto_published: true, updated_at: new Date().toISOString() })
      .eq('post_id', postId)

    return NextResponse.json({
      data: {
        postId: updatedPost.id,
        status: updatedPost.status,
        publishedAt: updatedPost.published_at,
        message: '포스트가 발행되었습니다.',
      },
      status: 200,
    })
  } catch (error) {
    console.error('Error approving post:', error)
    return NextResponse.json({ error: '포스트 승인 실패' }, { status: 500 })
  }
}
