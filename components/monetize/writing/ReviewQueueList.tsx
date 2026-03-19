'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import { RevenueScoreBar } from '@/components/monetize/shared/RevenueScoreBar'
import { Loader2, AlertCircle, CheckCircle, XCircle, Edit2 } from 'lucide-react'
import type { Grade } from '@/types/monetize'

interface ReviewQueueItem {
  id: string
  keyword: string
  blogName: string
  grade: Grade
  score: number
  reviewReason: string
  blogId: string
}

export function ReviewQueueList() {
  const router = useRouter()
  const [data, setData] = useState<ReviewQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    const fetchReviewQueue = async () => {
      try {
        const response = await fetch('/api/monetize/writing/review-queue')
        if (!response.ok) throw new Error('Failed to fetch review queue')
        const result = await response.json()
        setData(result.items || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviewQueue()
  }, [])

  const handleApprove = async (id: string) => {
    try {
      setActionInProgress(id)
      const response = await fetch(`/api/monetize/writing/approve/${id}`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to approve')
      setData((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Approve error:', err)
      alert('승인 중 오류가 발생했습니다')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleReject = async (id: string) => {
    try {
      setActionInProgress(id)
      const response = await fetch(`/api/monetize/writing/reject/${id}`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to reject')
      setData((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Reject error:', err)
      alert('거절 중 오류가 발생했습니다')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/editor/${id}?from=review`)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>검수 대기 목록</CardTitle>
          <CardDescription>발행 대기 중인 글 목록</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>검수 대기 목록</CardTitle>
          <CardDescription>발행 대기 중인 글 목록</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-red-600 py-12">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>검수 대기 목록</CardTitle>
        <CardDescription>발행 대기 중인 글 목록 ({data.length})</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p>검수 대기 목록이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Keyword and Blog */}
                  <div className="col-span-4">
                    <div className="font-semibold text-gray-900 mb-1">{item.keyword}</div>
                    <div className="text-sm text-gray-500">{item.blogName}</div>
                  </div>

                  {/* Grade and Score */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <GradeBadge grade={item.grade} size="sm" />
                    </div>
                    <RevenueScoreBar score={item.score} />
                  </div>

                  {/* Review Reason */}
                  <div className="col-span-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-600">{item.reviewReason}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item.id)}
                      disabled={actionInProgress === item.id}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(item.id)}
                      disabled={actionInProgress === item.id}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {actionInProgress === item.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-1" />
                      )}
                      거절
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item.id)}
                      disabled={actionInProgress === item.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionInProgress === item.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      승인
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
