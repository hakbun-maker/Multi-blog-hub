'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { KeywordResultCard } from '@/components/monetize/keywords/KeywordResultCard'
import { Loader2, Search } from 'lucide-react'
import type { Keyword } from '@/types/monetize'

const MIN_SCORE_OPTIONS = [
  { label: '모든 키워드', value: 0 },
  { label: '45점 이상', value: 45 },
  { label: '60점 이상', value: 60 },
  { label: '75점 이상', value: 75 },
  { label: '90점 이상', value: 90 },
]

export function GoldKeywordPanel() {
  const [query, setQuery] = useState('')
  const [minScore, setMinScore] = useState(60)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const fetchKeywords = useCallback(async () => {
    if (!query.trim()) {
      setError('검색어를 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        minScore: minScore.toString(),
      })
      const res = await fetch(`/api/monetize/keywords/gold?${params}`)

      if (!res.ok) {
        throw new Error('키워드 검색에 실패했습니다.')
      }

      const data = await res.json()
      setKeywords(data.keywords || [])

      if (data.keywords?.length === 0) {
        setError('검색 결과가 없습니다. 다른 검색어를 시도해보세요.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      setKeywords([])
    } finally {
      setLoading(false)
    }
  }, [query, minScore])

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
          <label htmlFor="gold-search" className="text-sm font-medium text-gray-900">
            검색어
          </label>
          <div className="flex gap-2">
            <Input
              id="gold-search"
              placeholder="검색할 키워드를 입력하세요 (예: 카메라, 노트북)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? '검색 중...' : '검색'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="min-score" className="text-sm font-medium text-gray-900">
            최소 수익 점수
          </label>
          <select
            id="min-score"
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {MIN_SCORE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
          <p className="text-sm text-gray-600">키워드를 검색 중입니다...</p>
        </div>
      )}

      {hasSearched && keywords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{keywords.length}</span>개의 키워드를 찾았습니다.
            </p>
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
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
