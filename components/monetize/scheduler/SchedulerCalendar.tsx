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
import { ScheduleDetailPanel } from './ScheduleDetailPanel'
import { ScheduleEditModal } from './ScheduleEditModal'

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

interface CalendarData {
  year: number
  month: number
  calendar: Record<string, CalendarEntry[]>
}

export function SchedulerCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormDate, setAddFormDate] = useState<string>('')
  const [addKeywordText, setAddKeywordText] = useState('')
  const [addBlogId, setAddBlogId] = useState('')
  const [addTime, setAddTime] = useState('09:00')
  const [addBlogs, setAddBlogs] = useState<{ id: string; name: string }[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [showSyncInfo, setShowSyncInfo] = useState(false)

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

  const handleOpenAdd = (date: string) => {
    setAddFormDate(date)
    setShowAddForm(true)
    setAddKeywordText('')
    setAddTime('09:00')
    if (addBlogs.length === 0) {
      fetch('/api/blogs')
        .then(r => r.json())
        .then(json => {
          const list = (json.data || json.blogs || []).map((b: any) => ({ id: b.id, name: b.name }))
          setAddBlogs(list)
          if (list.length > 0) setAddBlogId(list[0].id)
        })
        .catch(() => {})
    }
  }

  const handleAddSubmit = async () => {
    if (!addKeywordText.trim() || !addBlogId || !addFormDate) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/monetize/scheduler/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordText: addKeywordText.trim(),
          blogId: addBlogId,
          scheduledDate: addFormDate,
          scheduledTime: addTime,
        }),
      })
      if (res.ok) {
        setShowAddForm(false)
        fetchCalendarData()
      }
    } catch (err) {
      console.error('Add failed:', err)
    } finally {
      setAddLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const res = await fetch(`/api/monetize/scheduler/entry/${entryId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchCalendarData()
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // Generate calendar days including overflow from previous/next months
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday = 1
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Use calendar data directly (already grouped by date from API)
  const entriesByDate: Record<string, CalendarEntry[]> = data?.calendar || {}

  const weekDays = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header with month/year navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, 'yyyy년 MM월')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSyncInfo(true)}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            📅 Google Calendar 동기화
          </button>
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

      {showSyncInfo && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex justify-between items-start">
            <h4 className="text-sm font-semibold text-blue-800">Google Calendar 구독 방법</h4>
            <button onClick={() => setShowSyncInfo(false)} className="text-blue-400 hover:text-blue-600 text-xs">닫기</button>
          </div>
          <div className="text-xs text-blue-700 space-y-2">
            <p>아래 URL을 Google Calendar에 구독하면 스케줄이 자동 동기화됩니다.</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={`${window.location.origin}/api/monetize/scheduler/ical`}
                className="flex-1 px-2 py-1 bg-white border border-blue-300 rounded text-xs"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/monetize/scheduler/ical`)
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                복사
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-blue-600">
              <li>위 URL을 복사합니다</li>
              <li>Google Calendar 앱/웹 → 설정 → 캘린더 추가</li>
              <li>"URL로 추가" 선택 → URL 붙여넣기</li>
              <li>스케줄이 자동으로 핸드폰 달력에 표시됩니다</li>
            </ol>
          </div>
          <a
            href={`/api/monetize/scheduler/ical`}
            download="bloghub-schedule.ics"
            className="inline-block px-3 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            📥 ICS 파일 다운로드
          </a>
        </div>
      )}

      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      )}

      {!loading && (
        <>
        <div className="space-y-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid — click any cell to open detail panel */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayEntries = entriesByDate[dateKey] || []
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = selectedDate === dateKey

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`border rounded p-2 min-h-28 cursor-pointer transition-colors hover:bg-orange-50/50 ${
                    isSelected
                      ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-300'
                      : isCurrentMonth
                      ? 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-100'
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
                        grade={entry.keywordGrade as any}
                        blogName={entry.blogName}
                        status={entry.status}
                        intentType={entry.intentType}
                        scheduledTime={entry.scheduledTime}
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

        {selectedDate && (
          <div className="mt-4">
            <ScheduleDetailPanel
              date={selectedDate}
              entries={entriesByDate[selectedDate] || []}
              onClose={() => setSelectedDate(null)}
              onEdit={(entry) => setEditEntry(entry)}
              onDelete={handleDeleteEntry}
              onAdd={(date) => handleOpenAdd(date)}
            />
          </div>
        )}

        {showAddForm && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-orange-800">키워드 수동 추가 — {addFormDate}</h4>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 text-xs">닫기</button>
            </div>
            <input
              type="text"
              value={addKeywordText}
              onChange={e => setAddKeywordText(e.target.value)}
              placeholder="키워드 입력"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={addBlogId} onChange={e => setAddBlogId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded text-sm bg-white">
                {addBlogs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={addTime} onChange={e => setAddTime(e.target.value)} className="px-3 py-2 border border-gray-300 rounded text-sm bg-white">
                {['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddSubmit}
              disabled={addLoading || !addKeywordText.trim()}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
            >
              {addLoading ? '등록 중...' : '등록'}
            </button>
          </div>
        )}
        </>
      )}

      {editEntry && (
        <ScheduleEditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={() => {
            setEditEntry(null)
            fetchCalendarData()
          }}
        />
      )}
    </div>
  )
}
