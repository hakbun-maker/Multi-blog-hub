'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, FileText } from 'lucide-react'

interface PostNode {
  postId: string
  title: string
  revenue: number
  views: number
}

interface CategoryNode {
  categoryId: string | null
  categoryName: string
  revenue: number
  views: number
  posts: PostNode[]
}

interface DrilldownTreeProps {
  tree: CategoryNode[]
  loading: boolean
}

export function DrilldownTree({ tree, loading }: DrilldownTreeProps) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-12 bg-gray-100 rounded" />
        <div className="h-12 bg-gray-100 rounded" />
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="border border-gray-100 rounded-lg p-8 text-center text-sm text-gray-400">
        드릴다운할 데이터가 아직 없습니다.
      </div>
    )
  }

  const totalRev = tree.reduce((a, b) => a + b.revenue, 0)
  const totalViews = tree.reduce((a, b) => a + b.views, 0)

  const toggleCat = (id: string | null) => {
    const key = id ?? '__none__'
    setOpenCats(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 grid grid-cols-[1fr_80px_80px_60px] gap-2">
        <span>카테고리 / 글</span>
        <span className="text-right">조회수</span>
        <span className="text-right">수익</span>
        <span className="text-right">점유</span>
      </div>

      {tree.map(cat => {
        const key = cat.categoryId ?? '__none__'
        const isOpen = openCats.has(key)
        const catShare = totalRev > 0 ? (cat.revenue / totalRev) * 100 : 0

        return (
          <div key={key}>
            {/* 카테고리 행 */}
            <button
              onClick={() => toggleCat(cat.categoryId)}
              className="w-full grid grid-cols-[1fr_80px_80px_60px] gap-2 px-3 py-2.5 items-center text-sm hover:bg-blue-50/40 border-t border-gray-100 transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                }
                <FolderOpen className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-gray-800 font-medium truncate">{cat.categoryName}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">({cat.posts.length}개)</span>
              </div>
              <span className="text-xs text-gray-500 text-right tabular-nums">{cat.views.toLocaleString()}</span>
              <span className="text-xs text-gray-900 text-right font-medium tabular-nums">${cat.revenue.toFixed(2)}</span>
              <span className="text-xs text-gray-500 text-right tabular-nums">{catShare.toFixed(1)}%</span>
            </button>

            {/* 글 목록 (펼친 경우) */}
            {isOpen && cat.posts.length > 0 && (
              <div className="bg-gray-50/40">
                {cat.posts.map(post => {
                  const postShare = cat.revenue > 0 ? (post.revenue / cat.revenue) * 100 : 0
                  return (
                    <div
                      key={post.postId}
                      className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-3 py-1.5 items-center text-xs border-t border-gray-100"
                    >
                      <div className="flex items-center gap-1.5 pl-6 min-w-0">
                        <FileText className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{post.title}</span>
                      </div>
                      <span className="text-gray-500 text-right tabular-nums">{post.views.toLocaleString()}</span>
                      <span className="text-gray-700 text-right tabular-nums">${post.revenue.toFixed(2)}</span>
                      <span className="text-gray-400 text-right tabular-nums">{postShare.toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>
            )}
            {isOpen && cat.posts.length === 0 && (
              <div className="bg-gray-50/40 px-3 py-2 text-xs text-gray-400 text-center">
                이 카테고리에 글이 없습니다.
              </div>
            )}
          </div>
        )
      })}

      {/* 합계 */}
      <div className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-3 py-2 items-center text-xs font-semibold border-t-2 border-gray-200 bg-gray-50">
        <span className="text-gray-700">전체 합계</span>
        <span className="text-gray-700 text-right tabular-nums">{totalViews.toLocaleString()}</span>
        <span className="text-gray-900 text-right tabular-nums">${totalRev.toFixed(2)}</span>
        <span className="text-gray-500 text-right">100%</span>
      </div>
    </div>
  )
}
