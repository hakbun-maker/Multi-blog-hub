'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface Snippet {
  id: string
  name: string
  content: string
  type: string
  blog_id: string | null
  created_at: string
}

interface BlogInfo {
  id: string
  name: string
}

interface MemoTabProps {
  blogId: string
  blogName: string
  blogs: BlogInfo[]
}

const TYPE_LABELS: Record<string, string> = {
  text: '텍스트',
  html: 'HTML',
  markdown: '마크다운',
}

type SortKey = 'type' | 'name' | 'blogName' | 'created_at'
type SortDir = 'asc' | 'desc'
type FilterTab = 'all' | 'current'

export function MemoTab({ blogId, blogName, blogs }: MemoTabProps) {
  const router = useRouter()
  const [allSnippets, setAllSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<FilterTab>('current')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', content: '', type: 'text' })
  const [saving, setSaving] = useState(false)

  const blogMap = new Map(blogs.map(b => [b.id, b.name]))

  const fetchSnippets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/snippets')
      const d = await res.json()
      setAllSnippets(d.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSnippets() }, [])

  // 필터
  const filtered = filterTab === 'all'
    ? allSnippets
    : allSnippets.filter(s => s.blog_id === blogId)

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    let aVal: string, bVal: string
    switch (sortKey) {
      case 'type':
        aVal = TYPE_LABELS[a.type] ?? a.type
        bVal = TYPE_LABELS[b.type] ?? b.type
        break
      case 'name':
        aVal = a.name
        bVal = b.name
        break
      case 'blogName':
        aVal = (a.blog_id ? blogMap.get(a.blog_id) : '') ?? ''
        bVal = (b.blog_id ? blogMap.get(b.blog_id) : '') ?? ''
        break
      case 'created_at':
        aVal = a.created_at
        bVal = b.created_at
        break
      default:
        return 0
    }
    const cmp = aVal.localeCompare(bVal, 'ko')
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />
  }

  // CRUD
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
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/snippets/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const { data } = await res.json()
          setAllSnippets(prev => prev.map(s => s.id === editingId ? { ...s, ...data } : s))
        }
      } else {
        const res = await fetch('/api/snippets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, blogId }),
        })
        if (res.ok) {
          const { data } = await res.json()
          setAllSnippets(prev => [data, ...prev])
        }
      }
    } finally {
      resetForm()
      setSaving(false)
      router.refresh()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 스니펫을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/snippets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAllSnippets(prev => prev.filter(s => s.id !== id))
      router.refresh()
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const currentCount = allSnippets.filter(s => s.blog_id === blogId).length
  const allCount = allSnippets.length

  return (
    <div className="space-y-4">
      {/* 상단: 설명 + 추가 버튼 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">재사용 가능한 텍스트/HTML 조각을 관리합니다.</p>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="w-4 h-4 mr-1" />스니펫 추가
        </Button>
      </div>

      {/* 필터 탭 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filterTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          전체 <span className="text-xs text-gray-400 ml-1">{allCount}</span>
        </button>
        <button
          onClick={() => setFilterTab('current')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filterTab === 'current' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          {blogName} <span className="text-xs text-gray-400 ml-1">{currentCount}</span>
        </button>
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
              <Button size="sm" onClick={handleSubmit} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 테이블 */}
      {loading ? (
        <div className="text-sm text-gray-400 text-center py-10">불러오는 중...</div>
      ) : !sorted.length ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">
            {filterTab === 'all' ? '아직 스니펫이 없습니다.' : `${blogName}에 스니펫이 없습니다.`}
          </p>
          <p className="text-xs mt-1">자주 쓰는 문구나 HTML 코드를 저장해두세요.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-20">
                  <button onClick={() => toggleSort('type')} className="flex items-center gap-1 hover:text-blue-600">
                    타입 <SortIcon col="type" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-blue-600">
                    이름 <SortIcon col="name" />
                  </button>
                </th>
                {filterTab === 'all' && (
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-28">
                    <button onClick={() => toggleSort('blogName')} className="flex items-center gap-1 hover:text-blue-600">
                      블로그 <SortIcon col="blogName" />
                    </button>
                  </th>
                )}
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-24">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-blue-600">
                    작성일 <SortIcon col="created_at" />
                  </button>
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">액션</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(snippet => (
                <Fragment key={snippet.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                        {TYPE_LABELS[snippet.type] ?? snippet.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-800 truncate max-w-[200px]">
                      {snippet.name}
                    </td>
                    {filterTab === 'all' && (
                      <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-[120px]">
                        {snippet.blog_id ? blogMap.get(snippet.blog_id) ?? '-' : '-'}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-xs text-gray-400">
                      {formatDate(snippet.created_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
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
                    </td>
                  </tr>
                  {expandedId === snippet.id && (
                    <tr>
                      <td colSpan={filterTab === 'all' ? 5 : 4} className="px-3 py-0">
                        <pre className="my-2 p-3 rounded bg-gray-50 text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap font-mono border border-gray-100">
                          {snippet.content}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
