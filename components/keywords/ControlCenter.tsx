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
  Pencil, Trash2, Check, X, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { AutoDiscoveryToggle } from '@/components/keywords/AutoDiscoveryToggle'
import { ApiKeyQuickSetup } from '@/components/keywords/ApiKeyQuickSetup'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelineCounts {
  discovered: number
  expanded: number
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
  monthly_search_volume: number | null
  cpc_estimate: number | null
  competition_score: number | null
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
  expander: { label: 'Expander', icon: <Zap className="w-4 h-4" />, description: '롱테일 확장' },
  analyst: { label: 'Analyst', icon: <BarChart2 className="w-4 h-4" />, description: '점수 분석' },
  planner: { label: 'Planner', icon: <ClipboardList className="w-4 h-4" />, description: '배정 & 기획' },
}

/** 이 페이지에서 보여줄 에이전트 (키워드 파이프라인만) */
const VISIBLE_AGENTS = ['scout', 'expander', 'analyst', 'planner']

const STATUS_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  running: { color: 'text-yellow-600', dot: 'bg-yellow-500 animate-pulse', label: '실행 중' },
  completed: { color: 'text-green-600', dot: 'bg-green-500', label: '완료' },
  error: { color: 'text-red-600', dot: 'bg-red-500', label: '오류' },
  idle: { color: 'text-gray-400', dot: 'bg-gray-300', label: '대기' },
}

const STAGE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  discovered: { label: '발굴', color: 'bg-blue-100 text-blue-700', icon: <Search className="w-3 h-3" /> },
  expanded: { label: '확장', color: 'bg-cyan-100 text-cyan-700', icon: <Zap className="w-3 h-3" /> },
  scored: { label: '분석', color: 'bg-purple-100 text-purple-700', icon: <BarChart2 className="w-3 h-3" /> },
  assigned: { label: '배정', color: 'bg-yellow-100 text-yellow-700', icon: <ClipboardList className="w-3 h-3" /> },
  scheduled: { label: '스케줄 확정', color: 'bg-green-100 text-green-700', icon: <Clock className="w-3 h-3" /> },
  // writing/review/published는 스케줄러 페이지에서 관리
  writing: { label: '작성중', color: 'bg-orange-100 text-orange-700', icon: <PenSquare className="w-3 h-3" /> },
  review: { label: '검수', color: 'bg-pink-100 text-pink-700', icon: <CheckCircle className="w-3 h-3" /> },
  published: { label: '발행완료', color: 'bg-green-100 text-green-700', icon: <Rocket className="w-3 h-3" /> },
}

/** 이 페이지에서 보여줄 파이프라인 단계 (키워드 배정까지만) */
const VISIBLE_STAGES = ['discovered', 'expanded', 'scored', 'scheduled']

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
  const [blogs, setBlogs] = useState<Array<{ id: string; name: string }>>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ keyword_text: string; assigned_blog_id: string; assigned_blog_name: string; scheduled_date: string; scheduled_time: string }>({
    keyword_text: '', assigned_blog_id: '', assigned_blog_name: '', scheduled_date: '', scheduled_time: '',
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 50

  const fetchData = useCallback(async (isRefresh = false, page = 1) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/agents/pipeline?page=${page}&pageSize=${PAGE_SIZE}`)
      if (res.ok) {
        const json = await res.json()
        const d = json.data
        setPipeline(d.pipeline)
        setAgents(d.agents)
        setKeywordFlow(d.keywordFlow)
        setEventTimeline(d.eventTimeline)
        setAutoDiscover(d.autoDiscover)
        if (d.pagination) {
          setCurrentPage(d.pagination.page)
          setTotalPages(d.pagination.totalPages)
          setTotalCount(d.pagination.totalCount)
        }
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // 블로그 목록 로드 (편집용)
  useEffect(() => {
    fetch('/api/blogs').then(r => r.json()).then(json => {
      setBlogs((json.data ?? []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })))
    }).catch(() => {})
  }, [])

  // 자동 갱신: 실행 중일 때 3초, 평소 30초
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), runningPipeline ? 3000 : 30000)
    return () => clearInterval(interval)
  }, [fetchData, runningPipeline])

  // 수동 파이프라인 실행
  const handleRunNow = async () => {
    setRunningPipeline(true)
    try {
      const res = await fetch('/api/agents/run', { method: 'POST' })
      if (res.ok) {
        await fetchData(true)
      }
    } catch { /* ignore */ }
    finally {
      setRunningPipeline(false)
    }
  }

  // 정렬 토글
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // 정렬 적용
  const STAGE_ORDER: Record<string, number> = { discovered: 0, scored: 1, assigned: 2, scheduled: 3, writing: 4, review: 5, published: 6 }
  const GRADE_ORDER: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 }

  const sortedKeywordFlow = [...keywordFlow].sort((a, b) => {
    if (!sortField) return 0
    const dir = sortDir === 'asc' ? 1 : -1

    switch (sortField) {
      case 'grade':
        return ((GRADE_ORDER[a.keyword_grade] ?? 0) - (GRADE_ORDER[b.keyword_grade] ?? 0)) * dir
      case 'stage':
        return ((STAGE_ORDER[a.stage] ?? 0) - (STAGE_ORDER[b.stage] ?? 0)) * dir
      case 'blog':
        return (a.assigned_blog_name ?? '').localeCompare(b.assigned_blog_name ?? '') * dir
      case 'date':
        return ((a.scheduled_date ?? '') + (a.scheduled_time ?? '')).localeCompare((b.scheduled_date ?? '') + (b.scheduled_time ?? '')) * dir
      case 'volume':
        return ((a.monthly_search_volume ?? 0) - (b.monthly_search_volume ?? 0)) * dir
      case 'cpc':
        return ((a.cpc_estimate ?? 0) - (b.cpc_estimate ?? 0)) * dir
      case 'competition':
        return ((a.competition_score ?? 0) - (b.competition_score ?? 0)) * dir
      case 'score':
        return ((a.revenue_score ?? 0) - (b.revenue_score ?? 0)) * dir
      default:
        return 0
    }
  })

  // 편집 시작
  const startEditing = (kw: KeywordFlowRow) => {
    setEditingId(kw.id)
    setEditData({
      keyword_text: kw.keyword_text,
      assigned_blog_id: kw.assigned_blog_name ? blogs.find(b => b.name === kw.assigned_blog_name)?.id ?? '' : '',
      assigned_blog_name: kw.assigned_blog_name ?? '',
      scheduled_date: kw.scheduled_date ?? '',
      scheduled_time: kw.scheduled_time ?? '',
    })
  }

  // 편집 저장
  const saveEdit = async () => {
    if (!editingId) return
    const blogName = blogs.find(b => b.id === editData.assigned_blog_id)?.name ?? editData.assigned_blog_name
    await fetch(`/api/agents/pipeline/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword_text: editData.keyword_text,
        assigned_blog_id: editData.assigned_blog_id || null,
        assigned_blog_name: blogName,
        scheduled_date: editData.scheduled_date || null,
        scheduled_time: editData.scheduled_time || null,
      }),
    })
    setEditingId(null)
    fetchData(true)
  }

  // 단일 삭제
  const deleteItem = async (id: string) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return
    await fetch(`/api/agents/pipeline/${id}`, { method: 'DELETE' })
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    fetchData(true)
  }

  // 체크박스 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === keywordFlow.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(keywordFlow.map(k => k.id)))
    }
  }

  // 선택 항목 일괄 삭제
  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size}개 키워드를 삭제하시겠습니까?`)) return
    setDeleting(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/agents/pipeline/${id}`, { method: 'DELETE' })
        )
      )
      setSelectedIds(new Set())
      fetchData(true)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const totalKeywords = totalCount > 0 ? totalCount : (pipeline
    ? Object.values(pipeline).reduce((a, b) => a + b, 0)
    : 0)

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
          <Button
            variant="outline"
            size="sm"
            disabled={runningPipeline}
            onClick={async () => {
              if (!confirm('시즌 키워드 발굴을 시작합니다.\nDataLab 2년 트렌드를 분석하여 현재/다음달 시즌 키워드를 찾습니다.\n\n진행하시겠습니까?')) return
              setRunningPipeline(true)
              try {
                const res = await fetch('/api/agents/seasonal', { method: 'POST' })
                const json = await res.json()
                const msg = [
                  `시즌 키워드 완료`,
                  `1차 발굴: ${json.discovered ?? 0}개`,
                  `2차 롱테일: ${json.expanded ?? 0}개`,
                  `파이프라인 추가: ${json.added ?? 0}개`,
                  `기존 삭제: ${json.removed ?? 0}개, 유지: ${json.kept ?? 0}개`,
                ]
                if (json._errors?.length > 0) msg.push(`\n에러: ${json._errors.join(', ')}`)
                alert(msg.join('\n'))
                await fetchData(true, 1)
              } catch { /* ignore */ }
              finally { setRunningPipeline(false) }
            }}
            className="gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">시즌 키워드</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={runningPipeline}
            onClick={async () => {
              if (!confirm('실시간 트렌드 키워드를 발굴합니다.\nGoogle Trends + 네이버 뉴스에서 블로그에 적합한 키워드를 찾습니다.\n\n진행하시겠습니까?')) return
              setRunningPipeline(true)
              try {
                const res = await fetch('/api/agents/trends', { method: 'POST' })
                const json = await res.json()
                alert([
                  '트렌드 키워드 완료',
                  `1차 발굴: ${json.trendFound ?? 0}개`,
                  `2차 롱테일: ${json.expanded ?? 0}개`,
                  `파이프라인 추가: ${json.added ?? 0}개`,
                  ...(json._errors?.length > 0 ? [`\n에러: ${json._errors.join(', ')}`] : []),
                ].join('\n'))
                await fetchData(true, 1)
              } catch { /* ignore */ }
              finally { setRunningPipeline(false) }
            }}
            className="gap-1.5"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">트렌드</span>
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
              {VISIBLE_STAGES.map((stage, idx) => {
                const config = STAGE_CONFIG[stage]
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
                    {idx < VISIBLE_STAGES.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Status — 한 줄 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {VISIBLE_AGENTS.map(agentType => {
          const agent = agents.find(a => a.agentType === agentType)
          const config = AGENT_CONFIG[agentType]
          // 실제 agent_logs 상태를 반영 (3초마다 갱신됨)
          const actualStatus = agent?.status ?? 'idle'
          const isAgentRunning = actualStatus === 'running'
          const statusCfg = STATUS_CONFIG[actualStatus] ?? STATUS_CONFIG.idle

          return (
            <div key={agentType} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
              isAgentRunning ? 'border-yellow-400 bg-yellow-50 shadow-sm' :
              actualStatus === 'completed' ? 'border-green-200 bg-green-50/30' :
              actualStatus === 'error' ? 'border-red-200 bg-red-50/30' :
              'border-gray-200'
            }`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-gray-800">{config?.label}</span>
                  {isAgentRunning ? (
                    <span className="text-[10px] text-yellow-600 font-medium flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      진행 중
                    </span>
                  ) : (
                    <span className={`text-[10px] ${statusCfg.color}`}>{statusCfg.label}</span>
                  )}
                </div>
                {!isAgentRunning && agent?.summary && Object.keys(agent.summary).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(agent.summary)
                      .filter(([key, val]) => !key.startsWith('_') && (typeof val === 'number' || typeof val === 'string'))
                      .slice(0, 3).map(([key, val]) => (
                      <span key={key} className="text-[9px] text-gray-500">
                        {key}:{String(val)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Keyword Flow Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">키워드 파이프라인 흐름</CardTitle>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={bulkDelete}
                  disabled={deleting}
                  className="gap-1.5 h-7 text-xs"
                >
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  선택 삭제 ({selectedIds.size})
                </Button>
              )}
              <select
                disabled={deleting}
                defaultValue=""
                onChange={async (e) => {
                  const stage = e.target.value
                  if (!stage) return
                  e.target.value = '' // 리셋
                  const stageLabels: Record<string, string> = { discovered: '발굴', expanded: '확장', scored: '분석', scheduled: '스케줄 확정', all: '전체' }
                  if (!confirm(`"${stageLabels[stage] ?? stage}" 단계의 모든 키워드를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return
                  setDeleting(true)
                  try {
                    await fetch(`/api/agents/pipeline?stage=${stage}`, { method: 'DELETE' })
                    setSelectedIds(new Set())
                    fetchData(true, 1)
                  } finally { setDeleting(false) }
                }}
                className="h-7 text-xs rounded-md border border-gray-200 bg-white px-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">단계별 삭제</option>
                <option value="discovered">발굴 삭제</option>
                <option value="expanded">확장 삭제</option>
                <option value="scored">분석 삭제</option>
                <option value="scheduled">스케줄 삭제</option>
                <option value="all">전체 삭제</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {keywordFlow.length === 0 ? (
            <div className="text-center py-10">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">아직 파이프라인에 키워드가 없습니다</p>
              <p className="text-xs text-gray-300 mt-1">자동 수집을 켜면 AI가 키워드를 발굴합니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th className="text-left py-2 px-2 font-medium">키워드</th>
                    {[
                      { field: 'grade', label: '등급', center: true, hide: '' },
                      { field: 'stage', label: '단계', center: true, hide: '' },
                      { field: 'volume', label: '검색량', center: true, hide: '' },
                      { field: 'cpc', label: 'CPC', center: true, hide: '' },
                      { field: 'competition', label: '경쟁도', center: true, hide: '' },
                      { field: 'blog', label: '블로그', center: false, hide: '' },
                      { field: 'date', label: '발행예정', center: false, hide: '' },
                      { field: 'score', label: '점수', center: true, hide: '' },
                    ].map(col => (
                      <th key={col.field} className={`py-2 px-1 font-medium ${col.center ? 'text-center' : 'text-left'} ${col.hide}`}>
                        <button
                          onClick={() => toggleSort(col.field)}
                          className="inline-flex items-center gap-0.5 hover:text-orange-600 transition-colors"
                        >
                          {col.label}
                          {sortField === col.field ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="text-center py-2 px-1 font-medium w-10"></th>
                    <th className="text-center py-2 px-1 w-8">
                      <input
                        type="checkbox"
                        checked={keywordFlow.length > 0 && selectedIds.size === keywordFlow.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeywordFlow.map(kw => {
                    const stageConfig = STAGE_CONFIG[kw.stage] ?? STAGE_CONFIG.discovered
                    const isEditing = editingId === kw.id

                    if (isEditing) {
                      return (
                        <tr key={kw.id} className="border-b border-orange-200 bg-orange-50/50">
                          <td className="py-2 px-2">
                            <input
                              value={editData.keyword_text}
                              onChange={e => setEditData(prev => ({ ...prev, keyword_text: e.target.value }))}
                              className="w-full text-sm px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                          <td className="text-center py-2 px-1">
                            <span className="text-xs text-gray-400">{kw.keyword_grade}</span>
                          </td>
                          <td className="text-center py-2 px-1">
                            <span className="text-[10px] text-gray-400">{stageConfig.label}</span>
                          </td>
                          <td className="text-center py-2 px-1 ">
                            <span className="text-xs text-gray-400">{kw.monthly_search_volume?.toLocaleString() ?? '-'}</span>
                          </td>
                          <td className="text-center py-2 px-1 ">
                            <span className="text-xs text-gray-400">{kw.cpc_estimate ? `₩${kw.cpc_estimate.toLocaleString()}` : '-'}</span>
                          </td>
                          <td className="text-center py-2 px-1 ">
                            <span className="text-xs text-gray-400">{kw.competition_score ?? '-'}</span>
                          </td>
                          <td className="py-2 px-2 ">
                            <select
                              value={editData.assigned_blog_id}
                              onChange={e => setEditData(prev => ({ ...prev, assigned_blog_id: e.target.value }))}
                              className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                            >
                              <option value="">선택</option>
                              {blogs.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2 ">
                            <div className="flex gap-1">
                              <input
                                type="date"
                                value={editData.scheduled_date}
                                onChange={e => setEditData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                                className="text-xs px-1 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                              <input
                                type="time"
                                value={editData.scheduled_time}
                                onChange={e => setEditData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                                className="text-xs px-1 py-1 border rounded w-20 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                          </td>
                          <td className="text-center py-2 px-1">
                            <span className="text-xs text-gray-400">{kw.revenue_score > 0 ? Math.round(kw.revenue_score) : '-'}</span>
                          </td>
                          <td className="text-center py-2 px-1">
                            <div className="flex gap-0.5 justify-center">
                              <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="text-center py-2 px-1">
                            <input type="checkbox" checked={selectedIds.has(kw.id)} onChange={() => toggleSelect(kw.id)}
                              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={kw.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
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
                        <td className="text-center py-2 px-1 ">
                          <span className="text-xs text-gray-600">
                            {kw.monthly_search_volume != null && kw.monthly_search_volume > 0
                              ? kw.monthly_search_volume.toLocaleString()
                              : '-'}
                          </span>
                        </td>
                        <td className="text-center py-2 px-1 ">
                          <span className="text-xs text-gray-600">
                            {kw.cpc_estimate != null && kw.cpc_estimate > 0
                              ? `₩${kw.cpc_estimate.toLocaleString()}`
                              : '-'}
                          </span>
                        </td>
                        <td className="text-center py-2 px-1 ">
                          <span className={`text-xs font-medium ${
                            kw.competition_score != null && kw.competition_score >= 70 ? 'text-red-500' :
                            kw.competition_score != null && kw.competition_score >= 40 ? 'text-yellow-600' :
                            kw.competition_score != null ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {kw.competition_score != null ? kw.competition_score : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-2 ">
                          <span className="text-xs text-gray-600">{kw.assigned_blog_name ?? '-'}</span>
                        </td>
                        <td className="py-2 px-2 ">
                          {kw.scheduled_date ? (
                            <span className="text-xs text-gray-600">
                              {kw.scheduled_date} {kw.scheduled_time ?? ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        <td className="text-center py-2 px-1">
                          <span className="text-xs font-medium text-gray-700">
                            {kw.revenue_score > 0 ? Math.round(kw.revenue_score) : '-'}
                          </span>
                        </td>
                        <td className="text-center py-2 px-1">
                          <div className="flex gap-0.5 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditing(kw)} className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="수정">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteItem(kw.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="삭제">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="text-center py-2 px-1">
                          <input type="checkbox" checked={selectedIds.has(kw.id)} onChange={() => toggleSelect(kw.id)}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-2">
              <span className="text-xs text-gray-500">
                총 {totalCount.toLocaleString()}개 중 {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => { setCurrentPage(currentPage - 1); fetchData(true, currentPage - 1) }}
                  className="h-7 text-xs px-2"
                >
                  이전
                </Button>
                <span className="text-xs text-gray-600 px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => { setCurrentPage(currentPage + 1); fetchData(true, currentPage + 1) }}
                  className="h-7 text-xs px-2"
                >
                  다음
                </Button>
              </div>
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
