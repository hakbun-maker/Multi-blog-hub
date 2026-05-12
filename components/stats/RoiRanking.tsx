'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface PostRoi {
  postId: string
  title: string
  slug: string | null
  blogId: string
  blogName: string
  categoryId: string | null
  categoryName: string | null
  views: number
  revenue: number
  rpm: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
}

interface RoiRankingProps {
  top: PostRoi[]
  bottom: PostRoi[]
  loading: boolean
  blogSlugById?: Record<string, string>
  blogCustomDomainById?: Record<string, string | null>
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://multi-blog-hub.vercel.app').replace(/\/$/, '')

const GRADE_COLOR: Record<PostRoi['grade'], string> = {
  S: 'bg-purple-100 text-purple-700 border-purple-200',
  A: 'bg-blue-100 text-blue-700 border-blue-200',
  B: 'bg-green-100 text-green-700 border-green-200',
  C: 'bg-amber-100 text-amber-700 border-amber-200',
  D: 'bg-red-100 text-red-700 border-red-200',
}

export function RoiRanking({ top, bottom, loading, blogSlugById, blogCustomDomainById }: RoiRankingProps) {
  const [view, setView] = useState<'top' | 'bottom'>('top')

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
      </div>
    )
  }

  const list = view === 'top' ? top : bottom
  if (list.length === 0) {
    return (
      <div className="border border-gray-100 rounded-lg p-8 text-center text-sm text-gray-400">
        아직 ROI 데이터가 충분하지 않습니다. (조회수 0인 글은 제외)
      </div>
    )
  }

  const buildUrl = (post: PostRoi) => {
    if (!post.slug) return null
    const customDomain = blogCustomDomainById?.[post.blogId]
    if (customDomain) return `https://${customDomain}/${encodeURIComponent(post.slug)}`
    const blogSlug = blogSlugById?.[post.blogId]
    if (!blogSlug) return null
    return `${APP_URL}/blog/${encodeURIComponent(blogSlug)}/${encodeURIComponent(post.slug)}`
  }

  return (
    <div className="space-y-3">
      {/* 토글 */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setView('top')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              view === 'top' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Top {top.length}
          </button>
          <button
            onClick={() => setView('bottom')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              view === 'bottom' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Bottom {bottom.length}
          </button>
        </div>
        <span className="text-[11px] text-gray-400">
          {view === 'top' ? '수익 상위 — 키울 후보' : '수익 하위 — 리라이팅·삭제 후보'}
        </span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50">
            <tr className="text-xs text-gray-400 font-medium">
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left">제목</th>
              <th className="px-3 py-2 text-left w-24">블로그</th>
              <th className="px-3 py-2 text-left w-20">카테고리</th>
              <th className="px-3 py-2 text-right w-20">조회수</th>
              <th className="px-3 py-2 text-right w-20">수익</th>
              <th className="px-3 py-2 text-right w-20">RPM</th>
              <th className="px-3 py-2 text-center w-12">등급</th>
            </tr>
          </thead>
          <tbody>
            {list.map((post, i) => {
              const url = buildUrl(post)
              return (
                <tr key={post.postId} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 max-w-[320px]">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-800 hover:text-blue-600 hover:underline inline-flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{post.title}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-300" />
                      </a>
                    ) : (
                      <span className="text-gray-800 truncate block">{post.title}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[96px]">{post.blogName}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[80px]">{post.categoryName ?? '미분류'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 text-right tabular-nums">{post.views.toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-right font-medium tabular-nums">${post.revenue.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 text-right tabular-nums">${post.rpm.toFixed(2)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${GRADE_COLOR[post.grade]}`}>
                      {post.grade}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400">
        * 글별 수익은 블로그 AdSense 합계를 GA4 페이지뷰 비율로 분배한 근사치입니다.
      </p>
    </div>
  )
}
