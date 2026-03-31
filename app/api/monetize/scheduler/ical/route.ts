import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/monetize/scheduler/ical
 * Returns an ICS (iCalendar) feed of scheduled posts for the next 30 days.
 * Can be subscribed to from Google Calendar, Apple Calendar, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Fetch scheduled posts for next 30 days
    const now = new Date()
    const startDate = now.toISOString().split('T')[0]
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + 30)
    const endDate = futureDate.toISOString().split('T')[0]

    const { data: posts, error: postsError } = await supabase
      .from('scheduled_posts')
      .select(`
        id,
        blog_id,
        blogs(name),
        keyword_id,
        keywords(keyword, keyword_grade),
        scheduled_date,
        scheduled_time,
        status,
        intent_type
      `)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .not('status', 'eq', 'rejected')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })

    if (postsError) {
      return new NextResponse('Calendar data error', { status: 500 })
    }

    // Build ICS content
    const icsLines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BlogHub//Monetize Scheduler//KO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:BlogHub 키워드 스케줄',
      'X-WR-TIMEZONE:Asia/Seoul',
    ]

    for (const post of (posts || [])) {
      const postAny = post as any
      const keyword = postAny.keywords?.keyword || '(키워드 없음)'
      const blogName = postAny.blogs?.name || '(블로그 없음)'
      const grade = postAny.keywords?.keyword_grade || ''
      const date = post.scheduled_date.replace(/-/g, '')  // 20260415
      const time = (post.scheduled_time || '09:00').replace(':', '') + '00'  // 090000

      // Event duration: 30 minutes
      const startHour = parseInt(time.slice(0, 2))
      const startMin = parseInt(time.slice(2, 4))
      const endMin = startMin + 30
      const endHour = startHour + Math.floor(endMin / 60)
      const endMinFinal = endMin % 60
      const endTime = `${String(endHour).padStart(2, '0')}${String(endMinFinal).padStart(2, '0')}00`

      const uid = `${post.id}@bloghub.app`
      const summary = `[${grade}] ${keyword} — ${blogName}`
      const description = `키워드: ${keyword}\\n블로그: ${blogName}\\n등급: ${grade}\\n인텐트: ${post.intent_type || '-'}\\n상태: ${post.status}`

      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;TZID=Asia/Seoul:${date}T${time}`,
        `DTEND;TZID=Asia/Seoul:${date}T${endTime}`,
        `SUMMARY:${escapeICS(summary)}`,
        `DESCRIPTION:${escapeICS(description)}`,
        'STATUS:CONFIRMED',
        // Alarm 30 min before
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeICS(keyword)} 발행 예정`,
        'END:VALARM',
        'END:VEVENT',
      )
    }

    icsLines.push('END:VCALENDAR')

    const icsContent = icsLines.join('\r\n')

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bloghub-schedule.ics"',
      },
    })
  } catch (error) {
    console.error('[ICS Export Error]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
