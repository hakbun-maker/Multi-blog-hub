'use client'

import { useEffect, useState } from 'react'
import { X, Search, Plus, Check, ChevronRight, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Snippet {
  id: string
  name: string
  content: string
  type: string
}

interface SnippetDrawerProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string) => void
}

const TYPE_LABELS: Record<string, string> = { text: '텍스트', html: 'HTML', markdown: '마크다운' }
const TYPE_COLORS: Record<string, string> = {
  text: 'bg-gray-100 text-gray-500',
  html: 'bg-orange-100 text-orange-600',
  markdown: 'bg-green-100 text-green-600',
}

export function SnippetDrawer({ isOpen, onClose, onInsert }: SnippetDrawerProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', content: '', type: 'text' })
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/snippets').then(r => r.json()).then(d => setSnippets(d.data ?? []))
  }, [isOpen])

  const filtered = snippets.filter(s =>
    !search.trim() ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.content.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSnippets(prev => [data, ...prev])
        setSavedId(data.id)
        setForm({ name: '', content: '', type: 'text' })
        setShowAddForm(false)
        setTimeout(() => setSavedId(null), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">
            스니펫 <span className="text-xs text-gray-400 font-normal ml-1">{snippets.length}개</span>
          </h3>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => setShowAddForm(v => !v)}>
              <Plus className="w-3.5 h-3.5 mr-1" />추가
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 인라인 추가 폼 */}
        {showAddForm && (
          <div className="px-3 py-3 border-b border-blue-100 bg-blue-50/40 flex-shrink-0 space-y-2">
            <div className="flex gap-2">
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="이름 *" className="h-7 text-xs flex-1" />
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="h-7 text-xs border border-gray-200 rounded-md px-1.5 bg-white w-20">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="내용 *" rows={3}
              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <div className="flex gap-1.5 justify-end">
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setShowAddForm(false); setForm({ name: '', content: '', type: 'text' }) }}>취소</Button>
              <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="px-3 py-2 flex-shrink-0 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="스니펫 검색..." className="pl-8 h-8 text-sm" />
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
                className={`w-full text-left p-3 rounded-lg border transition-all group ${savedId === s.id ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[s.type] ?? 'bg-gray-100 text-gray-500'}`}>
                        {TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{s.content.replace(/<[^>]*>/g, '')}</p>
                  </div>
                  {savedId === s.id
                    ? <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
                    : <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                  }
                </div>
              </button>
            ))
          )}
        </div>

        {/* 하단: 스니펫 관리 */}
        <div className="flex-shrink-0 border-t border-gray-200">
          <a href="/settings?tab=snippets"
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors">
            <Settings className="w-3.5 h-3.5" />스니펫 관리
          </a>
        </div>
      </div>
    </>
  )
}
