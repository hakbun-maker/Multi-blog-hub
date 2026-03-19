'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface RevenueSummary {
  thisMonth: number
  lastMonth: number
  estimated: number
  changeRate: number
}

export function RevenueSummaryCard() {
  const [data, setData] = useState<RevenueSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/monetize/dashboard')
        if (!response.ok) throw new Error('Failed to fetch dashboard data')
        const result = await response.json()
        setData(result.revenueSummary)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>수익 요약</CardTitle>
          <CardDescription>월별 수익 현황</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>수익 요약</CardTitle>
          <CardDescription>월별 수익 현황</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-red-600 py-8">
          {error || '데이터를 불러올 수 없습니다'}
        </CardContent>
      </Card>
    )
  }

  const isPositive = data.changeRate >= 0

  const metrics = [
    {
      label: '이번달',
      value: `₩${(data.thisMonth / 1000).toFixed(0)}K`,
      subtext: '',
    },
    {
      label: '지난달',
      value: `₩${(data.lastMonth / 1000).toFixed(0)}K`,
      subtext: '',
    },
    {
      label: '예상',
      value: `₩${(data.estimated / 1000).toFixed(0)}K`,
      subtext: '',
    },
    {
      label: '변화율',
      value: `${Math.abs(data.changeRate).toFixed(1)}%`,
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      color: isPositive ? 'text-green-600' : 'text-red-600',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>수익 요약</CardTitle>
        <CardDescription>월별 수익 현황</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-2">{metric.label}</div>
              <div className={`text-lg font-bold text-gray-900 ${metric.color || ''} flex items-center justify-center gap-1`}>
                {metric.value}
                {metric.icon}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
