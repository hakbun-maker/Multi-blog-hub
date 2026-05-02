'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenSquare, Trash2, Eye, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Post {
  id: string
  title: string | null
  slug?: string
  status: string
  view_count: number | null
  published_at: string | null
  created_at: string
  category_id?: string | null
}

interface PostsTabProps {
  posts: Post[]
  blogId: string
  blogSlug?: string
  categories?: { id: string; name: string }[]
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  published: { label: '발행', className: 'bg-green-100 text-green-700' },
  scheduled: { label: '예약', className: 'bg-yellow-100 text-yellow-700' },
  draft:     { label: '초안', className: 'bg-gray-100 text-gray-500' },
}

export function PostsTab({ posts: initialPosts, blogId, blogSlug, categories }: PostsTabProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all')

  // GA4 page views (글 슬러그 기준) — 연결된 경우만, 실패 시 자체 view_count 사용
  const [pageViewsBySlug, setPageViewsBySlug] = useState<Record<string, number>>({})
  const [viewsSource, setViewsSource] = useState<'ga4' | 'fallback'>('fallback')

  useEffect(() => {
    if (!blogId) return
    let cancelled = false
    fetch(`/api/posts/page-views?blogId=${blogId}&days=30`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (j.bySlug) setPageViewsBySlug(j.bySlug)
        if (j.source) setViewsSource(j.source)
      })
      .catch(() => { /* fallback to view_count */ })
    return () => { cancelled = true }
  }, [blogId])

  const handleDelete = async (postId: string) => {
    if (!confirm('이 글을 삭제하시겠습니까?')) return
    setDeletingId(postId)
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== postId))
    }
  }

  const filteredPosts = filterCategoryId === 'all'
    ? posts
    : filterCategoryId === 'none'
      ? posts.filter(p => !p.category_id)
      : posts.filter(p => p.category_id === filterCategoryId)

  const hasCategories = categories && categories.length > 0

  if (!posts.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">아직 작성된 글이 없습니다.</p>
        <Button asChild size="sm" className="mt-4">
          <Link href={`/editor/new?blogId=${blogId}`}>첫 글 작성하기</Link>
        </Button>
      </div>
    )
  }

  const gridCols = hasCategories
    ? 'grid-cols-[minmax(150px,1fr)_80px_60px_60px_80px_80px]'
    : 'grid-cols-[minmax(150px,1fr)_60px_60px_80px_80px]'

  return (
    <div className="space-y-1">
      {/* 카테고리 필터 */}
      {hasCategories && (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-gray-400">카테고리:</span>
          <select value={filterCategoryId}
            onChange={e => setFilterCategoryId(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="all">전체</option>
            <option value="none">미분류</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="text-xs text-gray-300">{filteredPosts.length}개</span>
        </div>
      )}

      <div className="overflow-x-auto">
        {/* 헤더 */}
        <div className={`grid gap-4 px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-100 min-w-[520px] ${gridCols}`}>
          <span>제목</span>
          {hasCategories && <span className="text-center">카테고리</span>}
          <span className="text-center">상태</span>
          <span className="text-center" title={viewsSource === 'ga4' ? 'GA4 실데이터 (최근 30일)' : '자체 카운터 (누적)'}>
            조회수{viewsSource === 'ga4' ? ' (GA4)' : ''}
          </span>
          <span className="text-center">발행일</span>
          <span className="text-center">편집</span>
        </div>

        {filteredPosts.map(post => {
          const status = STATUS_MAP[post.status] ?? STATUS_MAP.draft
          const publishedDate = post.published_at
            ? new Date(post.published_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            : '-'
          const postUrl = (post.status === 'published' && blogSlug && post.slug)
            ? `/blog/${blogSlug}/${post.slug}`
            : null
          const categoryName = post.category_id
            ? categories?.find(c => c.id === post.category_id)?.name
            : null
          return (
            <div key={post.id}
              className={`grid gap-4 px-3 py-3 items-center rounded-lg hover:bg-gray-50 transition-colors min-w-[520px] ${gridCols}`}>
              {postUrl ? (
                <a href={postUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-800 truncate font-medium hover:text-blue-600 hover:underline flex items-center gap-1">
                  {post.title || '(제목 없음)'}
                  <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-400" />
                </a>
              ) : (
                <p className="text-sm text-gray-800 truncate font-medium">{post.title || '(제목 없음)'}</p>
              )}
              {hasCategories && (
                <span className="text-xs text-gray-500 text-center truncate">
                  {categoryName ?? '미분류'}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-center ${status.className}`}>
                {status.label}
              </span>
              <span className="text-sm text-gray-500 text-center flex items-center justify-center gap-1">
                <Eye className="w-3 h-3" />
                {(() => {
                  // GA4 데이터가 있으면 우선 사용, 없으면 자체 view_count fallback
                  const ga4Views = post.slug ? pageViewsBySlug[post.slug] : undefined
                  const views = ga4Views ?? post.view_count ?? 0
                  return views.toLocaleString()
                })()}
              </span>
              <span className="text-xs text-gray-400 text-center">{publishedDate}</span>
              <div className="flex items-center justify-center gap-1">
                <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <Link href={`/editor/${post.id}`}><PenSquare className="w-3.5 h-3.5" /></Link>
                </Button>
                <Button size="sm" variant="ghost"
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(post.id)}
                  disabled={deletingId === post.id}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
