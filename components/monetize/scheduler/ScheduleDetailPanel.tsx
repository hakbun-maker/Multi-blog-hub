'use client'

import { X, Pencil, Trash2, Plus, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import type { Grade } from '@/types/monetize'

interface CalendarEntry {
  id: string
  blogId: string
  blogName: string
  keywordId: string | null
  keyword: string | null
  keywordGrade: string | null
  scheduledDate: string
  scheduledTime: string
  status: string
  writingMode: string
  intentType: string | null
  intentFitScore: number
}

interface ScheduleDetailPanelProps {
  date: string
  entries: CalendarEntry[]
  onClose: () => void
  onEdit: (entry: CalendarEntry) => void
  onDelete: (entryId: string) => void
  onAdd: (date: string) => void
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  scheduled: { dot: 'bg-orange-400', label: '예약됨' },
  published: { dot: 'bg-green-500', label: '발행됨' },
  draft: { dot: 'bg-gray-400', label: '초안' },
  failed: { dot: 'bg-red-500', label: '실패' },
}

const INTENT_LABEL: Record<string, string> = {
  informational: '정보형',
  transactional: '거래형',
  navigational: '탐색형',
  commercial: '상업형',
}

export function ScheduleDetailPanel({
  date,
  entries,
  onClose,
  onEdit,
  onDelete,
  onAdd,
}: ScheduleDetailPanelProps) {
  const parsedDate = parseISO(date)
  const formattedDate = format(parsedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })

  const handleDelete = (entryId: string) => {
    const confirmed = window.confirm('이 예약을 삭제하시겠습니까?')
    if (confirmed) {
      onDelete(entryId)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-orange-200 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100 bg-orange-50 rounded-t-lg">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-gray-900">{formattedDate}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
            {entries.length}개 예약
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-orange-100 transition-colors text-gray-500 hover:text-gray-700"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Entry list */}
      <div className="divide-y divide-gray-100">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            이 날짜에 예약된 항목이 없습니다.
          </div>
        ) : (
          entries.map((entry) => {
            const statusConfig = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.scheduled
            const intentLabel = entry.intentType ? (INTENT_LABEL[entry.intentType] ?? entry.intentType) : null

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                {/* Time */}
                <div className="flex items-center gap-1 mt-0.5 min-w-[52px] text-xs text-gray-500 font-mono shrink-0">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{entry.scheduledTime.slice(0, 5)}</span>
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Keyword row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.keywordGrade && (
                      <GradeBadge grade={entry.keywordGrade as Grade} size="sm" />
                    )}
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {entry.keyword ?? '(키워드 없음)'}
                    </span>
                  </div>

                  {/* Blog name + badges */}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 truncate">{entry.blogName}</span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}
                      />
                      <span className="text-xs text-gray-500">{statusConfig.label}</span>
                    </span>
                    {intentLabel && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-100">
                        {intentLabel}
                      </span>
                    )}
                    {entry.intentFitScore > 0 && (
                      <span className="text-xs text-gray-400">
                        적합도 {entry.intentFitScore}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(entry)}
                    className="p-1.5 rounded hover:bg-orange-100 text-gray-400 hover:text-orange-600 transition-colors"
                    aria-label="수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer: add button */}
      <div className="px-4 py-3 border-t border-gray-100 rounded-b-lg">
        <button
          onClick={() => onAdd(date)}
          className="flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          키워드 추가
        </button>
      </div>
    </div>
  )
}
