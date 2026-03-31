import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/monetize/scheduler/entry
 * Manually add a scheduled entry (keyword + blog + date/time)
 *
 * Body:
 *   keywordId?     — existing keyword UUID
 *   keywordText?   — new keyword text (used when keywordId is absent)
 *   blogId         — required
 *   scheduledDate  — required, YYYY-MM-DD
 *   scheduledTime  — required, HH:MM
 *   intentType?    — AD | REVIEW | INFO | CRITIC | COMPARE | TREND
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keywordId, keywordText, blogId, scheduledDate, scheduledTime, intentType } = body

    // --- Required field validation ---
    if (!blogId || !scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { error: 'blogId, scheduledDate, scheduledTime은 필수입니다.' },
        { status: 400 }
      )
    }

    // --- Date format validation (YYYY-MM-DD) ---
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      return NextResponse.json(
        { error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // --- Time format validation (HH:MM) ---
    if (!/^\d{2}:\d{2}$/.test(scheduledTime)) {
      return NextResponse.json(
        { error: '시간 형식이 올바르지 않습니다. (HH:MM)' },
        { status: 400 }
      )
    }

    // --- Blog ownership check ---
    const { data: blog } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()

    if (!blog) {
      return NextResponse.json({ error: '유효하지 않은 블로그입니다.' }, { status: 400 })
    }

    // --- Duplicate check: same blog + same date + same time ---
    const { data: existing } = await supabase
      .from('scheduled_posts')
      .select('id')
      .eq('blog_id', blogId)
      .eq('scheduled_date', scheduledDate)
      .eq('scheduled_time', scheduledTime)
      .not('status', 'eq', 'rejected')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: '같은 블로그에 동일 시간 예약이 이미 존재합니다.' },
        { status: 409 }
      )
    }

    // --- Keyword resolution ---
    let resolvedKeywordId: string | null = keywordId || null

    if (!resolvedKeywordId && keywordText) {
      // Create a new keyword entry with minimal defaults
      const { data: newKeyword, error: kwError } = await supabase
        .from('keywords')
        .insert({
          user_id: user.id,
          keyword: keywordText,
          keyword_type: 'gold',
          revenue_score: 0,
          keyword_grade: 'C',
          monthly_search_volume: 0,
          cpc_estimate: 0,
          competition_score: 0,
          trend_index: 0,
        })
        .select('id')
        .single()

      if (kwError) {
        return NextResponse.json(
          { error: `키워드 생성 실패: ${kwError.message}` },
          { status: 500 }
        )
      }
      resolvedKeywordId = newKeyword.id
    }

    // --- Keyword ownership check (only when keywordId was explicitly supplied) ---
    if (keywordId) {
      const { data: kw } = await supabase
        .from('keywords')
        .select('id')
        .eq('id', keywordId)
        .eq('user_id', user.id)
        .single()

      if (!kw) {
        return NextResponse.json({ error: '유효하지 않은 키워드입니다.' }, { status: 400 })
      }
    }

    // --- Insert scheduled_post ---
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .insert({
        blog_id: blogId,
        keyword_id: resolvedKeywordId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: 'pending',
        writing_mode: 'manual',
        intent_type: intentType || null,
      })
      .select('id')
      .single()

    if (postError) {
      return NextResponse.json(
        { error: `스케줄 생성 실패: ${postError.message}` },
        { status: 500 }
      )
    }

    // --- Insert blog_keyword_assignment (only when a keyword is associated) ---
    if (resolvedKeywordId) {
      const { error: assignError } = await supabase
        .from('blog_keyword_assignments')
        .insert({
          blog_id: blogId,
          keyword_id: resolvedKeywordId,
          assigned_date: scheduledDate,
          assigned_time: scheduledTime,
          assignment_reason: '수동 등록',
          is_confirmed: true,
          intent_type: intentType || null,
        })

      if (assignError) {
        // Non-fatal: log but still return success for the scheduled_post
        console.error('[Schedule Entry] Assignment insert error:', assignError)
      }
    }

    return NextResponse.json({
      success: true,
      id: post.id,
      message: '스케줄이 등록되었습니다.',
    })
  } catch (error) {
    console.error('[Schedule Entry Create Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '스케줄 생성 실패' },
      { status: 500 }
    )
  }
}
