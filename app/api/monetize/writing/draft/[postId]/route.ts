import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/monetize/writing/draft/[postId]
 * Save draft content update
 */
export async function PATCH(
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
    const body = await request.json()
    const { content, intentType, title, description } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Get the scheduled post
    const { data: postRaw, error: getError } = await supabase
      .from('scheduled_posts')
      .select('id, blog_id')
      .eq('id', postId)
      .single()

    if (getError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user owns the blog
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, user_id')
      .eq('id', postRaw.blog_id)
      .single()

    if (blogError || blog.user_id !== user.id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    // Update the draft content
    const updateData: any = {
      content_draft: content,
      updated_at: new Date().toISOString(),
    }

    if (intentType) {
      updateData.intent_type = intentType
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('scheduled_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Store meta information if provided
    if (title || description) {
      const metaData: any = {}
      if (title) metaData.title = title
      if (description) metaData.description = description

      await supabase
        .from('post_metadata')
        .upsert({
          post_id: postId,
          meta_data: metaData,
          updated_at: new Date().toISOString(),
        })
    }

    return NextResponse.json({
      data: {
        postId: updatedPost.id,
        status: updatedPost.status,
        contentLength: updatedPost.content_draft?.length || 0,
        updatedAt: updatedPost.updated_at,
        message: '드래프트가 저장되었습니다.',
      },
      status: 200,
    })
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json({ error: '드래프트 저장 실패' }, { status: 500 })
  }
}

/**
 * GET /api/monetize/writing/draft/[postId]
 * Get draft content
 */
export async function GET(
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
    const { data: postRaw, error: getError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        blog_id,
        keyword_id,
        status,
        content_draft,
        intent_type,
        created_at,
        updated_at,
        keywords (
          keyword,
          keyword_type
        )
      `
      )
      .eq('id', postId)
      .single()

    if (getError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Verify user owns the blog
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, user_id')
      .eq('id', postRaw.blog_id)
      .single()

    if (blogError || blog.user_id !== user.id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    // Get metadata if exists
    const { data: metadata } = await supabase
      .from('post_metadata')
      .select('meta_data')
      .eq('post_id', postId)
      .single()

    return NextResponse.json({
      data: {
        postId: postRaw.id,
        keyword: (postRaw as any).keywords?.keyword,
        keywordType: (postRaw as any).keywords?.keyword_type,
        status: postRaw.status,
        content: postRaw.content_draft,
        intentType: postRaw.intent_type,
        contentLength: postRaw.content_draft?.length || 0,
        metadata: metadata?.meta_data || null,
        createdAt: postRaw.created_at,
        updatedAt: postRaw.updated_at,
      },
    })
  } catch (error) {
    console.error('Error fetching draft:', error)
    return NextResponse.json({ error: '드래프트 조회 실패' }, { status: 500 })
  }
}
