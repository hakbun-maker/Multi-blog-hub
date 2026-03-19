'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeywordResultCard } from '@/components/monetize/keywords/KeywordResultCard'
import { Loader2, Calendar } from 'lucide-react'
import type { Keyword } from '@/types/monetize'

export function EventKeywordPanel() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())

    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    setStartDate(formatDate(today))
    setEndDate(formatDate(nextMonth))
  }, [])

  const fetchKeywords = async () => {
    if (!startDate || !endDate) {
      setError('시작 날짜와 종료 날짜를 입력해주세요.')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('시작 날짜가 종료 날짜보다 클 수 없습니다.')
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      })
      const res = await fetch(`/api/monetize/keywords/events?${params}`)

      if (!res.ok) {
        throw new Error('이벤트 키워드 조회에 실패했습니다.')
      }

      const data = await res.json()
      setKeywords(data.keywords || [])

      if (data.keywords?.length === 0) {
        setError('해당 기간의 이벤트 키워드가 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setKeywords([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchKeywords()
  }

  const handleRegister = (keywordId: string) => {
    setKeywords(keywords.filter(k => k.id !== keywordId))
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="space-y-4 bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="start-date" className="text-sm font-medium text-gray-900">
              시작 날짜
            </label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="end-date" className="text-sm font-medium text-gray-900">
              종료 날짜
            </label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          {loading ? '조회 중...' : '이벤트 키워드 조회'}
        </Button>
      </form>

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
          <p className="text-sm text-gray-600">이벤트 키워드를 조회 중입니다...</p>
        </div>
      )}

      {hasSearched && keywords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{keywords.length}</span>개의 이벤트 키워드를 찾았습니다.
            </p>
            <span className="text-xs text-gray-500">
              {startDate} ~ {endDate}
            </span>
          </div>
          <div className="grid gap-4">
            {keywords.map(keyword => (
              <KeywordResultCard
                key={keyword.id}
                keyword={keyword}
                onRegister={handleRegister}
              />
            ))}
          </div>
        </div>
      )}

      {hasSearched && keywords.length === 0 && !error && !loading && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">해당 기간에 이벤트 키워드가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
