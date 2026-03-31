'use client'

import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import { RevenueScoreBar } from '@/components/monetize/shared/RevenueScoreBar'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import type { DistributionPreviewItem } from '@/types/monetize'

interface BlogDistributionPreviewProps {
  previews: DistributionPreviewItem[]
  onRemove?: (keywordId: string) => void
}

export function BlogDistributionPreview({ previews, onRemove }: BlogDistributionPreviewProps) {
  const handleRemovePreview = (keywordId: string) => {
    if (onRemove) {
      onRemove(keywordId)
    }
  }

  if (previews.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-4">배분 결과 없음</div>
  }

  return (
    <div className="space-y-2">
      {previews.map((item, idx) => {
        const scheduledDateTime = new Date(`${item.scheduledDate}T${item.scheduledTime}`)
        const formattedDateTime = format(scheduledDateTime, 'MM/dd HH:mm')

        return (
          <div
            key={`${item.keywordId}-${item.blogId}-${idx}`}
            className="text-xs border border-gray-200 rounded p-2 bg-gray-50 space-y-1.5"
          >
            {/* Row 1: Keyword, Intent, Grade */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{item.keyword}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                  {item.intentType}
                </span>
                <GradeBadge grade={item.keywordGrade} size="sm" />
              </div>
            </div>

            {/* Row 2: Blog, Date/Time, Fit Score */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 truncate">{item.blogName}</span>
                  <GradeBadge grade={item.blogGrade} size="sm" />
                </div>
              </div>
              <div className="text-gray-500 flex-shrink-0">{formattedDateTime}</div>
            </div>

            {/* Row 3: Fit Score Bar */}
            <div>
              <RevenueScoreBar score={item.intentFitScore} maxScore={100} />
            </div>

            {/* Row 4: Reason + Remove Button */}
            <div className="flex items-start gap-2 justify-between">
              <div className="flex-1 text-gray-600">{item.reason}</div>
              <button
                onClick={() => handleRemovePreview(item.keywordId)}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove from distribution"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
