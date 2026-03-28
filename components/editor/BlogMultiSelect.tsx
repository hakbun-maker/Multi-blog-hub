'use client'

import { useState, useMemo } from 'react'

interface Blog {
  id: string
  name: string
  color: string | null
  ai_provider: string | null
  blog_type?: string | null
  language?: string | null
}

interface BlogMultiSelectProps {
  blogs: Blog[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

const BLOG_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316']

const BLOG_TYPE_LABELS: Record<string, string> = {
  legal: '법률', finance: '금융', medical: '의료', 'it-tech': 'IT', education: '교육',
  'beauty-fashion': '뷰티', food: '음식', travel: '여행', parenting: '육아', lifestyle: '라이프',
  'real-estate': '부동산', business: '비즈니스', entertainment: '엔터', sports: '스포츠', pets: '반려동물',
  automotive: '자동차', interior: '인테리어', news: '뉴스', science: '과학', other: '기타',
}

const LANG_LABELS: Record<string, string> = {
  ko: '한국어', en: 'EN', ja: '日本語', de: 'DE', pt_br: 'PT', es: 'ES',
}

export function BlogMultiSelect({ blogs, selectedIds, onToggle }: BlogMultiSelectProps) {
  const [filterLang, setFilterLang] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // 블로그 목록에서 실제 사용 중인 언어/유형만 추출
  const usedLangs = useMemo(() => {
    const set = new Set<string>()
    blogs.forEach(b => set.add(b.language || 'ko'))
    return Array.from(set).sort()
  }, [blogs])

  const usedTypes = useMemo(() => {
    const set = new Set<string>()
    blogs.forEach(b => { if (b.blog_type) set.add(b.blog_type) })
    return Array.from(set).sort()
  }, [blogs])

  const filteredBlogs = useMemo(() => {
    return blogs.filter(blog => {
      if (filterLang !== 'all' && (blog.language || 'ko') !== filterLang) return false
      if (filterType !== 'all' && blog.blog_type !== filterType) return false
      return true
    })
  }, [blogs, filterLang, filterType])

  if (!blogs.length) {
    return <p className="text-sm text-gray-400">블로그가 없습니다. 먼저 블로그를 만들어주세요.</p>
  }

  const showFilters = usedLangs.length > 1 || usedTypes.length > 1

  return (
    <div className="space-y-2">
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {usedLangs.length > 1 && (
            <select
              value={filterLang}
              onChange={e => setFilterLang(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-blue-300"
            >
              <option value="all">전체 언어</option>
              {usedLangs.map(lang => (
                <option key={lang} value={lang}>{LANG_LABELS[lang] || lang}</option>
              ))}
            </select>
          )}
          {usedTypes.length > 1 && (
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-blue-300"
            >
              <option value="all">전체 유형</option>
              {usedTypes.map(type => (
                <option key={type} value={type}>{BLOG_TYPE_LABELS[type] || type}</option>
              ))}
            </select>
          )}
          {(filterLang !== 'all' || filterType !== 'all') && (
            <button
              type="button"
              onClick={() => { setFilterLang('all'); setFilterType('all') }}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >
              초기화
            </button>
          )}
        </div>
      )}

      {filteredBlogs.map((blog, i) => {
        const color = blog.color ?? BLOG_COLORS[i % BLOG_COLORS.length]
        const selected = selectedIds.includes(blog.id)
        const typeLabel = blog.blog_type ? BLOG_TYPE_LABELS[blog.blog_type] : null
        const langLabel = blog.language && blog.language !== 'ko' ? LANG_LABELS[blog.language] : null
        return (
          <label key={blog.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
              selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
            <input type="checkbox" checked={selected} onChange={() => onToggle(blog.id)}
              className="w-4 h-4 text-blue-600 rounded" />
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium text-gray-800 flex-1">{blog.name}</span>
            <div className="flex items-center gap-1.5">
              {langLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">{langLabel}</span>
              )}
              {typeLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">{typeLabel}</span>
              )}
              <span className="text-xs text-gray-400">{blog.ai_provider ?? 'claude'}</span>
            </div>
          </label>
        )
      })}

      {showFilters && filteredBlogs.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">필터 조건에 맞는 블로그가 없습니다.</p>
      )}
    </div>
  )
}
