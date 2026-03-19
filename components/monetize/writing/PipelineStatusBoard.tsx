'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface PipelineData {
  pending: number
  writing: number
  reviewing: number
  published: number
}

const STATUS_CONFIG = [
  { key: 'pending', label: '대기', color: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-300' },
  { key: 'writing', label: '작성중', color: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-300' },
  { key: 'reviewing', label: '검수중', color: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-300' },
  { key: 'published', label: '발행완료', color: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-300' },
]

export function PipelineStatusBoard() {
  const [data, setData] = useState<PipelineData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        const response = await fetch('/api/monetize/writing/pipeline')
        if (!response.ok) throw new Error('Failed to fetch pipeline data')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPipelineData()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>파이프라인 현황</CardTitle>
          <CardDescription>Kanban 형식의 글쓰기 진행 상태</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>파이프라인 현황</CardTitle>
          <CardDescription>Kanban 형식의 글쓰기 진행 상태</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-red-600 py-12">
          {error || '데이터를 불러올 수 없습니다'}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>파이프라인 현황</CardTitle>
        <CardDescription>Kanban 형식의 글쓰기 진행 상태</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {STATUS_CONFIG.map(({ key, label, color, textColor, borderColor }) => {
            const value = data[key as keyof PipelineData]
            return (
              <div
                key={key}
                className={`${color} ${borderColor} border-2 rounded-lg p-6 text-center transition-all hover:shadow-md`}
              >
                <div className={`${textColor} text-sm font-semibold mb-2`}>{label}</div>
                <div className={`${textColor} text-3xl font-bold`}>{value}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
