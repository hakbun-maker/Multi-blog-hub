'use client'

import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import type { Grade } from '@/types/monetize'

interface KeywordScheduleCardProps {
  keyword: string | null
  grade?: Grade
  blogName: string
  status: string
  intentType?: string | null
  scheduledTime?: string
  onClick?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-400',
  writing: 'bg-blue-400',
  reviewing: 'bg-yellow-400',
  review_queue: 'bg-orange-400',
  auto_published: 'bg-green-400',
  published: 'bg-green-500',
  rejected: 'bg-red-400',
}

export function KeywordScheduleCard({
  keyword,
  grade,
  blogName,
  status,
  intentType,
  scheduledTime,
  onClick,
}: KeywordScheduleCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-1.5 rounded bg-white border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all text-xs space-y-0.5"
    >
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status] || 'bg-gray-300'}`} />
        {scheduledTime && (
          <span className="text-gray-500 flex-shrink-0">{scheduledTime.slice(0, 5)}</span>
        )}
        <span className="font-medium text-gray-800 truncate flex-1">{keyword || '키워드 없음'}</span>
        {grade && <GradeBadge grade={grade} size="sm" />}
      </div>
      <div className="flex items-center gap-1 text-gray-400">
        <span className="truncate">{blogName}</span>
        {intentType && <span className="text-orange-400">{intentType}</span>}
      </div>
    </button>
  )
}
