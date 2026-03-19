'use client'

import { useState } from 'react'
import type { Grade, BlogLanguage } from '@/types/monetize'
import type { RevenueGuideResult } from '@/lib/monetize/engines/revenue-calculator'
import { ChevronDown, Download, TrendingUp } from 'lucide-react'

interface RevenuGuidePanelProps {
  blogCount: number
  language: BlogLanguage
  primaryCategory: string
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

    const md = `# 수익 목표 달성 가이드

## 목표 월수익: ₩${result.targetAmount.toLocaleString()}

### 핵심 지표
- **게시물당 예상 수익**: ₩${result.estimatedRevenuePerPost.toLocaleString()}
- **필요한 월간 게시물 수**: ${result.requiredPostsPerMonth}편
- **일일 게시물 수**: ${result.requiredPostsPerDay}편
- **목표 달성 예상 기간**: ${result.estimatedTimeToGoal}

### 블로그 구성 (권장)
${result.blogComposition
  .map(
    b =>
      `- **${b.grade}등급**: ${b.count}개 블로그 (${b.percentage}%)`
  )
  .join('\n')}

### 일일 발행 계획
${result.dailyPublishPlan.map(p => `- **${p.grade}등급**: 하루 ${p.postsPerDay}편`).join('\n')}

### 전략 팁
${result.tips.map(tip => `- ${tip}`).join('\n')}

---
*이 가이드는 보수적인 추정치를 기반으로 합니다. 실제 결과는 콘텐츠 품질, SEO 최적화, 마케팅에 따라 달라질 수 있습니다.*
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
            <div className="space-y-4 pt-4 border-t">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">게시물당 수익</p>
                  <p className="text-sm font-bold text-blue-700">
                    ₩{result.estimatedRevenuePerPost.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-600">월간 게시물</p>
                  <p className="text-sm font-bold text-green-700">
                    {result.requiredPostsPerMonth}편
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600">일일 발행</p>
                  <p className="text-sm font-bold text-purple-700">
                    {result.requiredPostsPerDay}편
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-gray-600">달성 기간</p>
                  <p className="text-sm font-bold text-orange-700">
                    {result.estimatedTimeToGoal}
                  </p>
                </div>
              </div>

              {/* Blog Composition */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  권장 블로그 구성
                </h4>
                <div className="space-y-1">
                  {result.blogComposition.map(b => (
                    <div
                      key={b.grade}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        <strong>{b.grade}등급</strong> ({b.percentage}%)
                      </span>
                      <span className="font-bold text-gray-900">
                        {b.count}개
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Plan */}
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
                      <span className="text-gray-600">{p.grade}등급 블로그</span>
                      <span className="font-bold text-gray-900">
                        하루 {p.postsPerDay}편
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  전략 팁
                </h4>
                <ul className="space-y-1">
                  {result.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-600 flex gap-2"
                    >
                      <span className="text-blue-500 flex-shrink-0">•</span>
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
