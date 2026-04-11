/**
 * 이벤트 키워드 발굴 API — D-Day 기반 단계별 키워드
 * POST: 공연/경기/축제 이벤트 → D-Day 키워드 자동 생성
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runEventDiscovery } from '@/lib/agents/event-discovery'

export const maxDuration = 120

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const startTime = Date.now()
  try {
    const result = await runEventDiscovery(user.id)
    return NextResponse.json({
      success: true,
      ...result,
      duration: Date.now() - startTime,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message, duration: Date.now() - startTime }, { status: 500 })
  }
}
