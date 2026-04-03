import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data } = await supabase
    .from('keyword_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    data: data ?? {
      user_id: user.id,
      auto_discover: false,
      min_score: 60,
      preferred_intents: ['AD', 'REVIEW', 'INFO', 'COMPARE', 'TREND', 'CRITIC'],
      max_daily_keywords: 50,
      event_sources: { interpark: true, yes24: true, melon: true, google_trends: true, sports: true, festivals: true },
    }
  })
}

export async function PUT(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { auto_discover, min_score, preferred_intents, max_daily_keywords, event_sources } = body

  const updateData: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  if (typeof auto_discover === 'boolean') updateData.auto_discover = auto_discover
  if (typeof min_score === 'number') updateData.min_score = min_score
  if (Array.isArray(preferred_intents)) updateData.preferred_intents = preferred_intents
  if (typeof max_daily_keywords === 'number') updateData.max_daily_keywords = max_daily_keywords
  if (event_sources && typeof event_sources === 'object') updateData.event_sources = event_sources

  const { data, error } = await supabase
    .from('keyword_settings')
    .upsert(updateData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
