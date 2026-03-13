'use client'

import { useEffect, useState } from 'react'
import { X, FileText, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Draft {
  id: string
  title: string
  content_html?: string
  blog_id: string
  keyword?: string
  seo_title?: string
  meta_description?: string
  created_at: string
}

interface DraftDrawerProps {
  isOpen: boolean
  onClose: () => void
  onLoad: (draft: Draft) => void
}

export function DraftDrawer({ isOpen, onClose, onLoad }: DraftDrawerProps) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchDrafts = () => {
    setLoading(true)
    fetch('/api/posts?status=draft')
      .then(r => r.json())
      .then(d => setDrafts(d.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isOpen) return
    fetchDrafts()
  }, [isOpen])

  const handleDelete = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation()
    if (!confirm('이 임시저장 글을 삭제하시겠습니까?')) return
    setDeleting(draftId)
    try {
      const res = await fetch(`/api/posts/${draftId}`, { method: 'DELETE' })
      if (res.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draftId))
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '방금 전'
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}일 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 z-50 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4" />임시저장 글 불러오기
        </h3>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-57px)] p-3 space-y-2">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-8">불러오는 중...</div>
        ) : !drafts.length ? (
          <p className="text-sm text-gray-400 text-center py-8">임시저장된 글이 없습니다.</p>
        ) : (
          drafts.map(draft => (
            <div key={draft.id} className="relative group">
              <button
                onClick={() => { onLoad(draft); onClose() }}
                className="w-full text-left p-3 pr-10 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {draft.title || '(제목 없음)'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-0.5 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />{formatDate(draft.created_at)}
                  </span>
                  {draft.keyword && (
                    <span className="text-xs text-gray-400 truncate max-w-[120px]">
                      {draft.keyword.split(',').slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
                {draft.content_html && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: draft.content_html.replace(/<[^>]*>/g, ' ').slice(0, 100) }} />
                )}
              </button>
              <button
                onClick={(e) => handleDelete(e, draft.id)}
                disabled={deleting === draft.id}
                className="absolute top-3 right-3 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="삭제">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
