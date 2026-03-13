'use client'

import { useEffect, useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Snippet {
  id: string
  name: string
  content: string
  type: string
}

interface SnippetDrawerProps {
  blogId: string | null
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string) => void
}

export function SnippetDrawer({ blogId, isOpen, onClose, onInsert }: SnippetDrawerProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([])

  useEffect(() => {
    if (!isOpen) return
    const url = blogId ? `/api/snippets?blogId=${blogId}` : '/api/snippets'
    fetch(url).then(r => r.json()).then(d => setSnippets(d.data ?? []))
  }, [isOpen, blogId])

  return (
    <div className={`fixed top-0 right-0 h-full w-72 bg-white shadow-xl border-l border-gray-200 z-50 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">스니펫</h3>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-57px)] p-3 space-y-2">
        {!snippets.length ? (
          <p className="text-sm text-gray-400 text-center py-8">스니펫이 없습니다.</p>
        ) : (
          snippets.map(s => (
            <button key={s.id}
              onClick={() => { onInsert(s.content); onClose() }}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{s.content}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
