'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Check, ExternalLink } from 'lucide-react'
import { applyStatsAction } from '@/lib/stats/actions'

interface Gem {
  postId: string
  title: string
  slug: string
  blogId: string
  blogSlug: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  suggestedTitles: string[]
}

interface HiddenGemsProps {
  gems: Gem[]
  loading: boolean
  onTitleChanged: () => void
  errors?: { source: string; message: string }[]
}

export function HiddenGems({ gems, loading, onTitleChanged, errors }: HiddenGemsProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  const aiKeyMissing = errors?.some(e => e.source === 'ai' && e.message.includes('AI API 키'))

  if (gems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>이번 주 발견된 숨은 보석이 없습니다.</p>
        <p className="text-xs mt-1">노출 ≥ 1,000 + CTR &lt; 2%인 글이 후보가 됩니다.</p>
      </div>
    )
  }

  const handleApplyTitle = async (gem: Gem, newTitle: string) => {
    setPendingId(gem.postId)
    const result = await applyStatsAction('change_title', {
      postId: gem.postId,
      newTitle,
    })
    setPendingId(null)
    if (result.ok) {
      setAppliedIds(prev => new Set(prev).add(gem.postId))
      onTitleChanged()
    }
  }

  return (
    <div className="space-y-3">
      {aiKeyMissing && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          AI API 키가 등록되지 않아 제안 제목이 비어 있습니다. 설정 &gt; AI에서 키를 등록해주세요.
        </div>
      )}

      {gems.map(gem => {
        const applied = appliedIds.has(gem.postId)
        const productionUrl = `/blog/${gem.blogSlug}/${gem.slug}`
        return (
          <Card key={gem.postId}>
            <CardContent className="p-4 space-y-3">
              {/* 헤더 */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={productionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-900 hover:text-blue-600 inline-flex items-center gap-1 truncate"
                  >
                    {gem.title}
                    <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-400" />
                  </a>
                </div>
                <div className="flex gap-3 text-xs text-gray-500 flex-shrink-0">
                  <span>노출 <strong className="text-gray-700">{gem.impressions.toLocaleString()}</strong></span>
                  <span>CTR <strong className="text-red-600">{(gem.ctr * 100).toFixed(2)}%</strong></span>
                  <span>순위 <strong>{gem.position.toFixed(1)}</strong></span>
                </div>
              </div>

              {/* 제안 제목 */}
              {gem.suggestedTitles.length > 0 ? (
                <div className="space-y-1.5">
                  {gem.suggestedTitles.map((title, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <span className="text-[10px] text-gray-400 w-4 flex-shrink-0">{idx + 1}.</span>
                      <span className="text-sm text-gray-700 flex-1 min-w-0">{title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyTitle(gem, title)}
                        disabled={pendingId === gem.postId || applied}
                        className="text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {applied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />적용됨
                          </>
                        ) : (
                          '제목 변경'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">AI 제안 제목 없음</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
