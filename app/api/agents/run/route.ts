/**
 * 수동 에이전트 실행 API — 컨트롤센터 "지금 시작" 버튼용
 * 인증된 사용자가 직접 파이프라인을 트리거합니다 (크론 시크릿 불필요).
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runScoutAgent } from '@/lib/agents/scout-agent'
import { runExpanderAgent } from '@/lib/agents/expander-agent'
import { runAnalystAgent } from '@/lib/agents/analyst-agent'
import { runPlannerAgent } from '@/lib/agents/planner-agent'
import { runWriterAgent } from '@/lib/agents/writer-agent'
import { runPublisherAgent } from '@/lib/agents/publisher-agent'
import type { AgentRunResult } from '@/lib/agents/types'

export const maxDuration = 300

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const startTime = Date.now()
  const results: AgentRunResult[] = []

  try {
    // 6개 에이전트 순차 실행
    results.push(await runScoutAgent(user.id))
    results.push(await runExpanderAgent(user.id))
    results.push(await runAnalystAgent(user.id))
    results.push(await runPlannerAgent(user.id))
    results.push(await runWriterAgent(user.id))
    results.push(await runPublisherAgent(user.id))

    return NextResponse.json({
      success: true,
      results,
      duration: Date.now() - startTime,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: message,
      results,
      duration: Date.now() - startTime,
    }, { status: 500 })
  }
}
