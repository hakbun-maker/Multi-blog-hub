import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RegisterKeywordBody {
  keywordId: string
  blogId: string
  scheduledDate: string // YYYY-MM-DD
  scheduledTime: string // HH:mm
  assignmentReason?: string
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: RegisterKeywordBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '요청 본문이 유효한 JSON이 아닙니다.' },
        { status: 400 }
      )
    }

    // Validate required fields
    const { keywordId, blogId, scheduledDate, scheduledTime, assignmentReason } = body

    if (!keywordId || !blogId || !scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { error: 'keywordId, blogId, scheduledDate, scheduledTime은 필수입니다.' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const timeRegex = /^\d{2}:\d{2}$/

    if (!dateRegex.test(scheduledDate)) {
      return NextResponse.json(
        { error: 'scheduledDate 형식이 올바르지 않습니다. (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (!timeRegex.test(scheduledTime)) {
      return NextResponse.json(
        { error: 'scheduledTime 형식이 올바르지 않습니다. (HH:mm)' },
        { status: 400 }
      )
    }

    // Validate that the date is in the future
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
    const now = new Date()

    if (scheduledDateTime < now) {
      return NextResponse.json(
        { error: '예약 날짜/시간이 현재 시간보다 이전입니다.' },
        { status: 400 }
      )
    }

    // Verify keyword exists and belongs to user
    const { data: keyword, error: keywordError } = await supabase
      .from('keywords')
      .select('id, user_id, keyword, revenue_score, keyword_grade, intent_type')
      .eq('id', keywordId)
      .single()

    if (keywordError || !keyword) {
      return NextResponse.json(
        { error: '키워드를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (keyword.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 키워드에 접근할 수 없습니다.' },
        { status: 403 }
      )
    }

    // Verify blog exists and belongs to user
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, user_id, name, grade')
      .eq('id', blogId)
      .single()

    if (blogError || !blog) {
      return NextResponse.json(
        { error: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (blog.user_id !== user.id) {
      return NextResponse.json(
        { error: '이 블로그에 접근할 수 없습니다.' },
        { status: 403 }
      )
    }

    // Check for duplicate assignment
    const { data: existingAssignment } = await supabase
      .from('blog_keyword_assignments')
      .select('id')
      .eq('keyword_id', keywordId)
      .eq('blog_id', blogId)
      .eq('assigned_date', scheduledDate)
      .single()

    if (existingAssignment) {
      return NextResponse.json(
        { error: '이미 같은 날짜에 할당된 키워드입니다.' },
        { status: 409 }
      )
    }

    // Calculate intent fit score
    const { INTENT_BLOG_FIT } = await import('@/lib/monetize/constants').then(m => ({
      INTENT_BLOG_FIT: m.INTENT_BLOG_FIT,
    }))

    let intentFitScore = 0
    const intentType = keyword.intent_type as keyof typeof INTENT_BLOG_FIT | null
    const blogGrade = blog.grade as keyof (typeof INTENT_BLOG_FIT)[keyof typeof INTENT_BLOG_FIT]
    if (intentType && INTENT_BLOG_FIT[intentType]) {
      intentFitScore = INTENT_BLOG_FIT[intentType][blogGrade] || 0
    }

    // Create blog keyword assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('blog_keyword_assignments')
      .insert({
        blog_id: blogId,
        keyword_id: keywordId,
        assigned_date: scheduledDate,
        assigned_time: scheduledTime,
        assignment_reason: assignmentReason || null,
        is_confirmed: false,
        intent_type: keyword.intent_type,
        intent_fit_score: intentFitScore,
      })
      .select()
      .single()

    if (assignmentError) {
      console.error('[Register Keyword] DB insert failed:', assignmentError)
      return NextResponse.json(
        { error: '키워드 할당에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Log the assignment action
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'keyword_assigned_to_blog',
          resource_type: 'keyword',
          resource_id: keywordId,
          changes: {
            blog_id: blogId,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            keyword_grade: keyword.keyword_grade,
            revenue_score: keyword.revenue_score,
          },
          metadata: {
            blog_name: blog.name,
            keyword_text: keyword.keyword,
          },
        })
    } catch (error) {
      console.error('[Register Keyword] Failed to log audit:', error)
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        keywordId: assignment.keyword_id,
        keyword: keyword.keyword,
        keywordGrade: keyword.keyword_grade,
        revenueScore: keyword.revenue_score,
        blogId: assignment.blog_id,
        blogName: blog.name,
        blogGrade: blog.grade,
        scheduledDate: assignment.assigned_date,
        scheduledTime: assignment.assigned_time,
        intentType: assignment.intent_type,
        intentFitScore: assignment.intent_fit_score,
        isConfirmed: assignment.is_confirmed,
      },
    })
  } catch (error) {
    console.error('[Register Keyword API] Unexpected error:', error)
    return NextResponse.json(
      { error: '키워드 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const blogId = searchParams.get('blogId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')

    const page = Math.max(0, parseInt(pageParam || '0', 10))
    const limit = Math.max(1, Math.min(100, parseInt(limitParam || '20', 10)))

    // Build query
    let query = supabase
      .from('blog_keyword_assignments')
      .select(
        `
        id,
        keyword_id,
        blog_id,
        assigned_date,
        assigned_time,
        intent_type,
        intent_fit_score,
        is_confirmed,
        keywords (
          keyword,
          keyword_grade,
          revenue_score,
          monthly_search_volume,
          cpc_estimate
        ),
        blogs (
          name,
          grade
        )
        `,
        { count: 'exact' }
      )

    // Filter by user's blogs and keywords
    if (blogId) {
      query = query.eq('blog_id', blogId)
    }

    if (fromDate) {
      query = query.gte('assigned_date', fromDate)
    }

    if (toDate) {
      query = query.lte('assigned_date', toDate)
    }

    // Get assignments
    const { data: assignments, error: fetchError, count } = await query
      .order('assigned_date', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (fetchError) {
      console.error('[Get Assignments] DB query failed:', fetchError)
      return NextResponse.json(
        { error: '할당 목록 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Filter to only user's blogs
    const { data: userBlogs } = await supabase
      .from('blogs')
      .select('id')
      .eq('user_id', user.id)

    const userBlogIds = new Set(userBlogs?.map(b => b.id) || [])

    const filteredAssignments = (assignments || [])
      .filter((a: any) => userBlogIds.has(a.blog_id))
      .map((a: any) => ({
        id: a.id,
        keywordId: a.keyword_id,
        keyword: a.keywords?.keyword || '',
        keywordGrade: a.keywords?.keyword_grade || '',
        revenueScore: a.keywords?.revenue_score || 0,
        monthlySearchVolume: a.keywords?.monthly_search_volume || 0,
        cpcEstimate: a.keywords?.cpc_estimate || 0,
        blogId: a.blog_id,
        blogName: a.blogs?.name || '',
        blogGrade: a.blogs?.grade || '',
        scheduledDate: a.assigned_date,
        scheduledTime: a.assigned_time,
        intentType: a.intent_type,
        intentFitScore: a.intent_fit_score,
        isConfirmed: a.is_confirmed,
      }))

    return NextResponse.json({
      success: true,
      assignments: filteredAssignments,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('[Get Assignments API] Unexpected error:', error)
    return NextResponse.json(
      { error: '할당 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
