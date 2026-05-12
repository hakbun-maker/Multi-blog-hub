'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ViewabilityBucket {
  range: 'high' | 'medium' | 'low'
  domains: { domain: string; viewability: number; impressions: number }[]
}

interface ViewabilityDistributionProps {
  buckets: ViewabilityBucket[]
  loading: boolean
}

const BUCKET_LABEL: Record<ViewabilityBucket['range'], string> = {
  high: '60% 이상 (양호)',
  medium: '30~60% (개선)',
  low: '30% 미만 (점검)',
}
const BUCKET_COLOR: Record<ViewabilityBucket['range'], string> = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#ef4444',
}

export function ViewabilityDistribution({ buckets, loading }: ViewabilityDistributionProps) {
  if (loading) {
    return <div className="h-64 bg-gray-100 rounded animate-pulse" />
  }

  const totalDomains = buckets.reduce((acc, b) => acc + b.domains.length, 0)
  if (totalDomains === 0) {
    return (
      <div className="border border-gray-100 rounded-lg p-8 text-center text-sm text-gray-400">
        Viewability 데이터가 아직 없습니다. AdSense 연결 + 광고 노출 누적 후 표시됩니다.
      </div>
    )
  }

  const chartData = buckets.map(b => ({
    name: BUCKET_LABEL[b.range],
    value: b.domains.length,
    range: b.range,
  })).filter(d => d.value > 0)

  const lowBucket = buckets.find(b => b.range === 'low')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border border-gray-100 rounded-lg p-3 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={(entry) => `${entry.value}`}
              labelLine={false}
            >
              {chartData.map((d, i) => (
                <Cell key={i} fill={BUCKET_COLOR[d.range as ViewabilityBucket['range']]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
              formatter={(v: number) => [`${v}개 도메인`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {buckets.map(b => (
          <div key={b.range} className="border border-gray-100 rounded-md p-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BUCKET_COLOR[b.range] }} />
                <span className="font-medium text-gray-700">{BUCKET_LABEL[b.range]}</span>
              </div>
              <span className="text-gray-400">{b.domains.length}개</span>
            </div>
          </div>
        ))}

        {/* 낮은 viewability 도메인 목록 */}
        {lowBucket && lowBucket.domains.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] text-red-600 font-medium">점검 필요 도메인:</p>
            {lowBucket.domains.map(d => (
              <div key={d.domain} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-red-50/60 border border-red-100">
                <span className="text-gray-700 truncate">{d.domain}</span>
                <span className="text-red-600 tabular-nums flex-shrink-0 ml-2">{(d.viewability * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
