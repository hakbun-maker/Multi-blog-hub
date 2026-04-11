/**
 * 실시간 트렌드 키워드 발굴 API
 * POST: Google Trends + 네이버 뉴스 → 블로그 카테고리 매칭 → 롱테일 확장
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runTrendDiscovery } from '@/lib/agents/trend-discovery'

export const maxDuration = 120

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const startTime = Date.now()
  try {
    const result = await runTrendDiscovery(user.id)
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
