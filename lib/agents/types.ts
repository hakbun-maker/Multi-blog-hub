/** 6개 AI 에이전트 타입 */
export type AgentType = 'scout' | 'expander' | 'analyst' | 'planner' | 'writer' | 'publisher'

/** 파이프라인 단계 (순서대로) */
export type PipelineStage = 'discovered' | 'expanded' | 'scored' | 'assigned' | 'writing' | 'review' | 'scheduled' | 'published'

/** 이벤트 기반 콘텐츠 Phase */
export type EventPhase = 'pre_info' | 'comparison' | 'preparation' | 'review'

/** 에이전트 실행 결과 */
export interface AgentRunResult {
  agentType: AgentType
  status: 'completed' | 'error'
  summary: Record<string, unknown>
  errorMessage?: string
  durationMs: number
}

/** 파이프라인 현황 집계 */
export interface PipelineSummary {
  discovered: number
  scored: number
  assigned: number
  writing: number
  review: number
  scheduled: number
  published: number
}

/** 에이전트 최근 상태 */
export interface AgentStatus {
  agentType: AgentType
  status: 'running' | 'completed' | 'error' | 'idle'
  lastRun: string | null
  nextRun: string | null
  summary: Record<string, unknown>
  errorMessage?: string
}

/** 키워드 파이프라인 행 (대시보드용) */
export interface PipelineRow {
  id: string
  keywordText: string
  keywordType: string
  stage: PipelineStage
  revenueScore: number
  keywordGrade: string
  intentType: string | null
  assignedBlogName: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  eventTitle: string | null
  eventDDay: number | null
  eventPhase: EventPhase | null
  eventClusterId: string | null
  writingProgress: number
  discoveredAt: string
  updatedAt: string
}

/** 이벤트 타임라인 클러스터 */
export interface EventTimelineCluster {
  eventClusterId: string
  eventTitle: string
  eventDate: string | null
  dDay: number | null
  phases: {
    phase: EventPhase
    keywordText: string
    stage: PipelineStage
    scheduledDate: string | null
    assignedBlogName: string | null
  }[]
}
