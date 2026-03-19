'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { KeywordResultCard } from '@/components/monetize/keywords/KeywordResultCard'
import { Loader2, Sun } from 'lucide-react'
import type { Keyword } from '@/types/monetize'

const MONTHS = [
  { value: 1, label: '1월' },
  { value: 2, label: '2월' },
  { value: 3, label: '3월' },
  { value: 4, label: '4월' },
  { value: 5, label: '5월' },
  { value: 6, label: '6월' },
  { value: 7, label: '7월' },
  { value: 8, label: '8월' },
  { value: 9, label: '9월' },
  { value: 10, label: '10월' },
  { value: 11, label: '11월' },
  { value: 12, label: '12월' },
]

export function SeasonKeywordPanel() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const fetchKeywords = async () => {
    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        month: month.toString(),
      })
      const res = await fetch(`/api/monetize/keywords/seasonal?${params}`)

      if (!res.ok) {
        throw new Error('시즌 키워드 조회에 실패했습니다.')
      }

      const data = await res.json()
      setKeywords(data.keywords || [])

      if (data.keywords?.length === 0) {
        setError('해당 월의 시즌 키워드가 없습니다.')
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
        <div className="space-y-2">
          <label htmlFor="month-select" className="text-sm font-medium text-gray-900">
            월 선택
          </label>
          <select
            id="month-select"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={loading} className="w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sun className="w-4 h-4" />}
          {loading ? '조회 중...' : '시즌 키워드 조회'}
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
          <p className="text-sm text-gray-600">시즌 키워드를 조회 중입니다...</p>
        </div>
      )}

      {hasSearched && keywords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{keywords.length}</span>개의 시즌 키워드를 찾았습니다.
            </p>
            <span className="text-xs text-gray-500">
              {MONTHS.find(m => m.value === month)?.label}
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
          <Sun className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">해당 월의 시즌 키워드가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
