'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { PostQualityScore, CheckType } from '@/types/monetize'

interface QualityScoreSidebarProps {
  postId: string
}

interface QualityReport {
  postId: string
  blogId: string
  blogName: string
  status: string
  keyword: string
  keywordType: string
  intentType: string
  scheduledDate: string
  scheduledTime: string
  contentLength: number
  qualityScore: {
    checkType: CheckType
    totalScore: number
    discoveryScore: number
    persuasionScore: number
    conversionScore: number
    eventScore: number
    techScore: number
    autoPublished: boolean
    reviewReason: string | null
    breakdown: Record<string, any>
    createdAt: string
  } | null
  createdAt: string
  updatedAt: string
}

export function QualityScoreSidebar({ postId }: QualityScoreSidebarProps) {
  const [report, setReport] = useState<QualityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReport()
  }, [postId])

  const fetchReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/monetize/writing/report/${postId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch quality report')
      }
      const json = await res.json()
      setReport(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '리포트 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !report?.qualityScore) {
    return (
      <div className="bg-red-50 rounded-lg border border-red-200 p-4 flex gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">{error || '품질 점수 없음'}</div>
      </div>
    )
  }

  const qs = report.qualityScore
  const isStandard = qs.checkType === 'standard'

  const axes = isStandard
    ? [
        { label: 'Discovery', score: qs.discoveryScore, max: 17 },
        { label: 'Persuasion', score: qs.persuasionScore, max: 18 },
        { label: 'Conversion', score: qs.conversionScore, max: 15 },
      ]
    : [
        { label: 'Event', score: qs.eventScore, max: 35 },
        { label: 'Tech', score: qs.techScore, max: 15 },
      ]

  const total = isStandard ? 50 : 50
  const totalScore = qs.totalScore

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">품질 검수 점수</h3>
          <span className="text-lg font-bold text-blue-600">
            {totalScore}/{total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(totalScore / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {axes.map((axis) => (
          <div key={axis.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">{axis.label}</span>
              <span className="text-xs font-bold text-gray-900">
                {axis.score}/{axis.max}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(axis.score / axis.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {qs.reviewReason && (
        <div className="bg-amber-50 rounded border border-amber-200 p-2.5">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">검수 사유:</span> {qs.reviewReason}
          </p>
        </div>
      )}

      {qs.autoPublished && (
        <div className="bg-green-50 rounded border border-green-200 p-2.5">
          <p className="text-xs font-medium text-green-800">✓ 자동 발행됨</p>
        </div>
      )}

      <button
        onClick={fetchReport}
        className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1.5 border border-blue-100 rounded hover:bg-blue-50 transition-colors"
      >
        새로고침
      </button>
    </div>
  )
}
