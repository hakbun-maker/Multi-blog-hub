'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

interface ParetoRow {
  categoryId: string | null
  categoryName: string
  revenue: number
  views: number
  share: number       // 0~1
  cumulative: number  // 0~1
}

interface CategoryParetoProps {
  data: ParetoRow[]
  loading: boolean
}

export function CategoryPareto({ data, loading }: CategoryParetoProps) {
  if (loading) {
    return <div className="h-72 bg-gray-100 rounded animate-pulse" />
  }

  if (data.length === 0) {
    return (
      <div className="border border-gray-100 rounded-lg p-8 text-center text-sm text-gray-400">
        카테고리별 수익 데이터가 아직 없습니다.
      </div>
    )
  }

  // recharts 데이터 — share/cumulative를 % 단위로 변환 + 80% 라인 도달 여부 표시
  const chartData = data.map(d => ({
    name: d.categoryName,
    revenue: d.revenue,
    cumulativePct: Math.round(d.cumulative * 100),
    share: Math.round(d.share * 100),
    isCore: d.cumulative <= 0.8,  // 80% 이하 카테고리 = 핵심
  }))

  return (
    <div className="space-y-2">
      <div className="border border-gray-100 rounded-lg p-3">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              angle={-30}
              textAnchor="end"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              height={60}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={v => `$${v}`}
              label={{ value: '수익 ($)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={v => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
              formatter={(value: number, name: string) => {
                if (name === '누적 %') return [`${value}%`, name]
                if (name === '수익') return [`$${value.toFixed(2)}`, name]
                return [value, name]
              }}
            />
            <ReferenceLine
              yAxisId="right"
              y={80}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: '80%', position: 'right', fill: '#ef4444', fontSize: 10 }}
            />
            <Bar yAxisId="left" dataKey="revenue" name="수익" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.isCore ? '#3b82f6' : '#cbd5e1'} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePct"
              name="누적 %"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400">
        * 누적 80% 이하 카테고리(파란색)가 수익 핵심 — 이 영역에 발행 빈도를 집중하세요.
      </p>
    </div>
  )
}
