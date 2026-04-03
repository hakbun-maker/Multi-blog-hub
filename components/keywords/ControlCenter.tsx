'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Search, BarChart2, ClipboardList, PenSquare, Rocket,
  Loader2, RefreshCw, Settings2, ChevronRight, Clock,
  CheckCircle, AlertCircle, Circle, Zap, ZapOff,
  Calendar, Music, Trophy, PartyPopper, Palette,
} from 'lucide-react'
import { AutoDiscoveryToggle } from '@/components/keywords/AutoDiscoveryToggle'
import { ApiKeyQuickSetup } from '@/components/keywords/ApiKeyQuickSetup'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelineCounts {
  discovered: number
  scored: number
  assigned: number
  writing: number
  review: number
  scheduled: number
  published: number
}

interface AgentStatus {
  agentType: string
  status: 'running' | 'completed' | 'error' | 'idle'
  lastRun: string | null
  summary: Record<string, number>
  errorMessage: string | null
}

interface KeywordFlowRow {
  id: string
  keyword_text: string
  keyword_type: string
  stage: string
  revenue_score: number
  keyword_grade: string
  intent_type: string | null
  assigned_blog_name: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  event_title: string | null
  event_d_day: number | null
  event_phase: string | null
  event_cluster_id: string | null
  writing_progress: number
  discovered_at: string
  updated_at: string
}

interface EventCluster {
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
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  scout: { label: 'Scout', icon: <Search className="w-4 h-4" />, description: '키워드 발굴' },
  analyst: { label: 'Analyst', icon: <BarChart2 className="w-4 h-4" />, description: '점수 분석' },
  planner: { label: 'Planner', icon: <ClipboardList className="w-4 h-4" />, description: '배정 & 기획' },
  writer: { label: 'Writer', icon: <PenSquare className="w-4 h-4" />, description: 'AI 글쓰기' },
  publisher: { label: 'Publisher', icon: <Rocket className="w-4 h-4" />, description: '발행 & 후기' },
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  running: { color: 'text-yellow-600', dot: 'bg-yellow-500 animate-pulse', label: '실행 중' },
  completed: { color: 'text-green-600', dot: 'bg-green-500', label: '완료' },
  error: { color: 'text-red-600', dot: 'bg-red-500', label: '오류' },
  idle: { color: 'text-gray-400', dot: 'bg-gray-300', label: '대기' },
}

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  discovered: { label: '발굴', color: 'bg-blue-100 text-blue-700', icon: <Search className="w-3 h-3" /> },
  scored: { label: '분석', color: 'bg-purple-100 text-purple-700', icon: <BarChart2 className="w-3 h-3" /> },
  assigned: { label: '배정', color: 'bg-yellow-100 text-yellow-700', icon: <ClipboardList className="w-3 h-3" /> },
  writing: { label: '작성중', color: 'bg-orange-100 text-orange-700', icon: <PenSquare className="w-3 h-3" /> },
  review: { label: '검수', color: 'bg-pink-100 text-pink-700', icon: <CheckCircle className="w-3 h-3" /> },
  scheduled: { label: '예정', color: 'bg-indigo-100 text-indigo-700', icon: <Clock className="w-3 h-3" /> },
  published: { label: '발행완료', color: 'bg-green-100 text-green-700', icon: <Rocket className="w-3 h-3" /> },
}

const PHASE_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  pre_info: { icon: <Search className="w-3 h-3" />, label: '정보글' },
  comparison: { icon: <BarChart2 className="w-3 h-3" />, label: '비교글' },
  preparation: { icon: <ClipboardList className="w-3 h-3" />, label: '준비글' },
  review: { icon: <PenSquare className="w-3 h-3" />, label: '후기글' },
}

const EVENT_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  concert: <Music className="w-4 h-4 text-purple-500" />,
  sports: <Trophy className="w-4 h-4 text-green-500" />,
  festival: <PartyPopper className="w-4 h-4 text-pink-500" />,
  exhibition: <Palette className="w-4 h-4 text-blue-500" />,
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ControlCenter() {
  const [pipeline, setPipeline] = useState<PipelineCounts | null>(null)
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [keywordFlow, setKeywordFlow] = useState<KeywordFlowRow[]>([])
  const [eventTimeline, setEventTimeline] = useState<EventCluster[]>([])
  const [autoDiscover, setAutoDiscover] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [runningPipeline, setRunningPipeline] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/agents/pipeline')
      if (res.ok) {
        const json = await res.json()
        const d = json.data
        setPipeline(d.pipeline)
        setAgents(d.agents)
        setKeywordFlow(d.keywordFlow)
        setEventTimeline(d.eventTimeline)
        setAutoDiscover(d.autoDiscover)
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // 30초마다 자동 갱신
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // 수동 파이프라인 실행
  const handleRunNow = async () => {
    setRunningPipeline(true)
    try {
      const res = await fetch('/api/agents/run', { method: 'POST' })
      if (res.ok) {
        // 완료 후 데이터 새로고침
        await fetchData(true)
      }
    } catch { /* ignore */ }
    finally {
      setRunningPipeline(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const totalKeywords = pipeline
    ? Object.values(pipeline).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">키워드 자동화 컨트롤센터</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI 에이전트가 키워드 발굴부터 글 발행까지 자동으로 처리합니다
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AutoDiscoveryToggle enabled={autoDiscover} onToggle={setAutoDiscover} />
          <Button
            size="sm"
            onClick={handleRunNow}
            disabled={runningPipeline}
            className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {runningPipeline ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 실행 중...</>
            ) : (
              <><Rocket className="w-4 h-4" /> 지금 시작</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowApiKeyDialog(true)} className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">API 키</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fetchData(true)} disabled={refreshing} className="gap-1">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Pipeline Funnel */}
      {pipeline && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              파이프라인 현황
              <span className="text-xs text-gray-400 font-normal">총 {totalKeywords}개 키워드</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {Object.entries(STAGE_CONFIG).map(([stage, config], idx) => {
                const count = pipeline[stage as keyof PipelineCounts] ?? 0
                const maxCount = Math.max(...Object.values(pipeline), 1)
                const width = Math.max(count / maxCount * 100, 15)

                return (
                  <div key={stage} className="flex items-center gap-1 min-w-0">
                    <div className="flex flex-col items-center min-w-[60px] flex-1">
                      <div
                        className={`w-full rounded-lg ${config.color} flex flex-col items-center justify-center py-2 px-1 transition-all`}
                        style={{ minHeight: `${Math.max(width * 0.6, 40)}px` }}
                      >
                        <span className="text-lg font-bold">{count}</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {config.icon}
                          <span className="text-[10px] font-medium whitespace-nowrap">{config.label}</span>
                        </div>
                      </div>
                    </div>
                    {idx < Object.keys(STAGE_CONFIG).length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {agents.map(agent => {
          const config = AGENT_CONFIG[agent.agentType]
          const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle

          return (
            <Card key={agent.agentType} className={`${agent.status === 'running' ? 'border-yellow-300 bg-yellow-50/30' : ''}`}>
              <CardContent className="pt-4 pb-3 px-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className="text-xs font-semibold text-gray-800">{config?.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-1.5">{config?.description}</p>
                <div className="flex items-center gap-1">
                  {config?.icon}
                  <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                </div>
                {agent.lastRun && (
                  <p className="text-[9px] text-gray-400 mt-1.5">
                    마지막: {formatRelativeTime(agent.lastRun)}
                  </p>
                )}
                {agent.summary && Object.keys(agent.summary).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(agent.summary).slice(0, 3).map(([key, val]) => (
                      <span key={key} className="text-[9px] bg-gray-100 px-1 py-0.5 rounded text-gray-600">
                        {key}: {val}
                      </span>
                    ))}
                  </div>
                )}
                {agent.errorMessage && (
                  <p className="text-[9px] text-red-500 mt-1 truncate">{agent.errorMessage}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Keyword Flow Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">키워드 파이프라인 흐름</CardTitle>
        </CardHeader>
        <CardContent>
          {keywordFlow.length === 0 ? (
            <div className="text-center py-10">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">아직 파이프라인에 키워드가 없습니다</p>
              <p className="text-xs text-gray-300 mt-1">자동 수집을 켜면 AI가 키워드를 발굴합니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 px-2 font-medium">키워드</th>
                    <th className="text-center py-2 px-1 font-medium">등급</th>
                    <th className="text-center py-2 px-1 font-medium">단계</th>
                    <th className="text-left py-2 px-2 font-medium hidden sm:table-cell">블로그</th>
                    <th className="text-left py-2 px-2 font-medium hidden md:table-cell">발행예정</th>
                    <th className="text-center py-2 px-1 font-medium">진행</th>
                  </tr>
                </thead>
                <tbody>
                  {keywordFlow.map(kw => {
                    const stageConfig = STAGE_CONFIG[kw.stage] ?? STAGE_CONFIG.discovered

                    return (
                      <tr key={kw.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            {kw.event_title && (
                              <Calendar className="w-3 h-3 text-orange-400 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                              {kw.keyword_text}
                            </span>
                          </div>
                          {kw.intent_type && (
                            <span className="text-[9px] text-gray-400">{kw.intent_type}</span>
                          )}
                        </td>
                        <td className="text-center py-2 px-1">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            kw.keyword_grade === 'S' ? 'bg-amber-100 text-amber-700' :
                            kw.keyword_grade === 'A' ? 'bg-blue-100 text-blue-700' :
                            kw.keyword_grade === 'B' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {kw.keyword_grade}
                          </span>
                        </td>
                        <td className="text-center py-2 px-1">
                          <Badge variant="outline" className={`text-[10px] ${stageConfig.color} border-0`}>
                            {stageConfig.icon}
                            <span className="ml-0.5">{stageConfig.label}</span>
                          </Badge>
                        </td>
                        <td className="py-2 px-2 hidden sm:table-cell">
                          <span className="text-xs text-gray-600">{kw.assigned_blog_name ?? '-'}</span>
                        </td>
                        <td className="py-2 px-2 hidden md:table-cell">
                          {kw.scheduled_date ? (
                            <span className="text-xs text-gray-600">
                              {kw.scheduled_date} {kw.scheduled_time ?? ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        <td className="text-center py-2 px-1">
                          {kw.stage === 'writing' ? (
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500 rounded-full transition-all"
                                  style={{ width: `${kw.writing_progress}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-gray-500">{kw.writing_progress}%</span>
                            </div>
                          ) : kw.stage === 'published' ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-200 mx-auto" />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Timeline */}
      {eventTimeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              이벤트 타임라인
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {eventTimeline.map(cluster => (
              <div key={cluster.eventClusterId} className="border rounded-lg p-3">
                {/* Event header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {EVENT_CATEGORY_ICONS[inferCategory(cluster.eventTitle)] ?? <Calendar className="w-4 h-4 text-gray-400" />}
                    <h4 className="text-sm font-semibold text-gray-900">{cluster.eventTitle}</h4>
                  </div>
                  {cluster.dDay !== null && (
                    <Badge variant="outline" className={`text-xs ${
                      cluster.dDay <= 3 ? 'border-red-300 text-red-600' :
                      cluster.dDay <= 7 ? 'border-orange-300 text-orange-600' :
                      'border-blue-300 text-blue-600'
                    }`}>
                      {cluster.dDay > 0 ? `D-${cluster.dDay}` : cluster.dDay === 0 ? 'D-Day' : `D+${Math.abs(cluster.dDay)}`}
                    </Badge>
                  )}
                </div>

                {/* Phase timeline */}
                <div className="relative ml-4 space-y-2">
                  {/* Vertical line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />

                  {cluster.phases.map((phase, idx) => {
                    const phaseInfo = PHASE_ICONS[phase.phase ?? ''] ?? { icon: <Circle className="w-3 h-3" />, label: phase.phase ?? '' }
                    const stageConf = STAGE_CONFIG[phase.stage] ?? STAGE_CONFIG.discovered
                    const isCompleted = phase.stage === 'published'
                    const isWriting = phase.stage === 'writing'

                    return (
                      <div key={idx} className="flex items-start gap-3 relative">
                        {/* Timeline dot */}
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                          isCompleted ? 'bg-green-500' :
                          isWriting ? 'bg-orange-500 animate-pulse' :
                          'bg-white border-2 border-gray-300'
                        }`}>
                          {isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                          {isWriting && <PenSquare className="w-2.5 h-2.5 text-white" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">{phaseInfo.label}</span>
                            <Badge variant="outline" className={`text-[9px] ${stageConf.color} border-0`}>
                              {stageConf.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{phase.keywordText}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                            {phase.scheduledDate && <span>{phase.scheduledDate}</span>}
                            {phase.assignedBlogName && <span>→ {phase.assignedBlogName}</span>}
                            {isWriting && phase.writingProgress > 0 && (
                              <span className="text-orange-600 font-medium">{phase.writingProgress}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ApiKeyQuickSetup open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog} />
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function inferCategory(title: string): string {
  if (/콘서트|공연|뮤지컬|팬미팅|가수|아이돌/.test(title)) return 'concert'
  if (/야구|축구|농구|KBO|K리그|경기/.test(title)) return 'sports'
  if (/축제|페스티벌/.test(title)) return 'festival'
  if (/전시|박람회|미술/.test(title)) return 'exhibition'
  return 'other'
}
