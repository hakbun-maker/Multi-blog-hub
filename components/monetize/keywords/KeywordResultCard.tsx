'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import { RevenueScoreBar } from '@/components/monetize/shared/RevenueScoreBar'
import type { Keyword } from '@/types/monetize'
import { TrendingUp, CalendarCheck, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface BlogOption {
  id: string
  name: string
}

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

const TIME_OPTIONS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00',
]

function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

function getMaxDate(): string {
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  return maxDate.toISOString().split('T')[0]
}

export function KeywordResultCard({ keyword, onRegister }: KeywordResultCardProps) {
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [blogs, setBlogs] = useState<BlogOption[]>([])
  const [blogsLoading, setBlogsLoading] = useState(false)
  const [selectedBlogId, setSelectedBlogId] = useState('')
  const [scheduledDate, setScheduledDate] = useState(getTomorrowDate())
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    if (!showRegisterForm || blogs.length > 0) return

    setBlogsLoading(true)
    fetch('/api/blogs')
      .then(res => res.json())
      .then(json => {
        const blogList: BlogOption[] = (json.data || []).map((b: { id: string; name: string }) => ({
          id: b.id,
          name: b.name,
        }))
        setBlogs(blogList)
        if (blogList.length > 0) {
          setSelectedBlogId(blogList[0].id)
        }
      })
      .catch(() => {
        setFormError('블로그 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        setBlogsLoading(false)
      })
  }, [showRegisterForm, blogs.length])

  const handleToggleForm = () => {
    setShowRegisterForm(prev => !prev)
    setFormError(null)
  }

  const handleSubmit = async () => {
    if (!selectedBlogId) {
      setFormError('블로그를 선택해주세요.')
      return
    }
    if (!scheduledDate) {
      setFormError('날짜를 선택해주세요.')
      return
    }
    if (!scheduledTime) {
      setFormError('시간을 선택해주세요.')
      return
    }

    setFormLoading(true)
    setFormError(null)

    try {
      const res = await fetch('/api/monetize/keywords/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordId: keyword.id,
          blogId: selectedBlogId,
          scheduledDate,
          scheduledTime,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || '등록에 실패했습니다.')
        return
      }

      setIsRegistered(true)
      setShowRegisterForm(false)
      if (onRegister) {
        onRegister(keyword.id)
      }
    } catch {
      setFormError('네트워크 오류가 발생했습니다.')
    } finally {
      setFormLoading(false)
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
        {isRegistered ? (
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium whitespace-nowrap px-3 py-2">
            <CalendarCheck className="w-4 h-4" />
            <span>등록됨</span>
          </div>
        ) : (
          <Button
            onClick={handleToggleForm}
            variant="outline"
            className="text-orange-600 border-orange-200 hover:bg-orange-50 whitespace-nowrap gap-1"
          >
            달력 등록
            {showRegisterForm
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />
            }
          </Button>
        )}
      </div>

      {showRegisterForm && !isRegistered && (
        <div className="mt-3 mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-orange-800">달력 등록 설정</p>

          {/* Blog select */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">블로그 선택</label>
            {blogsLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                블로그 목록 로딩 중...
              </div>
            ) : blogs.length === 0 ? (
              <p className="text-xs text-red-600">등록된 블로그가 없습니다.</p>
            ) : (
              <select
                value={selectedBlogId}
                onChange={e => setSelectedBlogId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                {blogs.map(blog => (
                  <option key={blog.id} value={blog.id}>
                    {blog.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date select */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">날짜 선택</label>
            <input
              type="date"
              value={scheduledDate}
              min={getTomorrowDate()}
              max={getMaxDate()}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Time select */}
          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">시간 선택</label>
            <select
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Error message */}
          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {formError}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSubmit}
              disabled={formLoading || blogsLoading || blogs.length === 0}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  등록 중...
                </>
              ) : (
                '등록'
              )}
            </Button>
            <Button
              onClick={() => {
                setShowRegisterForm(false)
                setFormError(null)
              }}
              disabled={formLoading}
              size="sm"
              variant="ghost"
              className="text-gray-600"
            >
              취소
            </Button>
          </div>
        </div>
      )}

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
