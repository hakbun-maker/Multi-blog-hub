/**
 * 파이프라인 상태 API — 대시보드 컨트롤센터용 데이터 제공
 * GET: 파이프라인 현황 + 에이전트 상태 + 키워드 흐름 + 이벤트 타임라인
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    // 1. 파이프라인 단계별 집계
    const { data: pipeline } = await supabase
      .from('keyword_pipeline')
      .select('stage')
      .eq('user_id', user.id)

    const stageCounts: Record<string, number> = {
      discovered: 0, scored: 0, assigned: 0, writing: 0, review: 0, scheduled: 0, published: 0,
    }
    for (const row of pipeline ?? []) {
      if (row.stage in stageCounts) stageCounts[row.stage]++
    }

    // 2. 에이전트 최근 상태 (각 에이전트의 마지막 실행)
    const agentTypes = ['scout', 'analyst', 'planner', 'writer', 'publisher']
    const agentStatuses = []

    for (const agentType of agentTypes) {
      const { data: lastLog } = await supabase
        .from('agent_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_type', agentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      agentStatuses.push({
        agentType,
        status: lastLog?.status ?? 'idle',
        lastRun: lastLog?.completed_at ?? lastLog?.started_at ?? null,
        summary: lastLog?.summary ?? {},
        errorMessage: lastLog?.error_message ?? null,
      })
    }

    // 3. 키워드 파이프라인 흐름 (최근 50개)
    const { data: keywordFlow } = await supabase
      .from('keyword_pipeline')
      .select('id, keyword_text, keyword_type, stage, revenue_score, keyword_grade, intent_type, assigned_blog_name, scheduled_date, scheduled_time, event_title, event_d_day, event_phase, event_cluster_id, writing_progress, discovered_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    // 4. 이벤트 타임라인 (클러스터별 그룹)
    const { data: eventPipeline } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', user.id)
      .eq('keyword_type', 'event')
      .not('event_cluster_id', 'is', null)
      .order('event_d_day', { ascending: true })

    const eventClusters: Record<string, {
      eventClusterId: string
      eventTitle: string
      eventDate: string | null
      dDay: number | null
      phases: Array<{
        phase: string | null
        keywordText: string
        stage: string
        scheduledDate: string | null
        assignedBlogName: string | null
        writingProgress: number
      }>
    }> = {}

    for (const ep of eventPipeline ?? []) {
      const clusterId = ep.event_cluster_id
      if (!clusterId) continue

      if (!eventClusters[clusterId]) {
        // D-Day 재계산
        let dDay: number | null = null
        if (ep.event_date) {
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          const evtDate = new Date(ep.event_date)
          dDay = Math.round((evtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }

        eventClusters[clusterId] = {
          eventClusterId: clusterId,
          eventTitle: ep.event_title ?? '',
          eventDate: ep.event_date,
          dDay,
          phases: [],
        }
      }

      eventClusters[clusterId].phases.push({
        phase: ep.event_phase,
        keywordText: ep.keyword_text,
        stage: ep.stage,
        scheduledDate: ep.scheduled_date,
        assignedBlogName: ep.assigned_blog_name,
        writingProgress: ep.writing_progress ?? 0,
      })
    }

    // 5. 자동수집 설정 상태
    const { data: settings } = await supabase
      .from('keyword_settings')
      .select('auto_discover')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      data: {
        pipeline: stageCounts,
        agents: agentStatuses,
        keywordFlow: keywordFlow ?? [],
        eventTimeline: Object.values(eventClusters),
        autoDiscover: settings?.auto_discover ?? false,
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
