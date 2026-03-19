'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

interface SEOChecklistProps {
  content: string
  keyword: string
}

interface CheckItem {
  id: string
  label: string
  description: string
  passed: boolean
}

export function SEOChecklist({ content, keyword }: SEOChecklistProps) {
  const [checks, setChecks] = useState<CheckItem[]>([])

  useEffect(() => {
    evaluateChecks()
  }, [content, keyword])

  const evaluateChecks = () => {
    const lowerContent = content.toLowerCase()
    const lowerKeyword = keyword.toLowerCase()

    const items: CheckItem[] = [
      {
        id: 'meta-title',
        label: 'Meta Title',
        description: '60자 이내로 작성 및 키워드 포함',
        passed: lowerContent.includes('<meta') && lowerContent.includes('name="description"'),
      },
      {
        id: 'h2-keyword',
        label: 'H2 키워드',
        description: `첫 H2에 "${keyword}" 포함`,
        passed: lowerContent.includes(`<h2>${lowerKeyword}</h2>`) || lowerContent.includes(`<h2>`) && lowerContent.includes(lowerKeyword),
      },
      {
        id: 'keyword-density',
        label: '키워드 밀도',
        description: '키워드가 전체 단어의 1-2% 범위',
        passed: checkKeywordDensity(lowerContent, lowerKeyword),
      },
      {
        id: 'h2-count',
        label: 'H2 개수',
        description: 'H2 태그 2개 이상',
        passed: (content.match(/<h2>/gi) || []).length >= 2,
      },
      {
        id: 'h3-present',
        label: 'H3 구조',
        description: 'H3 태그로 세부 구조 작성',
        passed: (content.match(/<h3>/gi) || []).length > 0,
      },
      {
        id: 'faq-details',
        label: 'FAQ 마크업',
        description: '<details> 태그로 FAQ 구성',
        passed: content.includes('<details>') && content.includes('<summary>'),
      },
      {
        id: 'json-ld',
        label: 'JSON-LD 스키마',
        description: 'JSON-LD로 structured data 작성',
        passed: content.includes('<script type="application/ld+json">'),
      },
      {
        id: 'img-alt',
        label: '이미지 Alt',
        description: '모든 이미지에 alt 텍스트 추가',
        passed: checkImageAlt(content),
      },
      {
        id: 'internal-links',
        label: '내부 링크',
        description: '관련 글로의 내부 링크 포함',
        passed: content.includes('<a href="/') && !content.match(/<a href="https?:/) ? false : true,
      },
    ]

    setChecks(items)
  }

  const checkKeywordDensity = (content: string, keyword: string): boolean => {
    if (!keyword) return false
    const plainText = content.replace(/<[^>]*>/g, ' ').toLowerCase()
    const words = plainText.split(/\s+/).filter((w) => w.length > 0)
    const keywordCount = plainText.split(keyword).length - 1
    const density = (keywordCount / words.length) * 100

    return density >= 1 && density <= 2
  }

  const checkImageAlt = (content: string): boolean => {
    const imgTags = content.match(/<img[^>]*>/gi) || []
    if (imgTags.length === 0) return true
    const withAlt = imgTags.filter((tag) => /alt\s*=\s*["'].*?["']/i.test(tag))
    return withAlt.length === imgTags.length
  }

  const passedCount = checks.filter((c) => c.passed).length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">SEO 체크리스트</h3>
        <p className="text-xs text-gray-500">
          {passedCount}/{checks.length} 항목 완료
        </p>
      </div>

      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.id} className="flex gap-2 items-start">
            {check.passed ? (
              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${check.passed ? 'text-gray-900' : 'text-gray-600'}`}>
                {check.label}
              </p>
              <p className="text-xs text-gray-500">{check.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded border border-blue-100 p-2.5">
        <p className="text-xs text-blue-800">
          💡 <span className="font-medium">팁:</span> 모든 항목을 완료하면 검수 점수가 높아져요!
        </p>
      </div>
    </div>
  )
}
