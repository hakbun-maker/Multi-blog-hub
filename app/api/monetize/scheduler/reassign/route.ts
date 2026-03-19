import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface ReassignRequest {
  postId: string
  newBlogId: string
  newDate: string
  newTime: string
}

/**
 * PUT /api/monetize/scheduler/reassign
 * Drag-and-drop reassignment (postId, newBlogId, newDate, newTime)
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as ReassignRequest

    // Validate input
    if (!body.postId || !body.newBlogId || !body.newDate || !body.newTime) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      )
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.newDate)) {
      return NextResponse.json(
        { error: '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(body.newTime)) {
      return NextResponse.json(
        { error: '시간 형식이 올바르지 않습니다 (HH:MM)' },
        { status: 400 }
      )
    }

    // Verify user owns the post
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        blog_id,
        blogs(user_id)
      `
      )
      .eq('id', body.postId)
      .single()

    if (postError) {
      return NextResponse.json(
        { error: '포스트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if ((post as any)?.blogs?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify new blog belongs to user
    const { data: newBlog, error: newBlogError } = await supabase
      .from('blogs')
      .select('id, user_id')
      .eq('id', body.newBlogId)
      .eq('user_id', user.id)
      .single()

    if (newBlogError || !newBlog) {
      return NextResponse.json(
        { error: '대상 블로그를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Update the scheduled post
    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update({
        blog_id: body.newBlogId,
        scheduled_date: body.newDate,
        scheduled_time: body.newTime,
      })
      .eq('id', body.postId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `재배정 실패: ${updateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      post: {
        id: updatedPost.id,
        blogId: updatedPost.blog_id,
        scheduledDate: updatedPost.scheduled_date,
        scheduledTime: updatedPost.scheduled_time,
      },
    })
  } catch (error) {
    console.error('[Reassign Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '재배정 실패',
      },
      { status: 500 }
    )
  }
}
