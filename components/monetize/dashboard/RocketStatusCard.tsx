'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface PipelineData {
  pending: number
  writing: number
  reviewing: number
  published: number
}

const STATUS_COLORS = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: '대기' },
  writing: { bg: 'bg-blue-100', text: 'text-blue-700', label: '작성중' },
  reviewing: { bg: 'bg-orange-100', text: 'text-orange-700', label: '검수중' },
  published: { bg: 'bg-green-100', text: 'text-green-700', label: '발행완료' },
}

export function RocketStatusCard() {
  const router = useRouter()
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

  const handleNavigate = () => {
    router.push('/monetize/writing')
  }

  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleNavigate}>
        <CardHeader>
          <CardTitle>파이프라인 현황</CardTitle>
          <CardDescription>글쓰기 진행 상태</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleNavigate}>
        <CardHeader>
          <CardTitle>파이프라인 현황</CardTitle>
          <CardDescription>글쓰기 진행 상태</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-red-600 py-8">
          {error || '데이터를 불러올 수 없습니다'}
        </CardContent>
      </Card>
    )
  }

  const statuses = [
    { key: 'pending' as const, value: data.pending },
    { key: 'writing' as const, value: data.writing },
    { key: 'reviewing' as const, value: data.reviewing },
    { key: 'published' as const, value: data.published },
  ]

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleNavigate}>
      <CardHeader>
        <CardTitle>파이프라인 현황</CardTitle>
        <CardDescription>글쓰기 진행 상태</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {statuses.map(({ key, value }) => {
            const colors = STATUS_COLORS[key]
            return (
              <div key={key} className={`${colors.bg} rounded-lg p-4 text-center`}>
                <div className={`text-2xl font-bold ${colors.text}`}>{value}</div>
                <div className={`text-xs ${colors.text}`}>{colors.label}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
