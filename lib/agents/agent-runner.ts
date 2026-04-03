/**
 * AI 에이전트 실행기 — 5개 에이전트의 공통 실행 로직
 * 각 에이전트는 독립적으로 실행되며, 실행 기록이 agent_logs에 저장됩니다.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { AgentType, AgentRunResult } from './types'

export function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * 에이전트 실행을 래핑하여 agent_logs에 기록합니다.
 */
export async function runAgent(
  userId: string,
  agentType: AgentType,
  executor: () => Promise<Record<string, unknown>>
): Promise<AgentRunResult> {
  const supabase = getServiceClient()
  const startTime = Date.now()

  // 에이전트 시작 기록
  const { data: logEntry } = await supabase
    .from('agent_logs')
    .insert({
      user_id: userId,
      agent_type: agentType,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  const logId = logEntry?.id

  try {
    const summary = await executor()
    const durationMs = Date.now() - startTime

    // 완료 기록
    if (logId) {
      await supabase
        .from('agent_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          summary,
        })
        .eq('id', logId)
    }

    return { agentType, status: 'completed', summary, durationMs }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const durationMs = Date.now() - startTime

    // 에러 기록
    if (logId) {
      await supabase
        .from('agent_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', logId)
    }

    return { agentType, status: 'error', summary: {}, errorMessage: message, durationMs }
  }
}

/**
 * 사용자별 자동수집 설정이 활성화된 유저 목록 조회
 */
export async function getAutoDiscoverUsers(): Promise<string[]> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('keyword_settings')
    .select('user_id')
    .eq('auto_discover', true)

  return (data ?? []).map(d => d.user_id)
}

/**
 * 파이프라인 단계 업데이트
 */
export async function updatePipelineStage(
  pipelineId: string,
  stage: string,
  extraData?: Record<string, unknown>
) {
  const supabase = getServiceClient()
  const timestampField = `${stage === 'writing' ? 'writing_started' : stage === 'published' ? 'published' : stage}_at`

  await supabase
    .from('keyword_pipeline')
    .update({
      stage,
      [timestampField]: new Date().toISOString(),
      ...extraData,
    })
    .eq('id', pipelineId)
}
