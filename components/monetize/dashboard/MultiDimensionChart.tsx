'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2 } from 'lucide-react'

type Dimension = 'blog' | 'category' | 'language' | 'type'

interface DimensionDataItem {
  name: string
  totalRevenue: number
  estimatedRevenue: number
  totalPageViews: number
  averageRpm: number
  dataPoints: number
}

interface MultiDimensionChartProps {
  startDate?: string
  endDate?: string
}

const DIMENSION_LABELS: Record<Dimension, string> = {
  blog: '블로그별',
  category: '광고 카테고리별',
  language: '언어별',
  type: '블로그 유형별',
}

const LANGUAGE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  de: '독일어',
  pt_br: '포르투갈어(BR)',
  es: '스페인어',
  Unknown: '알 수 없음',
}

function formatDimensionName(dimension: Dimension, name: string): string {
  if (dimension === 'language') {
    return LANGUAGE_LABELS[name] ?? name
  }
  return name
}

export function MultiDimensionChart({ startDate, endDate }: MultiDimensionChartProps) {
  const [selectedDimension, setSelectedDimension] = useState<Dimension>('blog')
  const [chartData, setChartData] = useState<DimensionDataItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({ dimension: selectedDimension })
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)

        const response = await fetch(`/api/monetize/analytics?${params.toString()}`)
        if (!response.ok) throw new Error('분석 데이터를 불러오지 못했습니다.')

        const result = await response.json()
        const raw: Record<string, Omit<DimensionDataItem, 'name'>> = result.data || {}

        const parsed: DimensionDataItem[] = Object.entries(raw).map(([name, values]) => ({
          name: formatDimensionName(selectedDimension, name),
          totalRevenue: values.totalRevenue,
          estimatedRevenue: values.estimatedRevenue,
          totalPageViews: values.totalPageViews,
          averageRpm: values.averageRpm,
          dataPoints: values.dataPoints,
        }))

        // Sort by totalRevenue descending
        parsed.sort((a, b) => b.totalRevenue - a.totalRevenue)

        setChartData(parsed)
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedDimension, startDate, endDate])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-gray-900">다차원 수익 분석</CardTitle>
        <Select
          value={selectedDimension}
          onValueChange={(value) => setSelectedDimension(value as Dimension)}
        >
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(DIMENSION_LABELS) as [Dimension, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">분석 데이터가 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value: number) => `₩${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [`₩${value.toLocaleString()}`, '실제 수익']}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Bar
                dataKey="totalRevenue"
                name="실제 수익"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
