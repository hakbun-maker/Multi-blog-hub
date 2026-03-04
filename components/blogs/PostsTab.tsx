'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenSquare, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Post {
  id: string
  title: string | null
  status: string
  view_count: number | null
  published_at: string | null
  created_at: string
}

interface PostsTabProps {
  posts: Post[]
  blogId: string
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  published: { label: '발행', className: 'bg-green-100 text-green-700' },
  scheduled: { label: '예약', className: 'bg-yellow-100 text-yellow-700' },
  draft:     { label: '초안', className: 'bg-gray-100 text-gray-500' },
}

export function PostsTab({ posts, blogId }: PostsTabProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (postId: string) => {
    if (!confirm('이 글을 삭제하시겠습니까?')) return
    setDeletingId(postId)
    await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    setDeletingId(null)
    router.refresh()
  }

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

  return (
    <div className="space-y-1">
      {/* 헤더 */}
      <div className="grid grid-cols-[1fr_80px_80px_100px_100px] gap-4 px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-100">
        <span>제목</span>
        <span className="text-center">상태</span>
        <span className="text-center">조회수</span>
        <span className="text-center">발행일</span>
        <span className="text-center">편집</span>
      </div>

      {posts.map(post => {
        const status = STATUS_MAP[post.status] ?? STATUS_MAP.draft
        const publishedDate = post.published_at
          ? new Date(post.published_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
          : '-'
        return (
          <div key={post.id}
            className="grid grid-cols-[1fr_80px_80px_100px_100px] gap-4 px-3 py-3 items-center rounded-lg hover:bg-gray-50 transition-colors">
            <p className="text-sm text-gray-800 truncate font-medium">{post.title || '(제목 없음)'}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-center ${status.className}`}>
              {status.label}
            </span>
            <span className="text-sm text-gray-500 text-center flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" />{(post.view_count ?? 0).toLocaleString()}
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
  )
}
