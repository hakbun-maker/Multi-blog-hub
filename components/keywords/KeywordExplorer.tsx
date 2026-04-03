'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Search, Loader2, Sparkles, Settings2, TrendingUp, BarChart2,
  PenSquare, CalendarPlus, Download, CheckSquare, Square, ChevronDown,
  Flame, Flower2, SortDesc,
} from 'lucide-react'
import { GradeBadge } from '@/components/monetize/shared/GradeBadge'
import { RevenueScoreBar } from '@/components/monetize/shared/RevenueScoreBar'
import { KeywordResultCard } from '@/components/monetize/keywords/KeywordResultCard'
import { AutoDiscoveryToggle } from '@/components/keywords/AutoDiscoveryToggle'
import { ApiKeyQuickSetup } from '@/components/keywords/ApiKeyQuickSetup'
import { EventDiscoveryPanel } from '@/components/keywords/EventDiscoveryPanel'
import { KeywordTrendChart, generateMockTrendData } from '@/components/keywords/KeywordTrendChart'
import type { Keyword, Grade, IntentType, KeywordType } from '@/types/monetize'

// ─── Constants ───────────────────────────────────────────────────────────────

const INTENT_COLORS: Record<string, string> = {
  AD: 'bg-red-100 text-red-700 border-red-200',
  REVIEW: 'bg-blue-100 text-blue-700 border-blue-200',
  INFO: 'bg-green-100 text-green-700 border-green-200',
  CRITIC: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPARE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  TREND: 'bg-pink-100 text-pink-700 border-pink-200',
}

const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  all: { label: '전체', emoji: '' },
  gold: { label: '골드', emoji: '💰' },
  event: { label: '이벤트', emoji: '🎯' },
  seasonal: { label: '시즌', emoji: '🌸' },
}

const GRADE_LIST: Grade[] = ['S', 'A', 'B', 'C', 'D']
const INTENT_LIST: IntentType[] = ['AD', 'REVIEW', 'INFO', 'COMPARE', 'TREND', 'CRITIC']

type SortOption = 'score' | 'volume' | 'cpc' | 'trend'

// ─── Main Component ──────────────────────────────────────────────────────────

export function KeywordExplorer() {
  const router = useRouter()

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Keyword[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Pool state
  const [poolKeywords, setPoolKeywords] = useState<Keyword[]>([])
  const [poolLoading, setPoolLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filters
  const [typeFilter, setTypeFilter] = useState<KeywordType | 'all'>('all')
  const [gradeFilter, setGradeFilter] = useState<Grade | 'all'>('all')
  const [intentFilter, setIntentFilter] = useState<IntentType | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('score')

  // Settings
  const [autoDiscover, setAutoDiscover] = useState(false)
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Season recommendations
  const [seasonKeywords, setSeasonKeywords] = useState<Keyword[]>([])

  // Trend chart
  const [trendData, setTrendData] = useState<{ month: string; volume: number }[]>([])
  const [trendKeyword, setTrendKeyword] = useState('')

  // ─── Load settings + pool on mount ───────────────────────────────────────

  useEffect(() => {
    // Load settings
    fetch('/api/keywords/settings')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setAutoDiscover(json.data.auto_discover ?? false)
        }
        setSettingsLoaded(true)
      })
      .catch(() => setSettingsLoaded(true))

    // Load pool
    loadPool()

    // Load seasonal recommendations
    const month = new Date().getMonth() + 1
    fetch(`/api/monetize/keywords/seasonal?month=${month}&minScore=45&limit=10`)
      .then(r => r.json())
      .then(json => setSeasonKeywords(json.keywords ?? []))
      .catch(() => {})
  }, [])

  const loadPool = useCallback(() => {
    setPoolLoading(true)
    fetch('/api/keywords/pool')
      .then(r => r.json())
      .then(json => setPoolKeywords(json.data ?? []))
      .catch(() => {})
      .finally(() => setPoolLoading(false))
  }, [])

  // ─── Search ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearchLoading(true)
    setHasSearched(true)
    try {
      const params = new URLSearchParams({ q: query.trim(), minScore: '0', limit: '30' })
      const res = await fetch(`/api/monetize/keywords/gold?${params}`)
      const json = await res.json()
      const keywords: Keyword[] = json.keywords ?? []
      setSearchResults(keywords)

      // Generate trend data for first result
      if (keywords.length > 0) {
        const first = keywords[0]
        setTrendData(generateMockTrendData(first.monthlySearchVolume))
        setTrendKeyword(first.keyword)
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [query])

  const handleAIExpand = useCallback(async () => {
    if (!query.trim()) return
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/ai/analyze-keywords?keyword=${encodeURIComponent(query.trim())}`)
      const json = await res.json()
      if (json.data?.relatedKeywords) {
        // Convert related keywords to search
        const params = new URLSearchParams({ q: json.data.relatedKeywords.join(','), minScore: '0', limit: '30' })
        const searchRes = await fetch(`/api/monetize/keywords/gold?${params}`)
        const searchJson = await searchRes.json()
        setSearchResults(prev => {
          const existing = new Set(prev.map(k => k.keyword))
          const newOnes = (searchJson.keywords ?? []).filter((k: Keyword) => !existing.has(k.keyword))
          return [...prev, ...newOnes]
        })
        setHasSearched(true)
      }
    } catch {
      // AI expand is best-effort
    } finally {
      setSearchLoading(false)
    }
  }, [query])

  // ─── Pool actions ────────────────────────────────────────────────────────

  const addToPool = useCallback(async (keyword: string) => {
    try {
      await fetch('/api/keywords/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [keyword] }),
      })
      loadPool()
    } catch { /* ignore */ }
  }, [loadPool])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPool.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPool.map(k => k.id)))
    }
  }

  const handleBulkWrite = () => {
    const selected = poolKeywords.filter(k => selectedIds.has(k.id))
    if (selected.length === 0) return
    const kws = selected.map(k => k.keyword).join(',')
    router.push(`/editor/new?keyword=${encodeURIComponent(kws)}`)
  }

  const handleExportCSV = () => {
    const data = poolKeywords.map(k =>
      `${k.keyword},${k.keywordGrade},${k.intentType ?? ''},${k.revenueScore},${k.monthlySearchVolume},${k.cpcEstimate},${k.competitionScore}`
    )
    const csv = ['키워드,등급,Intent,수익점수,월간검색량,CPC,경쟁도', ...data].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keywords_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Filtering ───────────────────────────────────────────────────────────

  const applyFilters = (list: Keyword[]) => {
    let filtered = list
    if (typeFilter !== 'all') filtered = filtered.filter(k => k.keywordType === typeFilter)
    if (gradeFilter !== 'all') filtered = filtered.filter(k => k.keywordGrade === gradeFilter)
    if (intentFilter !== 'all') filtered = filtered.filter(k => k.intentType === intentFilter)

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score': return b.revenueScore - a.revenueScore
        case 'volume': return b.monthlySearchVolume - a.monthlySearchVolume
        case 'cpc': return b.cpcEstimate - a.cpcEstimate
        case 'trend': return b.trendIndex - a.trendIndex
        default: return 0
      }
    })
    return filtered
  }

  const filteredResults = applyFilters(searchResults)
  const filteredPool = applyFilters(poolKeywords)

  // ─── Event keyword to search ─────────────────────────────────────────────

  const handleEventKeywordSelect = (keyword: string) => {
    setQuery(keyword)
    // Auto-search after short delay
    setTimeout(() => {
      setSearchLoading(true)
      setHasSearched(true)
      const params = new URLSearchParams({ q: keyword, minScore: '0', limit: '30' })
      fetch(`/api/monetize/keywords/gold?${params}`)
        .then(r => r.json())
        .then(json => {
          setSearchResults(json.keywords ?? [])
          if (json.keywords?.length > 0) {
            setTrendData(generateMockTrendData(json.keywords[0].monthlySearchVolume))
            setTrendKeyword(json.keywords[0].keyword)
          }
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false))
    }, 100)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">키워드 탐색기</h1>
          <p className="text-sm text-gray-500 mt-0.5">수익성 높은 키워드를 발굴하고 콘텐츠를 계획하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {settingsLoaded && (
            <AutoDiscoveryToggle enabled={autoDiscover} onToggle={setAutoDiscover} />
          )}
          <Button variant="outline" size="sm" onClick={() => setShowApiKeyDialog(true)} className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">API 키 설정</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9 h-10"
                placeholder="키워드를 입력하세요 (예: 강아지 사료 추천, 노트북 비교)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleAIExpand} variant="outline" disabled={searchLoading || !query.trim()} className="gap-1.5 whitespace-nowrap">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI 확장</span>
            </Button>
            <Button onClick={handleSearch} disabled={searchLoading || !query.trim()} className="gap-1.5 bg-orange-500 hover:bg-orange-600">
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">분석</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {/* Type filters */}
        <div className="flex gap-1">
          {(Object.keys(TYPE_CONFIG) as (KeywordType | 'all')[]).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {TYPE_CONFIG[type].emoji} {TYPE_CONFIG[type].label}
            </button>
          ))}
        </div>
        <Separator orientation="vertical" className="h-6 self-center" />
        {/* Grade filters */}
        <div className="flex gap-1">
          {GRADE_LIST.map(grade => (
            <button
              key={grade}
              onClick={() => setGradeFilter(gradeFilter === grade ? 'all' : grade)}
              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                gradeFilter === grade
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
        <Separator orientation="vertical" className="h-6 self-center hidden sm:block" />
        {/* Intent filters */}
        <div className="flex gap-1 flex-wrap">
          {INTENT_LIST.map(intent => (
            <button
              key={intent}
              onClick={() => setIntentFilter(intentFilter === intent ? 'all' : intent)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                intentFilter === intent
                  ? INTENT_COLORS[intent] + ' border'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {intent}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Left: Keyword Pool */}
        <div className="order-2 lg:order-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">내 키워드 풀</CardTitle>
                <span className="text-xs text-gray-400">{filteredPool.length}개</span>
              </div>
              {/* Sort */}
              <div className="flex items-center gap-1 mt-2">
                <SortDesc className="w-3 h-3 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="text-xs bg-transparent text-gray-500 border-0 p-0 focus:ring-0"
                >
                  <option value="score">점수순</option>
                  <option value="volume">검색량순</option>
                  <option value="cpc">CPC순</option>
                  <option value="trend">트렌드순</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
              {poolLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}

              {!poolLoading && filteredPool.length === 0 && (
                <div className="text-center py-6">
                  <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">키워드를 검색하고 풀에 추가하세요</p>
                </div>
              )}

              {/* Select all */}
              {filteredPool.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 rounded"
                >
                  {selectedIds.size === filteredPool.length
                    ? <CheckSquare className="w-3.5 h-3.5 text-orange-500" />
                    : <Square className="w-3.5 h-3.5" />
                  }
                  전체 선택 ({selectedIds.size}/{filteredPool.length})
                </button>
              )}

              {filteredPool.map(kw => (
                <button
                  key={kw.id}
                  onClick={() => toggleSelect(kw.id)}
                  className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-left transition-colors ${
                    selectedIds.has(kw.id) ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {selectedIds.has(kw.id)
                    ? <CheckSquare className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    : <Square className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{kw.keyword}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <GradeBadge grade={kw.keywordGrade} size="sm" />
                      {kw.intentType && (
                        <span className={`text-[9px] px-1 py-0.5 rounded ${INTENT_COLORS[kw.intentType] ?? 'bg-gray-100 text-gray-500'}`}>
                          {kw.intentType}
                        </span>
                      )}
                      <span className="text-[9px] text-gray-400">{Math.round(kw.revenueScore)}점</span>
                    </div>
                  </div>
                </button>
              ))}

              {/* Bulk actions */}
              {selectedIds.size > 0 && (
                <div className="sticky bottom-0 bg-white pt-2 border-t space-y-1.5">
                  <p className="text-[10px] text-gray-500 text-center">{selectedIds.size}개 선택됨</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button size="sm" onClick={handleBulkWrite} className="h-7 text-xs bg-orange-500 hover:bg-orange-600 gap-1">
                      <PenSquare className="w-3 h-3" />
                      글쓰기
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-7 text-xs gap-1">
                      <Download className="w-3 h-3" />
                      CSV
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Search Results */}
        <div className="order-1 lg:order-2 space-y-5">
          {/* Loading */}
          {searchLoading && (
            <Card>
              <CardContent className="py-14 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm text-gray-500">키워드를 분석하는 중...</p>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!hasSearched && !searchLoading && (
            <Card>
              <CardContent className="py-14 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">키워드를 입력하고 분석 버튼을 누르세요</p>
                <p className="text-sm text-gray-400 mt-1">검색량, CPC, 경쟁도, 수익 점수, Intent를 종합 분석합니다</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {hasSearched && !searchLoading && (
            <>
              {filteredResults.length > 0 && (
                <>
                  {/* Stats summary */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">{filteredResults.length}</span>개 키워드 발견
                    </p>
                    <div className="flex gap-2 text-xs text-gray-400">
                      {['S', 'A', 'B'].map(g => {
                        const count = filteredResults.filter(k => k.keywordGrade === g).length
                        if (count === 0) return null
                        return <span key={g}>{g}등급 {count}개</span>
                      })}
                    </div>
                  </div>

                  {/* Trend chart for top keyword */}
                  {trendData.length > 0 && (
                    <Card>
                      <CardHeader className="pb-1">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                          &ldquo;{trendKeyword}&rdquo; 검색 트렌드
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <KeywordTrendChart data={trendData} keyword={trendKeyword} />
                      </CardContent>
                    </Card>
                  )}

                  {/* Result cards */}
                  <div className="grid gap-4">
                    {filteredResults.map(keyword => (
                      <div key={keyword.id} className="relative">
                        <KeywordResultCard keyword={keyword} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-3 right-24 h-7 text-xs text-gray-500 hover:text-orange-600 gap-1"
                          onClick={() => addToPool(keyword.keyword)}
                        >
                          + 풀 추가
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {filteredResults.length === 0 && (
                <Card>
                  <CardContent className="py-14 text-center">
                    <Search className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-500 text-sm">검색 결과가 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">다른 키워드로 시도하거나, AI 확장을 사용해보세요</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Event Discovery */}
      <EventDiscoveryPanel onKeywordSelect={handleEventKeywordSelect} />

      {/* Bottom Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Trending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              트렌딩 키워드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendingKeywordList onSelect={handleEventKeywordSelect} />
          </CardContent>
        </Card>

        {/* Seasonal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flower2 className="w-4 h-4 text-pink-500" />
              이번 달 시즌 키워드
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seasonKeywords.length > 0 ? (
              <div className="space-y-1.5">
                {seasonKeywords.slice(0, 8).map((kw, i) => (
                  <button
                    key={kw.id}
                    onClick={() => handleEventKeywordSelect(kw.keyword)}
                    className="flex items-center gap-2.5 w-full py-1.5 px-2 rounded-lg hover:bg-orange-50 text-left transition-colors group"
                  >
                    <span className={`text-xs font-bold w-4 ${i < 3 ? 'text-orange-500' : 'text-gray-400'}`}>{i + 1}</span>
                    <span className="text-sm flex-1 group-hover:text-orange-700">{kw.keyword}</span>
                    <GradeBadge grade={kw.keywordGrade} size="sm" />
                    <span className="text-[10px] text-gray-400">{Math.round(kw.revenueScore)}점</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">시즌 키워드를 불러오는 중...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Key Dialog */}
      <ApiKeyQuickSetup open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog} />
    </div>
  )
}

// ─── Trending Keywords Sub-Component ─────────────────────────────────────────

function TrendingKeywordList({ onSelect }: { onSelect: (kw: string) => void }) {
  const [keywords, setKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/keywords/trending')
      .then(r => r.json())
      .then(json => setKeywords(json.data ?? []))
      .catch(() => {
        // Fallback with common trending topics
        setKeywords([
          'AI 활용법', '건강검진 비용', '여름 여행지 추천',
          '주식 투자 초보', '에어컨 추천', '다이어트 식단',
          '넷플릭스 신작', '부동산 전망',
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {keywords.slice(0, 8).map((kw, i) => (
        <button
          key={kw}
          onClick={() => onSelect(kw)}
          className="flex items-center gap-2.5 w-full py-1.5 px-2 rounded-lg hover:bg-orange-50 text-left transition-colors group"
        >
          <span className={`text-xs font-bold w-4 ${i < 3 ? 'text-red-500' : 'text-gray-400'}`}>{i + 1}</span>
          <span className="text-sm flex-1 group-hover:text-orange-700">{kw}</span>
          <Search className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  )
}
