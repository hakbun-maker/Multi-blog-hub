'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Loader2 } from 'lucide-react'

interface ChartDataPoint {
  date: string
  revenue: number
}

type Period = '1m' | '3m' | '6m' | '1y'

export function RevenueLineChart() {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('1m')

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true)
        const now = new Date()
        const startDate = new Date()

        // Calculate start date based on period
        if (period === '1m') {
          startDate.setMonth(now.getMonth() - 1)
        } else if (period === '3m') {
          startDate.setMonth(now.getMonth() - 3)
        } else if (period === '6m') {
          startDate.setMonth(now.getMonth() - 6)
        } else if (period === '1y') {
          startDate.setFullYear(now.getFullYear() - 1)
        }

        const response = await fetch(
          `/api/monetize/analytics?dimension=blog&startDate=${startDate.toISOString().split('T')[0]}&endDate=${now.toISOString().split('T')[0]}`
        )
        if (!response.ok) throw new Error('Failed to fetch analytics data')
        const result = await response.json()
        setData(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [period])

  const periodButtons = [
    { value: '1m' as Period, label: '1개월' },
    { value: '3m' as Period, label: '3개월' },
    { value: '6m' as Period, label: '6개월' },
    { value: '1y' as Period, label: '1년' },
  ]

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>수익 트렌드</CardTitle>
            <CardDescription>시간대별 수익 변동</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center text-red-600 py-12">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>수익 트렌드</CardTitle>
          <CardDescription>시간대별 수익 변동</CardDescription>
        </div>
        <div className="flex gap-2">
          {periodButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setPeriod(btn.value)}
              className={`px-3 py-1 text-sm rounded border transition-colors ${
                period === btn.value
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value) => `₩${Number(value).toLocaleString()}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
                name="수익"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-400">데이터가 없습니다</div>
        )}
      </CardContent>
    </Card>
  )
}
