'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface KeywordTrendChartProps {
  data?: { month: string; volume: number }[]
  keyword?: string
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function KeywordTrendChart({ data, keyword }: KeywordTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-sm text-gray-400">
        {keyword ? `"${keyword}" 트렌드 데이터 준비 중` : '키워드를 검색하면 트렌드가 표시됩니다'}
      </div>
    )
  }

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            labelStyle={{ fontWeight: 600, color: '#1f2937' }}
            formatter={(value: number) => [value.toLocaleString(), '검색량']}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#trendGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Generate mock trend data for demo purposes when real data is not available */
export function generateMockTrendData(baseVolume: number = 5000): { month: string; volume: number }[] {
  return MONTHS.map((month, idx) => {
    const seasonal = Math.sin((idx / 11) * Math.PI * 2) * 0.3
    const noise = (Math.random() - 0.5) * 0.2
    const volume = Math.round(baseVolume * (1 + seasonal + noise))
    return { month, volume: Math.max(100, volume) }
  })
}
