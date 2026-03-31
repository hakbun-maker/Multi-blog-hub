import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface CalendarQueryParams {
  year?: string
  month?: string
}

interface ScheduledPostWithKeyword {
  id: string
  blogId: string
  blogName: string
  keywordId: string | null
  keyword: string | null
  keywordGrade: string | null
  scheduledDate: string
  scheduledTime: string
  status: string
  writingMode: string
  intentType: string | null
  intentFitScore: number
}

interface CalendarResponse {
  [date: string]: ScheduledPostWithKeyword[]
}

/**
 * GET /api/monetize/scheduler/calendar?year=2026&month=3
 * Monthly calendar query (year, month params) → returns scheduled_posts grouped by date
 */
export async function GET(request: NextRequest) {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')

    // Default to current month
    const now = new Date()
    const year = yearParam ? parseInt(yearParam) : now.getFullYear()
    const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid year or month parameter' },
        { status: 400 }
      )
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Fetch scheduled posts for this user's blogs in the month
    const { data: posts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select(
        `
        id,
        blog_id,
        blogs(name),
        keyword_id,
        keywords(keyword, keyword_grade),
        scheduled_date,
        scheduled_time,
        status,
        writing_mode,
        intent_type,
        intent_fit_score
      `
      )
      .gte('scheduled_date', startDateStr)
      .lte('scheduled_date', endDateStr)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })

    if (postsError) {
      return NextResponse.json(
        { error: `캘린더 조회 실패: ${postsError.message}` },
        { status: 400 }
      )
    }

    // Group by date
    const calendar: CalendarResponse = {}

    if (posts && posts.length > 0) {
      for (const post of posts) {
        const date = post.scheduled_date
        if (!calendar[date]) {
          calendar[date] = []
        }

        const postAny = post as any
        calendar[date].push({
          id: postAny.id,
          blogId: postAny.blog_id,
          blogName: postAny.blogs?.name || 'Unknown',
          keywordId: postAny.keyword_id,
          keyword: postAny.keywords?.keyword || null,
          keywordGrade: postAny.keywords?.keyword_grade || null,
          scheduledDate: post.scheduled_date,
          scheduledTime: post.scheduled_time,
          status: post.status,
          writingMode: post.writing_mode,
          intentType: post.intent_type,
          intentFitScore: post.intent_fit_score,
        })
      }
    }

    return NextResponse.json({
      success: true,
      year,
      month,
      calendar,
    })
  } catch (error) {
    console.error('[Calendar Query Error]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '캘린더 조회 실패',
      },
      { status: 500 }
    )
  }
}
