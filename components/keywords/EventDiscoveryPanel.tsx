'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Music, Trophy, PartyPopper, Palette, Calendar, Tag, PenSquare, RefreshCw, AlertCircle } from 'lucide-react'

interface ExternalEvent {
  title: string
  date: string | null
  venue?: string
  category: 'concert' | 'sports' | 'festival' | 'exhibition' | 'other'
  source: string
  keywords: string[]
  dDay: number | null
  url?: string
}

type EventCategory = 'all' | 'concert' | 'sports' | 'festival' | 'exhibition'

const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: '전체', icon: <Calendar className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-700' },
  concert: { label: '공연', icon: <Music className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700' },
  sports: { label: '경기', icon: <Trophy className="w-3.5 h-3.5" />, color: 'bg-green-100 text-green-700' },
  festival: { label: '축제', icon: <PartyPopper className="w-3.5 h-3.5" />, color: 'bg-pink-100 text-pink-700' },
  exhibition: { label: '전시', icon: <Palette className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700' },
}

const SOURCE_LABELS: Record<string, string> = {
  interpark: '인터파크',
  yes24: 'YES24',
  melon: '멜론티켓',
  google_trends: 'Google',
  sports_kbo: 'KBO',
  sports_kleague: 'K리그',
  naver_news: '네이버뉴스',
}

interface EventDiscoveryPanelProps {
  onKeywordSelect?: (keyword: string) => void
}

export function EventDiscoveryPanel({ onKeywordSelect }: EventDiscoveryPanelProps) {
  const [events, setEvents] = useState<ExternalEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<EventCategory>('all')
  const [hasFetched, setHasFetched] = useState(false)

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/keywords/discover-events')
      if (!res.ok) throw new Error('이벤트를 불러올 수 없습니다.')
      const json = await res.json()
      setEvents(json.data?.events ?? [])
      setHasFetched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [])

  const filteredEvents = activeCategory === 'all'
    ? events
    : events.filter(e => e.category === activeCategory)

  const categoryCounts: Record<string, number> = {
    all: events.length,
    concert: events.filter(e => e.category === 'concert').length,
    sports: events.filter(e => e.category === 'sports').length,
    festival: events.filter(e => e.category === 'festival').length,
    exhibition: events.filter(e => e.category === 'exhibition').length,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            이벤트 키워드 발굴
            <span className="text-xs text-gray-400 font-normal">공연 / 경기 / 축제 / 전시</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchEvents} disabled={loading} className="gap-1 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map(cat => {
            const config = CATEGORY_CONFIG[cat]
            const count = categoryCounts[cat] ?? 0
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {config.icon}
                {config.label}
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {loading && !hasFetched && (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
            <p className="text-sm text-gray-500">이벤트를 수집하는 중...</p>
            <p className="text-xs text-gray-400 mt-1">인터파크, YES24, 멜론, KBO, Google Trends에서 수집합니다</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p>{error}</p>
              <p className="text-xs text-red-500 mt-1">네이버 검색 API 키가 등록되어 있는지 확인해주세요.</p>
            </div>
          </div>
        )}

        {hasFetched && !loading && filteredEvents.length === 0 && !error && (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {events.length === 0
                ? '수집된 이벤트가 없습니다. 네이버 검색 API 키를 등록해주세요.'
                : '해당 카테고리의 이벤트가 없습니다.'}
            </p>
          </div>
        )}

        {filteredEvents.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.slice(0, 12).map((event, idx) => (
              <EventCard
                key={`${event.title}-${idx}`}
                event={event}
                onKeywordSelect={onKeywordSelect}
              />
            ))}
          </div>
        )}

        {filteredEvents.length > 12 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            + {filteredEvents.length - 12}개 더 있음
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function EventCard({
  event,
  onKeywordSelect,
}: {
  event: ExternalEvent
  onKeywordSelect?: (keyword: string) => void
}) {
  const categoryConfig = CATEGORY_CONFIG[event.category as EventCategory] ?? CATEGORY_CONFIG.all

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-orange-200 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
          {event.title}
        </h4>
        {event.dDay !== null && (
          <Badge
            variant="outline"
            className={`whitespace-nowrap text-[10px] ${
              event.dDay <= 7 ? 'border-red-300 text-red-600 bg-red-50' :
              event.dDay <= 14 ? 'border-orange-300 text-orange-600 bg-orange-50' :
              'border-blue-300 text-blue-600 bg-blue-50'
            }`}
          >
            D{event.dDay > 0 ? `-${event.dDay}` : event.dDay === 0 ? '-Day' : `+${Math.abs(event.dDay)}`}
          </Badge>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className={`text-[10px] ${categoryConfig.color}`}>
          {categoryConfig.icon}
          <span className="ml-1">{categoryConfig.label}</span>
        </Badge>
        <span className="text-[10px] text-gray-400">
          {SOURCE_LABELS[event.source] ?? event.source}
        </span>
        {event.date && (
          <span className="text-[10px] text-gray-400">{event.date}</span>
        )}
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1 mb-2">
        {event.keywords.slice(0, 4).map(kw => (
          <button
            key={kw}
            onClick={() => onKeywordSelect?.(kw)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-700 rounded text-[10px] transition-colors"
          >
            <Tag className="w-2.5 h-2.5" />
            {kw.length > 15 ? kw.slice(0, 15) + '...' : kw}
          </button>
        ))}
        {event.keywords.length > 4 && (
          <span className="text-[10px] text-gray-400 self-center">+{event.keywords.length - 4}</span>
        )}
      </div>

      {/* Action */}
      <Button
        size="sm"
        variant="ghost"
        className="w-full h-7 text-xs text-orange-600 hover:bg-orange-50 gap-1"
        onClick={() => onKeywordSelect?.(event.keywords[0] ?? event.title)}
      >
        <PenSquare className="w-3 h-3" />
        이 키워드로 분석
      </Button>
    </div>
  )
}
