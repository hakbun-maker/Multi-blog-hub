'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  getDay,
  isSameMonth,
} from 'date-fns'
import { KeywordScheduleCard } from './KeywordScheduleCard'
import type { ScheduledPost } from '@/types/monetize'

interface CalendarData {
  year: number
  month: number
  entries: (ScheduledPost & { keyword: string | null; blogName: string })[]
}

export function SchedulerCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    fetchCalendarData()
  }, [year, month])

  const fetchCalendarData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/monetize/scheduler/calendar?year=${year}&month=${month}`)
      if (!response.ok) throw new Error('Failed to fetch calendar data')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1))
  }

  // Generate calendar days including overflow from previous/next months
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday = 1
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Group entries by date
  const entriesByDate: Record<string, (ScheduledPost & { keyword: string | null; blogName: string })[]> = {}
  if (data?.entries) {
    data.entries.forEach((entry) => {
      const dateKey = entry.scheduledDate
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = []
      }
      entriesByDate[dateKey].push(entry)
    })
  }

  const weekDays = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header with month/year navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, 'yyyy년 MM월')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayEntries = entriesByDate[dateKey] || []
              const isCurrentMonth = isSameMonth(day, currentDate)

              return (
                <div
                  key={idx}
                  className={`border rounded p-2 min-h-28 ${
                    isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <KeywordScheduleCard
                        key={entry.id}
                        keyword={entry.keyword}
                        grade={
                          entry.keyword && 'keywordGrade' in entry ? (entry as any).keywordGrade : undefined
                        }
                        blogName={entry.blogName}
                        status={entry.status}
                        intentType={entry.intentType}
                      />
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-xs text-gray-400 px-1.5">
                        +{dayEntries.length - 3}개 더보기
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
