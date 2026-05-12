'use client'

import { useEffect, useMemo, useState } from 'react'
import { PenSquare, Trash2, RefreshCw, ExternalLink, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://multi-blog-hub.vercel.app').replace(/\/$/, '')

interface NonIndexedPost {
  id: string
  title: string | null
  slug: string | null
  blogId: string
  blogName: string
  blogSlug: string | null
  blogCustomDomain: string | null
  publishedAt: string | null
  indexingVerdict: string | null
  indexingCoverageState: string | null
  indexingInspectedAt: string | null
  indexingLastCrawlAt: string | null
  fixGuide: {
    state: string
    severity: 'info' | 'warning' | 'error'
    reasonShort: string
    reasonDetail: string
    fixAction: string
    canRetry: boolean
  }
}

interface BlogMeta {
  id: string
  name: string
  slug: string | null
  custom_domain: string | null
}

interface NonIndexedSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void  // 글 변경 시 부모 리프레시
}

const STATE_LABEL: Record<string, string> = {
  not_indexed: '미색인',
  pending: '검토 중',
  unknown: '미검사',
  indexed: '색인됨',
}

const SEVERITY_CLASS: Record<string, string> = {
  info: 'text-blue-700 bg-blue-50 border-blue-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  error: 'text-red-700 bg-red-50 border-red-200',
}

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
}

export function NonIndexedSheet({ open, onOpenChange, onChanged }: NonIndexedSheetProps) {
  const [posts, setPosts] = useState<NonIndexedPost[]>([])
  const [blogs, setBlogs] = useState<BlogMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [filterBlogId, setFilterBlogId] = useState<string>('all')
  const [filterState, setFilterState] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkRequestingIds, setBulkRequestingIds] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/posts/non-indexed')
      const json = await res.json()
      setPosts(json.posts ?? [])
      setBlogs(json.blogs ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setSelected(new Set())
      setBulkResult(null)
      load()
    }
  }, [open])

  const filtered = useMemo(() => {
    return posts.filter(p => {
      if (filterBlogId !== 'all' && p.blogId !== filterBlogId) return false
      if (filterState !== 'all' && p.fixGuide.state !== filterState) return false
      return true
    })
  }, [posts, filterBlogId, filterState])

  const counts = useMemo(() => {
    const total = filtered.length
    const not_indexed = filtered.filter(p => p.fixGuide.state === 'not_indexed').length
    const pending = filtered.filter(p => p.fixGuide.state === 'pending').length
    const unknown = filtered.filter(p => p.fixGuide.state === 'unknown').length
    return { total, not_indexed, pending, unknown }
  }, [filtered])

  const buildPostUrl = (p: NonIndexedPost): string | null => {
    if (!p.slug) return null
    if (p.blogCustomDomain) return `https://${p.blogCustomDomain}/${encodeURIComponent(p.slug)}`
    if (p.blogSlug) return `${APP_URL}/blog/${encodeURIComponent(p.blogSlug)}/${encodeURIComponent(p.slug)}`
    return null
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
  }

  const handleBulkRequest = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) {
      alert('재요청할 글을 선택해주세요.')
      return
    }
    if (ids.length > 200) {
      alert('한 번에 200개 이하만 요청 가능합니다 (Google Indexing API 일일 한도).')
      return
    }
    if (!confirm(`${ids.length}개 글에 색인 재요청을 보냅니다.\n\n주의: 콘텐츠 변경 없이 같은 글을 반복 요청해도 Google이 무시할 수 있습니다.`)) return

    setBulkRequestingIds(true)
    setBulkResult(null)
    try {
      const res = await fetch('/api/gsc/request-indexing-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds: ids }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(`재요청 실패: ${json.error || '알 수 없는 오류'}`)
        return
      }
      setBulkResult(json.summary)
    } finally {
      setBulkRequestingIds(false)
    }
  }

  const handleDelete = async (postId: string, title: string | null) => {
    if (!confirm(`"${title || '(제목 없음)'}" 글을 삭제하시겠습니까?\n\n참고: 색인되지 않은 글이라 Google 검색에 영향 없음. 다만 글 자체가 영구 삭제됩니다.`)) return
    setDeletingId(postId)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) {
        alert('삭제 실패')
        return
      }
      setPosts(prev => prev.filter(p => p.id !== postId))
      setSelected(prev => { const next = new Set(prev); next.delete(postId); return next })
      onChanged?.()
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (postId: string) => {
    window.open(`/editor/${postId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            미색인 글 수정
          </SheetTitle>
          <SheetDescription>
            Google이 색인하지 않은 글을 정리하세요. 거부 사유와 수정 방향을 함께 안내합니다.
          </SheetDescription>
        </SheetHeader>

        {/* 필터 + 액션 */}
        <div className="px-6 py-3 border-b space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterBlogId}
              onChange={e => setFilterBlogId(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              <option value="all">전체 블로그</option>
              {blogs.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={filterState}
              onChange={e => setFilterState(e.target.value)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              <option value="all">전체 상태</option>
              <option value="not_indexed">미색인</option>
              <option value="pending">검토 중</option>
              <option value="unknown">미검사</option>
            </select>
            <span className="text-xs text-gray-400">
              {counts.total}개 — 미색인 {counts.not_indexed} · 검토 중 {counts.pending} · 미검사 {counts.unknown}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              disabled={loading}
              className="ml-auto h-7 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          {/* 일괄 액션 */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              {selected.size === filtered.length && filtered.length > 0 ? '전체 해제' : '전체 선택'}
            </button>
            <span className="text-xs text-gray-400">선택 {selected.size}개</span>
            <Button
              size="sm"
              onClick={handleBulkRequest}
              disabled={selected.size === 0 || bulkRequestingIds}
              className="ml-auto h-7 text-xs"
            >
              {bulkRequestingIds
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />요청 중…</>
                : <>선택 글 색인 재요청 ({selected.size})</>}
            </Button>
          </div>

          {bulkResult && (
            <div className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
              재요청 결과 — 성공 {bulkResult.succeeded}개 · 실패 {bulkResult.failed}개
            </div>
          )}
        </div>

        {/* 글 리스트 */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-8">로드 중…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              해당 조건의 미색인 글이 없습니다. 🎉
            </div>
          ) : (
            filtered.map(p => {
              const Icon = SEVERITY_ICON[p.fixGuide.severity] ?? Info
              const isSelected = selected.has(p.id)
              const url = buildPostUrl(p)
              return (
                <div
                  key={p.id}
                  className={`border rounded-lg p-3 space-y-2 transition-colors ${
                    isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
                  }`}
                >
                  {/* 헤더 */}
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(p.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate inline-flex items-center gap-1"
                          >
                            {p.title || '(제목 없음)'}
                            <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-300" />
                          </a>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {p.title || '(제목 없음)'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                        <span>{p.blogName}</span>
                        <span>·</span>
                        <span>발행 {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ko-KR') : '-'}</span>
                        {p.indexingInspectedAt && (
                          <>
                            <span>·</span>
                            <span>마지막 검사 {new Date(p.indexingInspectedAt).toLocaleDateString('ko-KR')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${SEVERITY_CLASS[p.fixGuide.severity]}`}>
                      {STATE_LABEL[p.fixGuide.state] ?? p.fixGuide.state}
                    </span>
                  </div>

                  {/* 거부 사유 + 수정 방향 */}
                  <div className={`rounded-md border p-2.5 space-y-1.5 ${SEVERITY_CLASS[p.fixGuide.severity]}`}>
                    <div className="flex items-start gap-1.5 text-xs">
                      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1 min-w-0">
                        <p className="font-semibold">{p.fixGuide.reasonShort}</p>
                        <p className="opacity-90">{p.fixGuide.reasonDetail}</p>
                        <div className="bg-white/60 rounded px-2 py-1 mt-1">
                          <p className="text-[11px] font-semibold mb-0.5">💡 수정 방향</p>
                          <p className="text-[11px] opacity-90">{p.fixGuide.fixAction}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(p.id)}
                      className="h-7 text-xs"
                      title="새 창에서 편집"
                    >
                      <PenSquare className="w-3 h-3 mr-1" />
                      편집
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(p.id, p.title)}
                      disabled={deletingId === p.id}
                      className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="글 삭제"
                    >
                      {deletingId === p.id
                        ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        : <Trash2 className="w-3 h-3 mr-1" />}
                      삭제
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 푸터 안내 */}
        <div className="px-6 py-3 border-t bg-gray-50/60 text-[11px] text-gray-500 leading-relaxed">
          <p>💡 <strong>편집 후 자동 재요청</strong>: 글 편집 화면에서 저장하면 자동으로 색인 재요청이 전송됩니다.</p>
          <p className="mt-1">⚠️ <strong>일괄 삭제 안내</strong>: 미색인 글 삭제는 Google 검색에 부정적 영향 없습니다 (Google 인덱스에 없는 글). 대량 삭제도 안전합니다.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
