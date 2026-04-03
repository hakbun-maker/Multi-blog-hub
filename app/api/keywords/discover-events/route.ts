import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { EventAPI } from '@/lib/monetize/apis/event-api'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const eventAPI = new EventAPI(user.id)
    await eventAPI.initialize()
    const events = await eventAPI.fetchAllEvents()

    const grouped = {
      concert: events.filter(e => e.category === 'concert'),
      sports: events.filter(e => e.category === 'sports'),
      festival: events.filter(e => e.category === 'festival'),
      exhibition: events.filter(e => e.category === 'exhibition'),
      other: events.filter(e => e.category === 'other'),
    }

    return NextResponse.json({
      data: {
        events,
        grouped,
        total: events.length,
        sources: {
          interpark: grouped.concert.filter(e => e.source === 'interpark').length,
          yes24: grouped.concert.filter(e => e.source === 'yes24').length,
          melon: grouped.concert.filter(e => e.source === 'melon').length,
          google_trends: events.filter(e => e.source === 'google_trends').length,
          sports: grouped.sports.length,
        }
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
