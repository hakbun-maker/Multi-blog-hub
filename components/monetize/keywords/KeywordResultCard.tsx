'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import { RevenueScoreBar } from '@/components/monetize/shared/RevenueScoreBar'
import type { Keyword } from '@/types/monetize'
import { TrendingUp } from 'lucide-react'

interface KeywordResultCardProps {
  keyword: Keyword
  onRegister?: (keywordId: string) => void
}

const INTENT_COLORS: Record<string, string> = {
  AD: 'bg-red-100 text-red-700',
  REVIEW: 'bg-blue-100 text-blue-700',
  INFO: 'bg-green-100 text-green-700',
  CRITIC: 'bg-purple-100 text-purple-700',
  COMPARE: 'bg-yellow-100 text-yellow-700',
  TREND: 'bg-pink-100 text-pink-700',
}

export function KeywordResultCard({ keyword, onRegister }: KeywordResultCardProps) {
  const [isRegistering, setIsRegistering] = useState(false)

  const handleRegister = async () => {
    setIsRegistering(true)
    try {
      const res = await fetch('/api/monetize/keywords/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: keyword.id }),
      })
      if (res.ok && onRegister) {
        onRegister(keyword.id)
      }
    } catch (error) {
      console.error('Failed to register keyword:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-orange-200 hover:bg-orange-50/50 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{keyword.keyword}</h3>
            <GradeBadge grade={keyword.keywordGrade} size="md" />
          </div>
          {keyword.intentType && (
            <p className={`text-xs font-medium px-2 py-0.5 rounded w-fit ${INTENT_COLORS[keyword.intentType] || 'bg-gray-100 text-gray-700'}`}>
              {keyword.intentType}
            </p>
          )}
        </div>
        <Button
          onClick={handleRegister}
          disabled={isRegistering}
          variant="outline"
          className="text-orange-600 border-orange-200 hover:bg-orange-50 whitespace-nowrap"
        >
          {isRegistering ? '등록 중...' : '달력 등록'}
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600 font-medium">수익 점수</span>
            <span className="text-xs text-gray-500">{keyword.keywordGrade}</span>
          </div>
          <RevenueScoreBar score={keyword.revenueScore} />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">월간 검색</p>
            <p className="text-sm font-semibold text-gray-900">{keyword.monthlySearchVolume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">CPC</p>
            <p className="text-sm font-semibold text-gray-900">${keyword.cpcEstimate.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">경합도</p>
            <p className="text-sm font-semibold text-gray-900">{keyword.competitionScore.toFixed(1)}</p>
          </div>
        </div>

        {keyword.trendIndex > 0 && (
          <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">상승 추세 ({keyword.trendIndex.toFixed(1)})</span>
          </div>
        )}
      </div>
    </div>
  )
}
