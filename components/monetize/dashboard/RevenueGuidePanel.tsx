'use client'

import { useState } from 'react'
import type { BlogLanguage } from '@/types/monetize'
import type { RevenueGuideResult } from '@/lib/monetize/engines/revenue-calculator'
import { ChevronDown, Download, TrendingUp } from 'lucide-react'

interface RevenuGuidePanelProps {
  blogCount: number
  language: BlogLanguage
  primaryCategory: string
}

const GRADE_COLORS = {
  S: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  A: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  B: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  C: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' },
  D: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' },
}

export function RevenueGuidePanel({
  blogCount,
  language,
  primaryCategory,
}: RevenuGuidePanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<RevenueGuideResult | null>(null)
  const [targetAmount, setTargetAmount] = useState<number>(3000000)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    if (!targetAmount || targetAmount <= 0) {
      setError('목표 수익을 입력해주세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/monetize/revenue-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAmount,
          currentBlogCount: blogCount,
          primaryCategory,
          language,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '계산 실패')
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '계산 중 오류 발생')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadMD = () => {
    if (!result) return

    const portfolioMD = result.portfolio
      ?.map(
        p =>
          `#### ${p.grade}등급 블로그 × ${p.count}개
- **추천 카테고리**: ${p.recommendedTypes.join(', ')}
- **게시물당 수익**: ₩${p.revenuePerPost.toLocaleString()} (CPC ₩${p.avgCpc.toLocaleString()}, 월 방문자 ${p.monthlyVisitorsPerPost.toLocaleString()}명/게시물)
- **일일 발행**: 블로그당 ${p.postsPerBlogPerDay}편
- **월 수익 기여**: ₩${p.monthlyRevenue.toLocaleString()}
- ${p.description}`
      )
      .join('\n\n') ?? ''

    const md = `# 수익 목표 달성 가이드

## 목표 월수익: ₩${result.targetAmount.toLocaleString()}

### 핵심 지표
- **총 블로그 수**: ${result.blogComposition.reduce((s, b) => s + b.count, 0)}개
- **일일 총 발행량**: ${result.requiredPostsPerDay}편
- **목표 달성 예상 기간**: ${result.estimatedTimeToGoal}

### 수익 구조
- **예상 월 총수익**: ₩${result.totalMonthlyRevenue?.toLocaleString() ?? '-'}
- **예상 월 API 비용**: ₩${result.monthlyCostEstimate?.toLocaleString() ?? '-'}
- **예상 월 순수익**: ₩${result.netRevenue?.toLocaleString() ?? '-'}

### 블로그 포트폴리오 전략

${portfolioMD}

### 전략 팁
${result.tips.map(tip => `- ${tip}`).join('\n')}

---
*이 가이드는 6개월 숙성 기준의 추정치입니다. 게시물 품질, SEO 최적화, 카테고리 경쟁도에 따라 달라질 수 있습니다.*
`

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-guide-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-8 border rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">수익 목표 달성 가이드</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 py-4 border-t space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              목표 월수익 (원)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={targetAmount}
                onChange={e => setTargetAmount(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 3,000,000"
              />
              <button
                onClick={handleCalculate}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {isLoading ? '계산 중...' : '계산'}
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-5 pt-4 border-t">
              {/* 핵심 요약 메트릭 */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">총 블로그</p>
                  <p className="text-sm font-bold text-blue-700">
                    {result.blogComposition.reduce((s, b) => s + b.count, 0)}개
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600">일일 발행</p>
                  <p className="text-sm font-bold text-green-700">
                    {result.requiredPostsPerDay}편
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600">예상 순수익</p>
                  <p className="text-sm font-bold text-purple-700">
                    ₩{(result.netRevenue ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-gray-600">달성 기간</p>
                  <p className="text-sm font-bold text-orange-700">
                    {result.estimatedTimeToGoal}
                  </p>
                </div>
              </div>

              {/* 수익 구조 요약 */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <h4 className="text-sm font-medium text-gray-900">수익 구조</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">예상 총수익</p>
                    <p className="text-sm font-bold text-gray-900">₩{(result.totalMonthlyRevenue ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">API 비용</p>
                    <p className="text-sm font-bold text-red-600">₩{(result.monthlyCostEstimate ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">순수익</p>
                    <p className="text-sm font-bold text-green-700">₩{(result.netRevenue ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* 블로그 포트폴리오 전략 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  블로그 포트폴리오 전략
                </h4>
                <div className="space-y-3">
                  {result.portfolio?.map(p => {
                    const colors = GRADE_COLORS[p.grade] ?? GRADE_COLORS.C
                    return (
                      <div
                        key={p.grade}
                        className={`rounded-lg border p-3 space-y-2 ${colors.bg} ${colors.border}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>
                              {p.grade}등급
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              × {p.count}개 블로그
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${colors.text}`}>
                            ₩{p.monthlyRevenue.toLocaleString()}/월
                          </span>
                        </div>

                        <p className="text-xs text-gray-600">{p.description}</p>

                        <div className="flex flex-wrap gap-1">
                          {p.recommendedTypes.map(t => (
                            <span
                              key={t}
                              className="px-2 py-0.5 bg-white/60 rounded text-xs text-gray-700 border border-gray-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-gray-500">평균 CPC</span>
                            <p className="font-medium text-gray-800">₩{p.avgCpc.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">게시물당 수익</span>
                            <p className="font-medium text-gray-800">₩{p.revenuePerPost.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">일 발행량</span>
                            <p className="font-medium text-gray-800">{p.postsPerBlogPerDay}편/블로그</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 일일 발행 계획 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  일일 발행 계획
                </h4>
                <div className="space-y-1">
                  {result.dailyPublishPlan.map(p => (
                    <div
                      key={p.grade}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{p.grade}등급 블로그 합계</span>
                      <span className="font-bold text-gray-900">
                        하루 {p.postsPerDay}편
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                    <span className="text-gray-900 font-medium">전체 합계</span>
                    <span className="font-bold text-blue-700">
                      하루 {result.requiredPostsPerDay}편
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  운영 전략
                </h4>
                <ul className="space-y-1.5">
                  {result.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-600 flex gap-2"
                    >
                      <span className="text-blue-500 flex-shrink-0 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadMD}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                MD 다운로드
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
