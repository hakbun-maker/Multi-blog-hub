/**
 * 시즌 키워드 발굴 API — 별도 실행 (자동 파이프라인에 포함되지 않음)
 * POST: DataLab 2년 트렌드 분석 → 시즌 키워드 발굴
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runSeasonalDiscovery } from '@/lib/agents/seasonal-discovery'

export const maxDuration = 120

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const startTime = Date.now()
  try {
    const result = await runSeasonalDiscovery(user.id)
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
