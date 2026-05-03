'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, AlertCircle, Sparkles, X } from 'lucide-react'
import { applyStatsAction, type StatsActionType } from '@/lib/stats/actions'

interface OverviewData {
  delta: { revenue: number; views: number; ctr: number }
  totals: {
    revenue: number
    views: number
    impressions: number
    clicks: number
    ctr: number
  }
  alerts: { hiddenGems: number; decaying: number }
  recommendedActions: RecommendedAction[]
  errors?: { source: string; message: string }[]
}

interface RecommendedAction {
  id: string
  type: StatsActionType
  title: string
  description: string
  payload?: Record<string, unknown>
}

interface TopBriefingProps {
  data: OverviewData | null
  loading: boolean
  onScrollTo: (sectionId: 'hidden-gems' | 'diagnosis' | 'optimization') => void
  onActionApplied: () => void
}

export function TopBriefing({ data, loading, onScrollTo, onActionApplied }: TopBriefingProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
        <div className="h-24 bg-gray-100 rounded-lg" />
        <div className="h-24 bg-gray-100 rounded-lg" />
        <div className="h-24 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        브리핑 데이터를 불러올 수 없습니다.
      </div>
    )
  }

  const visibleActions = data.recommendedActions.filter(a => !dismissedIds.has(a.id))

  const handleApply = async (action: RecommendedAction) => {
    if (!action.payload) {
      // placeholder 액션 — 그냥 dismiss
      setDismissedIds(prev => new Set(prev).add(action.id))
      return
    }
    setPendingId(action.id)
    const result = await applyStatsAction(action.type, action.payload)
    setPendingId(null)
    if (result.ok) {
      setDismissedIds(prev => new Set(prev).add(action.id))
      onActionApplied()
    }
  }

  const handleDismiss = (action: RecommendedAction) => {
    setDismissedIds(prev => new Set(prev).add(action.id))
  }

  return (
    <div className="space-y-4">
      {/* Delta 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DeltaCard label="수익" value={`$${data.totals.revenue.toFixed(2)}`} delta={data.delta.revenue} />
        <DeltaCard label="조회수" value={data.totals.views.toLocaleString()} delta={data.delta.views} />
        <DeltaCard label="CTR" value={`${(data.totals.ctr * 100).toFixed(2)}%`} delta={data.delta.ctr} />
      </div>

      {/* 알림 배지 */}
      {(data.alerts.hiddenGems > 0 || data.alerts.decaying > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.alerts.hiddenGems > 0 && (
            <button
              onClick={() => onScrollTo('hidden-gems')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              숨은 보석 {data.alerts.hiddenGems}개
            </button>
          )}
          {data.alerts.decaying > 0 && (
            <button
              onClick={() => onScrollTo('diagnosis')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <AlertCircle className="w-3 h-3" />
              덮이는 글 {data.alerts.decaying}개
            </button>
          )}
        </div>
      )}

      {/* 추천 액션 카드 */}
      {visibleActions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {visibleActions.slice(0, 3).map(action => (
            <Card key={action.id} className="border-blue-100">
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">{action.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{action.description}</p>
                <div className="flex gap-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleApply(action)}
                    disabled={pendingId === action.id || !action.payload}
                    className="text-xs h-7"
                  >
                    {pendingId === action.id ? '적용 중...' : '지금 적용'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(action)}
                    className="text-xs h-7 px-2 text-gray-400"
                    title="무시"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function DeltaCard({ label, value, delta }: { label: string; value: string; delta: number }) {
  const positive = delta > 0
  const negative = delta < 0
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
          positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-400'
        }`}>
          {positive && <ArrowUp className="w-3 h-3" />}
          {negative && <ArrowDown className="w-3 h-3" />}
          {delta === 0 ? '변동 없음' : `${Math.abs(delta).toFixed(1)}% ${positive ? '상승' : '하락'}`}
        </div>
      </CardContent>
    </Card>
  )
}
