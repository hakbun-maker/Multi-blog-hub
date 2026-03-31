'use client'

import { useMemo } from 'react'

interface PasonaSectionMarkerProps {
  content: string
}

const PASONA_SECTIONS = [
  { key: 'P', label: 'Problem', color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'A1', label: 'Agitation', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'S', label: 'Solution', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'O', label: 'Offer', color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'N', label: 'Narrowing', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'A2', label: 'Action', color: 'bg-pink-100 text-pink-700 border-pink-300' },
]

function detectPasonaSections(html: string): Set<string> {
  if (!html.trim()) return new Set()

  const found = new Set<string>()
  const matches: Array<{ letter: string }> = []

  let match: RegExpExecArray | null

  // HTML h2 태그에서 [P], [A], [S], [O], [N] 패턴 감지
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  while ((match = h2Regex.exec(html)) !== null) {
    const innerText = match[1].replace(/<[^>]+>/g, '') // 내부 태그 제거
    const letterMatch = /\[([PASON])\]/i.exec(innerText)
    if (letterMatch) {
      matches.push({ letter: letterMatch[1].toUpperCase() })
    }
  }

  // 마크다운 형식 ## [P] 패턴 감지
  const mdRegex = /^##\s*\[([PASON])\]/gim
  while ((match = mdRegex.exec(html)) !== null) {
    matches.push({ letter: match[1].toUpperCase() })
  }

  // 순서 기반 A 구분: 첫 번째 A = A1(Agitation), 두 번째 A = A2(Action)
  let aCount = 0
  for (const { letter } of matches) {
    if (letter === 'A') {
      aCount++
      if (aCount === 1) {
        found.add('A1')
      } else {
        found.add('A2')
      }
    } else {
      found.add(letter)
    }
  }

  return found
}

export function PasonaSectionMarker({ content }: PasonaSectionMarkerProps) {
  const foundSections = useMemo(() => detectPasonaSections(content), [content])

  const foundCount = PASONA_SECTIONS.filter(s => foundSections.has(s.key)).length

  return (
    <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200">
      <span className="text-xs font-medium text-gray-500 mr-1">PASONA:</span>
      {PASONA_SECTIONS.map(section => {
        const isFound = foundSections.has(section.key)
        const displayKey = section.key.replace(/\d/, '')
        return (
          <span
            key={section.key}
            title={section.label}
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
              isFound ? section.color : 'bg-gray-100 text-gray-400 border-gray-200'
            }`}
          >
            [{displayKey}] {isFound ? '✓' : '✗'}
          </span>
        )
      })}
      <span className="ml-auto text-xs text-gray-400">
        {foundCount}/6 섹션
      </span>
    </div>
  )
}
