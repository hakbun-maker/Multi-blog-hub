'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { applyStatsAction } from '@/lib/stats/actions'

interface SlotRow {
  slot: string
  enabled: boolean
  estimatedRevenue: number
  estimatedShare: number
  warning: string | null
}

interface AdSlotsCompareProps {
  slots: SlotRow[]
  loading: boolean
  onChanged: () => void
}

const SLOT_LABELS: Record<string, string> = {
  top: '상단',
  middle: '중단',
  bottom: '하단',
  sidebar: '사이드바',
}

export function AdSlotsCompare({ slots, loading, onChanged }: AdSlotsCompareProps) {
  const [pendingSlot, setPendingSlot] = useState<string | null>(null)

  if (loading) {
    return <div className="h-72 bg-gray-100 rounded animate-pulse" />
  }

  const chartData = slots.map(s => ({
    name: SLOT_LABELS[s.slot] ?? s.slot,
    revenue: s.estimatedRevenue,
    share: Math.round(s.estimatedShare * 100),
    enabled: s.enabled,
    slot: s.slot,
  }))

  const handleToggle = async (slot: string, enabled: boolean) => {
    setPendingSlot(slot)
    const result = await applyStatsAction('toggle_slot', { slot, enabled: !enabled })
    setPendingSlot(null)
    if (result.ok) onChanged()
  }

  return (
    <div className="space-y-3">
      <div className="border border-gray-100 rounded-lg p-3">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={v => `$${v}`}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
              formatter={(v: number, name: string) => name === '수익' ? [`$${v.toFixed(2)}`, name] : [`${v}%`, name]}
            />
            <Bar dataKey="revenue" name="수익" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.enabled ? '#3b82f6' : '#d1d5db'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 슬롯별 토글 */}
      <div className="space-y-1.5">
        {slots.map(s => {
          const label = SLOT_LABELS[s.slot] ?? s.slot
          const isLow = s.enabled && s.estimatedShare < 0.15
          return (
            <div
              key={s.slot}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-gray-100 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.enabled ? 'bg-blue-500' : 'bg-gray-300'}`} />
                <span className="font-medium text-gray-800">{label}</span>
                {isLow && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    낮은 기여도
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-600 tabular-nums">${s.estimatedRevenue.toFixed(2)}</span>
                <span className="text-[10px] text-gray-400 tabular-nums w-10 text-right">{(s.estimatedShare * 100).toFixed(0)}%</span>
                <Button
                  size="sm"
                  variant={s.enabled ? 'outline' : 'default'}
                  onClick={() => handleToggle(s.slot, s.enabled)}
                  disabled={pendingSlot === s.slot}
                  className="text-xs h-7 w-20"
                >
                  {pendingSlot === s.slot ? '...' : s.enabled ? '비활성화' : '활성화'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400">
        * AdSense는 슬롯 단위 수익을 직접 제공하지 않아 표준 분배 비율(상단 25%·중단 35%·하단 25%·사이드바 15%)로 추정합니다.
      </p>
    </div>
  )
}
