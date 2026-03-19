import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface RouteParams {
  id: string
}

/**
 * DELETE /api/monetize/scheduler/entry/[id]
 * Remove schedule entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
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

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: '포스트 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // Verify user owns the post
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        blogs(user_id)
      `
      )
      .eq('id', id)
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

    // Check post status - can't delete if already published
    if (post && 'status' in post && post.status === 'published') {
      return NextResponse.json(
        { error: '이미 발행된 포스트는 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    // Delete the scheduled post
    const { error: deleteError } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: `삭제 실패: ${deleteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '스케줄이 삭제되었습니다',
      deletedId: id,
    })
  } catch (error) {
    console.error('[Delete Entry Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '삭제 실패',
      },
      { status: 500 }
    )
  }
}
