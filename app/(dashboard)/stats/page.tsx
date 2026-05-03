'use client'

/**
 * /stats — 재설계된 통계 페이지 (Phase B 골격)
 *
 * 5 섹션 구조:
 *   1) TOP 브리핑 (delta + alerts + 추천 액션)
 *   2) 숨은 보석 (노출↑ CTR↓ 글 + AI 제안 제목)
 *   3) 진단 (Phase C에서 컴포넌트 추가 예정)
 *   4) 최적화 (Phase C)
 *   5) 시뮬레이션 + 예측 (기본 접힘, Phase D)
 *
 * 데이터 소스: /api/stats/{overview,hidden-gems,...}
 * 캐시: 1시간 TTL — 우상단 [↻ 갱신] 버튼으로 무효화
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopBriefing } from '@/components/stats/TopBriefing'
import { HiddenGems } from '@/components/stats/HiddenGems'
import { GoalSettingCard } from '@/components/stats/GoalSettingCard'

interface OverviewData {
  delta: { revenue: number; views: number; ctr: number }
  totals: { revenue: number; views: number; impressions: number; clicks: number; ctr: number }
  alerts: { hiddenGems: number; decaying: number }
  recommendedActions: {
    id: string
    type: 'change_title' | 'add_to_rewrite_queue' | 'toggle_slot' | 'apply_slot_position'
    title: string
    description: string
    payload?: Record<string, unknown>
  }[]
  errors?: { source: string; message: string }[]
}

interface Gem {
  postId: string
  title: string
  slug: string
  blogId: string
  blogSlug: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  suggestedTitles: string[]
}

interface HiddenGemsData {
  gems: Gem[]
  errors: { source: string; message: string }[]
}

interface ForecastData {
  predictedNext30: number
  last30: number
  vsLastYear: number | null
  goalProgress: number | null
  monthlyGoal: number | null
  achievability: number | null
}

export default function StatsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [hiddenGems, setHiddenGems] = useState<HiddenGemsData | null>(null)
  const [gemsLoading, setGemsLoading] = useState(true)
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [simOpen, setSimOpen] = useState(false)

  const hiddenGemsRef = useRef<HTMLDivElement>(null)
  const diagnosisRef = useRef<HTMLDivElement>(null)
  const optimizationRef = useRef<HTMLDivElement>(null)

  const fetchOverview = useCallback(async (refresh: boolean = false) => {
    setOverviewLoading(true)
    try {
      const res = await fetch(`/api/stats/overview${refresh ? '?refresh=1' : ''}`)
      const json = await res.json()
      setOverview(json)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const fetchHiddenGems = useCallback(async (refresh: boolean = false) => {
    setGemsLoading(true)
    try {
      const res = await fetch(`/api/stats/hidden-gems${refresh ? '?refresh=1' : ''}`)
      const json = await res.json()
      setHiddenGems(json)
    } finally {
      setGemsLoading(false)
    }
  }, [])

  const fetchForecast = useCallback(async (refresh: boolean = false) => {
    try {
      const res = await fetch(`/api/stats/forecast${refresh ? '?refresh=1' : ''}`)
      const json = await res.json()
      setForecast(json)
    } catch { /* 무시 */ }
  }, [])

  useEffect(() => {
    fetchOverview()
    fetchHiddenGems()
    fetchForecast()
  }, [fetchOverview, fetchHiddenGems, fetchForecast])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchOverview(true), fetchHiddenGems(true), fetchForecast(true)])
    setRefreshing(false)
  }

  const handleScrollTo = (sectionId: 'hidden-gems' | 'diagnosis' | 'optimization') => {
    const refMap = {
      'hidden-gems': hiddenGemsRef,
      'diagnosis': diagnosisRef,
      'optimization': optimizationRef,
    }
    refMap[sectionId].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">통계</h1>
          <p className="text-sm text-gray-500 mt-1">하루 한 번 5분 스캔으로 다음 행동을 결정하세요.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '갱신 중' : '갱신'}
        </Button>
      </div>

      {/* 월 목표 + 진척도 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <GoalSettingCard onSaved={() => fetchForecast(true)} />
        <ProgressCard forecast={forecast} />
      </div>

      {/* 섹션 1 — TOP 브리핑 */}
      <Section title="오늘의 브리핑">
        <TopBriefing
          data={overview}
          loading={overviewLoading}
          onScrollTo={handleScrollTo}
          onActionApplied={() => fetchOverview(true)}
        />
      </Section>

      {/* 섹션 2 — 숨은 보석 */}
      <Section
        title="숨은 보석"
        subtitle="노출은 충분한데 클릭이 안 되는 글 — 제목만 바꿔도 효과적"
        anchorRef={hiddenGemsRef}
      >
        <HiddenGems
          gems={hiddenGems?.gems ?? []}
          loading={gemsLoading}
          errors={hiddenGems?.errors}
          onTitleChanged={() => {
            fetchOverview(true)
            fetchHiddenGems(true)
          }}
        />
      </Section>

      {/* 섹션 3 — 진단 (placeholder) */}
      <Section
        title="진단"
        subtitle="ROI 랭킹 + 카테고리 파레토 + 드릴다운 (Phase C 예정)"
        anchorRef={diagnosisRef}
      >
        <PlaceholderBlock label="진단 위젯" />
      </Section>

      {/* 섹션 4 — 최적화 (placeholder) */}
      <Section
        title="최적화"
        subtitle="슬롯·RPM 매트릭스·viewability (Phase C 예정)"
        anchorRef={optimizationRef}
      >
        <PlaceholderBlock label="최적화 위젯" />
      </Section>

      {/* 섹션 5 — 시뮬레이션 (기본 접힘, Phase D) */}
      <Section
        title="시뮬레이션 + 예측"
        subtitle="슬라이더로 변화를 미리 시험 (Phase D 예정)"
        collapsed={!simOpen}
        onToggle={() => setSimOpen(prev => !prev)}
      >
        <PlaceholderBlock label="시뮬레이션 위젯" />
      </Section>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
  collapsed,
  onToggle,
  anchorRef,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  collapsed?: boolean
  onToggle?: () => void
  anchorRef?: React.RefObject<HTMLDivElement>
}) {
  const isCollapsible = onToggle !== undefined
  return (
    <section ref={anchorRef} className="scroll-mt-6">
      <div
        className={`flex items-center justify-between mb-3 ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={isCollapsible ? onToggle : undefined}
      >
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {isCollapsible && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {collapsed
              ? <ChevronDown className="w-4 h-4 text-gray-400" />
              : <ChevronUp className="w-4 h-4 text-gray-400" />
            }
          </Button>
        )}
      </div>
      {(!isCollapsible || !collapsed) && (
        <div>{children}</div>
      )}
    </section>
  )
}

function PlaceholderBlock({ label }: { label: string }) {
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-sm text-gray-400">
      {label} — 곧 추가됩니다
    </div>
  )
}

function ProgressCard({ forecast }: { forecast: ForecastData | null }) {
  if (!forecast) {
    return <div className="h-14 bg-gray-50 border border-gray-100 rounded-lg animate-pulse" />
  }
  const { monthlyGoal, last30, predictedNext30, goalProgress, achievability } = forecast

  if (monthlyGoal === null) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-gray-200 bg-gray-50/50">
        <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-500">월 목표를 설정하면 진척도와 달성 가능성이 표시됩니다.</p>
      </div>
    )
  }

  const progressPct = Math.round((goalProgress ?? 0) * 100)
  const achievPct = Math.round((achievability ?? 0) * 100)
  const achievColor =
    achievPct >= 70 ? 'text-green-600 bg-green-50 border-green-200'
    : achievPct >= 30 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200'

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white">
      <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">현재 진척도</span>
          <span className="font-semibold text-gray-900">${last30.toFixed(2)} / ${monthlyGoal.toLocaleString()} ({progressPct}%)</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-400">다음 30일 예측: ${predictedNext30.toFixed(2)}</span>
          <span className={`px-1.5 py-0.5 rounded border font-medium ${achievColor}`}>
            달성 가능성 {achievPct}%
          </span>
        </div>
      </div>
    </div>
  )
}
