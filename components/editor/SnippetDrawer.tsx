'use client'

import { useEffect, useState } from 'react'
import { X, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Snippet {
  id: string
  name: string
  content: string
  type: string
  blog_id: string | null
}

interface SnippetDrawerProps {
  blogId: string | null
  blogName?: string
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string) => void
}

type TabType = 'all' | 'blog'

export function SnippetDrawer({ blogId, blogName, isOpen, onClose, onInsert }: SnippetDrawerProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [tab, setTab] = useState<TabType>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/snippets').then(r => r.json()).then(d => setSnippets(d.data ?? []))
  }, [isOpen])

  const filtered = snippets
    .filter(s => tab === 'all' || s.blog_id === blogId)
    .filter(s => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase()))

  const TYPE_COLORS: Record<string, string> = {
    text: 'bg-gray-100 text-gray-500',
    html: 'bg-orange-100 text-orange-600',
    code: 'bg-blue-100 text-blue-600',
    markdown: 'bg-green-100 text-green-600',
  }

  return (
    <>
      {/* 오버레이 */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />}

      {/* 드로어 */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">스니펫</h3>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${tab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            전체 <span className="text-gray-400 ml-0.5">{snippets.length}</span>
          </button>
          {blogId && (
            <button
              onClick={() => setTab('blog')}
              className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 truncate px-2 ${tab === 'blog' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {blogName ?? '이 블로그'} <span className="text-gray-400 ml-0.5">{snippets.filter(s => s.blog_id === blogId).length}</span>
            </button>
          )}
        </div>

        {/* 검색 */}
        <div className="px-3 py-2 flex-shrink-0 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="스니펫 검색..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {!filtered.length ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {search ? '검색 결과가 없습니다.' : '스니펫이 없습니다.'}
            </p>
          ) : (
            filtered.map(s => (
              <button key={s.id}
                onClick={() => { onInsert(s.content); onClose() }}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[s.type] ?? 'bg-gray-100 text-gray-500'}`}>
                        {s.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{s.content.replace(/<[^>]*>/g, '')}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* 하단: 스니펫 관리 링크 */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100">
          <a href="/settings?tab=snippets" className="text-xs text-blue-600 hover:underline">
            스니펫 관리 →
          </a>
        </div>
      </div>
    </>
  )
}
