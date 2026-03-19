'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { CheckType } from '@/types/monetize'

interface ScoreMetric {
  name: string
  score: number
  label: string
}

interface WeakArea {
  area: string
  reason: string
}

interface QualityScoreData {
  checkType: CheckType
  standardMetrics?: {
    discovery: number
    persuasion: number
    conversion: number
  }
  eventMetrics?: {
    event: number
    tech: number
  }
  totalScore: number
  weakAreas: WeakArea[]
}

export function QualityScoreReport({ postId }: { postId: string }) {
  const [data, setData] = useState<QualityScoreData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQualityScore = async () => {
      try {
        const response = await fetch(`/api/monetize/writing/report/${postId}`)
        if (!response.ok) throw new Error('Failed to fetch quality score')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    if (postId) {
      fetchQualityScore()
    }
  }, [postId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>품질 검수 보고서</CardTitle>
          <CardDescription>상세 품질 점수 분석</CardDescription>
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
          <CardTitle>품질 검수 보고서</CardTitle>
          <CardDescription>상세 품질 점수 분석</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-red-600 py-8">
          {error || '데이터를 불러올 수 없습니다'}
        </CardContent>
      </Card>
    )
  }

  let metrics: ScoreMetric[] = []

  if (data.checkType === 'standard' && data.standardMetrics) {
    metrics = [
      { name: 'Discovery', score: data.standardMetrics.discovery, label: '발견' },
      { name: 'Persuasion', score: data.standardMetrics.persuasion, label: '설득' },
      { name: 'Conversion', score: data.standardMetrics.conversion, label: '전환' },
    ]
  } else if (data.checkType === 'event' && data.eventMetrics) {
    metrics = [
      { name: 'Event', score: data.eventMetrics.event, label: '이벤트' },
      { name: 'Tech', score: data.eventMetrics.tech, label: '기술' },
    ]
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-amber-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-green-600'
    if (score >= 45) return 'text-gray-600'
    return 'text-red-600'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return 'bg-amber-500'
    if (score >= 75) return 'bg-blue-500'
    if (score >= 60) return 'bg-green-500'
    if (score >= 45) return 'bg-gray-400'
    return 'bg-red-400'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>품질 검수 보고서</CardTitle>
        <CardDescription>{data.checkType === 'standard' ? '표준 검수' : '이벤트 검수'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900 mb-2">{Math.round(data.totalScore)}</div>
            <div className="text-sm text-gray-500">종합 점수</div>
          </div>
        </div>

        {/* Metrics Gauges */}
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                <span className={`text-lg font-bold ${getScoreColor(metric.score)}`}>{Math.round(metric.score)}</span>
              </div>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getScoreBarColor(metric.score)}`}
                  style={{ width: `${Math.min(metric.score, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Weak Areas */}
        {data.weakAreas && data.weakAreas.length > 0 && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-red-900">개선 필요 영역</h4>
            </div>
            <ul className="space-y-2">
              {data.weakAreas.map((area, idx) => (
                <li key={idx} className="text-sm text-red-800">
                  <span className="font-medium">{area.area}:</span> {area.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
