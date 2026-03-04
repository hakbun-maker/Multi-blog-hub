'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface Snippet {
  id: string
  name: string
  content: string
  type: string
}

interface MemoTabProps {
  snippets: Snippet[]
  blogId: string
}

const TYPE_LABELS: Record<string, string> = {
  text: '텍스트',
  html: 'HTML',
  markdown: '마크다운',
}

export function MemoTab({ snippets: initialSnippets, blogId }: MemoTabProps) {
  const router = useRouter()
  const [snippets, setSnippets] = useState(initialSnippets)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', content: '', type: 'text' })
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setForm({ name: '', content: '', type: 'text' })
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (snippet: Snippet) => {
    setForm({ name: snippet.name, content: snippet.content, type: snippet.type })
    setEditingId(snippet.id)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.content.trim()) return
    setLoading(true)

    if (editingId) {
      const res = await fetch(`/api/snippets/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSnippets(prev => prev.map(s => s.id === editingId ? data : s))
      }
    } else {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, blogId }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSnippets(prev => [...prev, data])
      }
    }

    resetForm()
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 스니펫을 삭제하시겠습니까?')) return
    await fetch(`/api/snippets/${id}`, { method: 'DELETE' })
    setSnippets(prev => prev.filter(s => s.id !== id))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">재사용 가능한 텍스트/HTML 조각을 관리합니다.</p>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1" />스니펫 추가
        </Button>
      </div>

      {/* 추가/편집 폼 */}
      {showForm && (
        <Card className="shadow-none border border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">{editingId ? '스니펫 편집' : '새 스니펫'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">이름 *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="스니펫 이름" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">타입</Label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full h-8 text-sm border border-gray-200 rounded-md px-2 bg-white">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">내용 *</Label>
              <textarea
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="스니펫 내용을 입력하세요..."
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={resetForm}>취소</Button>
              <Button size="sm" onClick={handleSubmit} disabled={loading}>
                {loading ? '저장 중...' : '저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 스니펫 목록 */}
      {!snippets.length ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">아직 스니펫이 없습니다.</p>
          <p className="text-xs mt-1">자주 쓰는 문구나 HTML 코드를 저장해두세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {snippets.map(snippet => (
            <Card key={snippet.id} className="shadow-none border border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                      {TYPE_LABELS[snippet.type] ?? snippet.type}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{snippet.name}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => setExpandedId(expandedId === snippet.id ? null : snippet.id)}>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedId === snippet.id ? 'rotate-180' : ''}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      onClick={() => handleEdit(snippet)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(snippet.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {expandedId === snippet.id && (
                  <pre className="mt-2 p-2 rounded bg-gray-50 text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap font-mono">
                    {snippet.content}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
