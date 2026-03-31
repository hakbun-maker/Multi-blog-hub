'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface BlogOption {
  id: string
  name: string
  language?: string
  category?: string
}

interface ScheduleEditModalProps {
  entry: CalendarEntry
  onClose: () => void
  onSaved: () => void
}

// Generate time options 09:00 ~ 18:00 every 30 min
function generateTimeOptions(): string[] {
  const options: string[] = []
  for (let h = 9; h <= 18; h++) {
    options.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 18) {
      options.push(`${String(h).padStart(2, '0')}:30`)
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// Add minutes to a HH:MM time string, clamped to 18:00
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const clampedTotal = Math.min(total, 18 * 60)
  const newH = Math.floor(clampedTotal / 60)
  const newM = clampedTotal % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

export function ScheduleEditModal({
  entry,
  onClose,
  onSaved,
}: ScheduleEditModalProps) {
  const [blogs, setBlogs] = useState<BlogOption[]>([])
  const [blogsLoading, setBlogsLoading] = useState(true)
  const [blogsError, setBlogsError] = useState<string | null>(null)

  const [selectedBlogId, setSelectedBlogId] = useState(entry.blogId)
  const [selectedDate, setSelectedDate] = useState(entry.scheduledDate)
  const [selectedTime, setSelectedTime] = useState(
    entry.scheduledTime.slice(0, 5)
  )

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Multi-blog section
  const [multiOpen, setMultiOpen] = useState(false)
  const [checkedBlogs, setCheckedBlogs] = useState<Set<string>>(new Set())
  const [bulkAdding, setBulkAdding] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBlogs() {
      setBlogsLoading(true)
      setBlogsError(null)
      try {
        const res = await fetch('/api/blogs')
        if (!res.ok) throw new Error('블로그 목록을 불러오지 못했습니다')
        const data = await res.json()
        setBlogs(data.blogs ?? [])
      } catch (err) {
        setBlogsError(err instanceof Error ? err.message : '오류가 발생했습니다')
      } finally {
        setBlogsLoading(false)
      }
    }
    fetchBlogs()
  }, [])

  const otherBlogs = blogs.filter((b) => b.id !== entry.blogId)

  const handleToggleBlog = (blogId: string) => {
    setCheckedBlogs((prev) => {
      const next = new Set(prev)
      if (next.has(blogId)) {
        next.delete(blogId)
      } else {
        next.add(blogId)
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/monetize/scheduler/reassign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: entry.id,
          newBlogId: selectedBlogId,
          newDate: selectedDate,
          newTime: selectedTime,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? '저장에 실패했습니다')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('이 예약을 삭제하시겠습니까?')
    if (!confirmed) return

    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/monetize/scheduler/entry/${entry.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? '삭제에 실패했습니다')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkAdd = async () => {
    if (checkedBlogs.size === 0) return
    setBulkAdding(true)
    setBulkResult(null)
    setError(null)

    const blogsToAdd = Array.from(checkedBlogs)
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < blogsToAdd.length; i++) {
      const blogId = blogsToAdd[i]
      // Auto-assign time: +60min per subsequent blog from current selected time
      const autoTime = addMinutes(selectedTime, (i + 1) * 60)

      try {
        const res = await fetch('/api/monetize/scheduler/entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywordId: entry.keywordId,
            blogId,
            scheduledDate: selectedDate,
            scheduledTime: autoTime,
          }),
        })

        if (res.status === 404) {
          // Endpoint not yet available — treat as soft failure
          failCount++
          continue
        }

        const data = await res.json()
        if (!res.ok) {
          failCount++
        } else {
          successCount++
        }
      } catch {
        failCount++
      }
    }

    setBulkAdding(false)

    if (successCount > 0) {
      setBulkResult(`${successCount}개 블로그에 등록되었습니다.`)
      setCheckedBlogs(new Set())
      onSaved()
    }
    if (failCount > 0) {
      const msg = successCount > 0
        ? `(${failCount}개 실패)`
        : `${failCount}개 블로그 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.`
      setBulkResult((prev) => (prev ? `${prev} ${msg}` : msg))
    }
  }

  const isBusy = saving || deleting

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-gray-900">
              스케줄 수정
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-5 pt-4 pb-5 space-y-5">
          {/* Keyword display (readonly) */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
            {entry.keywordGrade && (
              <GradeBadge grade={entry.keywordGrade as Grade} size="sm" />
            )}
            <span className="text-sm font-medium text-gray-800 truncate">
              {entry.keyword ?? '(키워드 없음)'}
            </span>
            <span className="ml-auto text-xs text-gray-400 shrink-0">
              {entry.blogName}
            </span>
          </div>

          {/* Blog selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              블로그 변경
            </label>
            {blogsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>블로그 목록 로딩 중...</span>
              </div>
            ) : blogsError ? (
              <div className="flex items-center gap-2 text-sm text-red-500 py-2">
                <AlertCircle className="w-4 h-4" />
                <span>{blogsError}</span>
              </div>
            ) : (
              <select
                value={selectedBlogId}
                onChange={(e) => setSelectedBlogId(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {blogs.map((blog) => (
                  <option key={blog.id} value={blog.id}>
                    {blog.name}
                    {blog.language ? ` (${blog.language})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                날짜 변경
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                시간 변경
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={isBusy || blogsLoading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              저장
            </button>
            <button
              onClick={handleDelete}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              삭제
            </button>
            <button
              onClick={onClose}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              취소
            </button>
          </div>

          {/* Multi-blog section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setMultiOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            >
              <span>다른 블로그에도 등록</span>
              {multiOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {multiOpen && (
              <div className="px-4 py-3 space-y-3">
                {blogsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>블로그 목록 로딩 중...</span>
                  </div>
                ) : otherBlogs.length === 0 ? (
                  <p className="text-sm text-gray-400 py-1">
                    다른 블로그가 없습니다.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500">
                      선택한 블로그에 같은 키워드를 추가로 등록합니다. 시간은
                      현재 선택 시간 기준으로 60분씩 자동 배정됩니다.
                    </p>
                    <div className="space-y-2">
                      {otherBlogs.map((blog) => (
                        <label
                          key={blog.id}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={checkedBlogs.has(blog.id)}
                            onChange={() => handleToggleBlog(blog.id)}
                            disabled={bulkAdding}
                            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 disabled:opacity-50"
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">
                            {blog.name}
                            {blog.language ? (
                              <span className="ml-1 text-xs text-gray-400">
                                ({blog.language})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>

                    {bulkResult && (
                      <p className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                        {bulkResult}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleBulkAdd}
                      disabled={checkedBlogs.size === 0 || bulkAdding}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {bulkAdding && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      일괄 등록 {checkedBlogs.size > 0 && `(${checkedBlogs.size}개)`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
