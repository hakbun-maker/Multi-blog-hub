/**
 * 마스터 크론 — 5개 AI 에이전트를 순차 실행합니다.
 * Vercel Cron: UTC 20:00 (KST 05:00) — 기존 keyword-discover와 동일 시간
 *
 * 실행 순서: Scout → Analyst → Planner → Writer → Publisher
 * 각 에이전트는 독립적으로 실행되며, 하나가 실패해도 나머지는 계속 진행합니다.
 */
import { NextResponse } from 'next/server'
import { getAutoDiscoverUsers } from '@/lib/agents/agent-runner'
import { runScoutAgent } from '@/lib/agents/scout-agent'
import { runAnalystAgent } from '@/lib/agents/analyst-agent'
import { runPlannerAgent } from '@/lib/agents/planner-agent'
import { runWriterAgent } from '@/lib/agents/writer-agent'
import { runPublisherAgent } from '@/lib/agents/publisher-agent'
import type { AgentRunResult } from '@/lib/agents/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 타임아웃

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const allResults: Record<string, AgentRunResult[]> = {}

  try {
    // 자동수집 활성화된 유저 목록
    const userIds = await getAutoDiscoverUsers()

    if (userIds.length === 0) {
      return NextResponse.json({
        message: 'No users with auto_discover enabled',
        duration: Date.now() - startTime,
      })
    }

    // 각 유저별로 5개 에이전트 순차 실행
    for (const userId of userIds) {
      const results: AgentRunResult[] = []

      // 1. Scout: 키워드 발굴
      results.push(await runScoutAgent(userId))

      // 2. Analyst: 점수 분석
      results.push(await runAnalystAgent(userId))

      // 3. Planner: 배정 & 스케줄링
      results.push(await runPlannerAgent(userId))

      // 4. Writer: AI 글 작성
      results.push(await runWriterAgent(userId))

      // 5. Publisher: 발행 & 후기 기획
      results.push(await runPublisherAgent(userId))

      allResults[userId] = results
    }

    return NextResponse.json({
      success: true,
      totalUsers: userIds.length,
      results: allResults,
      duration: Date.now() - startTime,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message, duration: Date.now() - startTime }, { status: 500 })
  }
}
