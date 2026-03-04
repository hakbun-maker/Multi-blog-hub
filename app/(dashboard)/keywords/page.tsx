'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Search, Plus, TrendingUp, BarChart2, Loader2, CheckCircle } from 'lucide-react'

interface KeywordResult {
  keyword: string
  searchVolume: number
  competition: 'low' | 'medium' | 'high'
  relatedKeywords: string[]
}

const COMPETITION_COLOR: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const COMPETITION_LABEL: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
}

export default function KeywordsPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<KeywordResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set())
  const [addingPool, setAddingPool] = useState<string | null>(null)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/keywords/search?q=${encodeURIComponent(query.trim())}`)
      const json = await res.json()
      if (json.data) setResult(json.data)
    } finally {
      setLoading(false)
    }
  }, [query])

  async function addToPool(keyword: string) {
    setAddingPool(keyword)
    try {
      const res = await fetch('/api/keywords/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [keyword] }),
      })
      if (res.ok) {
        setAddedKeywords(prev => { const s = new Set(prev); s.add(keyword); return s })
      }
    } finally {
      setAddingPool(null)
    }
  }

  function volumeBar(volume: number) {
    const max = 10000
    const pct = Math.min((volume / max) * 100, 100)
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{volume.toLocaleString()}</span>
      </div>
    )
  }

  const TRENDING_KEYWORDS = [
    '강아지 사료 추천', '다이어트 방법', '재테크 방법', 'ChatGPT 활용법',
    '넷플릭스 신작', '건강기능식품 추천', '주식 투자 초보', '인테리어 DIY',
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">키워드 탐색기</h1>
        <p className="text-muted-foreground text-sm">SEO 키워드를 분석하고 풀에 추가합니다</p>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="키워드를 입력하세요 (예: 강아지 사료 추천)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
            </div>
            <Button onClick={search} disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">분석</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 키워드 분석 결과 */}
        <div className="md:col-span-2 space-y-4">
          {loading && (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">키워드 분석 중...</p>
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <>
              {/* 메인 키워드 카드 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> 키워드 분석
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xl font-bold">{result.keyword}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          <BarChart2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">검색량</span>
                          {volumeBar(result.searchVolume)}
                        </div>
                        <Badge className={COMPETITION_COLOR[result.competition] ?? ''} variant="outline">
                          경쟁도 {COMPETITION_LABEL[result.competition] ?? result.competition}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={addedKeywords.has(result.keyword) ? 'secondary' : 'default'}
                      onClick={() => addToPool(result.keyword)}
                      disabled={addingPool === result.keyword || addedKeywords.has(result.keyword)}
                    >
                      {addedKeywords.has(result.keyword) ? (
                        <><CheckCircle className="h-3.5 w-3.5 mr-1 text-green-500" /> 추가됨</>
                      ) : addingPool === result.keyword ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><Plus className="h-3.5 w-3.5 mr-1" /> 풀에 추가</>
                      )}
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-3">연관 키워드</p>
                    <div className="space-y-2">
                      {result.relatedKeywords.map(kw => (
                        <div key={kw} className="flex items-center justify-between py-1.5 px-3 bg-muted/50 rounded-lg">
                          <span className="text-sm">{kw}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => addToPool(kw)}
                            disabled={addingPool === kw || addedKeywords.has(kw)}
                          >
                            {addedKeywords.has(kw) ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            ) : addingPool === kw ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <><Plus className="h-3 w-3 mr-0.5" /> 추가</>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!result && !loading && (
            <Card>
              <CardContent className="py-16 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">키워드를 입력하고 분석 버튼을 누르세요</p>
                <p className="text-sm text-muted-foreground mt-1">검색량, 경쟁도, 연관 키워드를 확인할 수 있습니다</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 트렌딩 키워드 */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" /> 트렌딩 키워드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TRENDING_KEYWORDS.map((kw, i) => (
                  <button
                    key={kw}
                    onClick={() => { setQuery(kw); }}
                    className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-muted text-left transition-colors group"
                  >
                    <span className={`text-xs font-bold w-5 ${i < 3 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm flex-1 group-hover:text-primary">{kw}</span>
                    <Search className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">* 예시 데이터 (실제 SEO API 연동 예정)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
