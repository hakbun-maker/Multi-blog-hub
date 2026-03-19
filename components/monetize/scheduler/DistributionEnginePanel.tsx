'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Zap, CheckCircle } from 'lucide-react'
import { BlogDistributionPreview } from './BlogDistributionPreview'
import type { DistributionPreviewItem } from '@/types/monetize'

interface Blog {
  id: string
  name: string
}

interface DistributionState {
  previews: DistributionPreviewItem[] | null
  loading: boolean
  error: string | null
  confirming: boolean
  success: boolean
}

export function DistributionEnginePanel() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set())
  const [state, setState] = useState<DistributionState>({
    previews: null,
    loading: false,
    error: null,
    confirming: false,
    success: false,
  })

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      // Fetch user's blogs
      const response = await fetch('/api/blogs')
      if (!response.ok) throw new Error('Failed to fetch blogs')
      const data = await response.json()
      setBlogs(data.blogs || [])
      // Initialize all blogs as selected by default
      if (data.blogs) {
        setSelectedBlogs(new Set(data.blogs.map((b: Blog) => b.id)))
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch blogs',
      }))
    }
  }

  const handleBlogToggle = (blogId: string) => {
    setSelectedBlogs((prev) => {
      const next = new Set(prev)
      if (next.has(blogId)) {
        next.delete(blogId)
      } else {
        next.add(blogId)
      }
      return next
    })
  }

  const handleDistribute = async () => {
    if (selectedBlogs.size === 0) {
      setState((prev) => ({ ...prev, error: '배분할 블로그를 선택해주세요' }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null, success: false }))

    try {
      const response = await fetch('/api/monetize/scheduler/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogIds: Array.from(selectedBlogs) }),
      })

      if (!response.ok) throw new Error('Distribution failed')
      const data = await response.json()
      setState((prev) => ({
        ...prev,
        previews: data.previews,
        loading: false,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Distribution failed',
        loading: false,
      }))
    }
  }

  const handleConfirm = async () => {
    if (!state.previews || state.previews.length === 0) return

    setState((prev) => ({ ...prev, confirming: true, error: null }))

    try {
      const response = await fetch('/api/monetize/scheduler/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previews: state.previews }),
      })

      if (!response.ok) throw new Error('Confirmation failed')
      setState((prev) => ({
        ...prev,
        previews: null,
        confirming: false,
        success: true,
      }))

      // Hide success message after 3 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, success: false }))
      }, 3000)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Confirmation failed',
        confirming: false,
      }))
    }
  }

  const handleCancel = () => {
    setState((prev) => ({
      ...prev,
      previews: null,
      error: null,
    }))
  }

  const previewCount = state.previews?.length || 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">자동 배분</h3>

      {/* Blog selection */}
      {!state.previews && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">배분할 블로그 선택</div>
          {blogs.length === 0 ? (
            <div className="text-sm text-gray-500">등록된 블로그가 없습니다</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {blogs.map((blog) => (
                <label key={blog.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBlogs.has(blog.id)}
                    onChange={() => handleBlogToggle(blog.id)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">{blog.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{state.error}</div>
        </div>
      )}

      {/* Success message */}
      {state.success && (
        <div className="flex items-start gap-3 p-3 bg-green-50 rounded border border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">배분 확정이 완료되었습니다</div>
        </div>
      )}

      {/* Distribution preview */}
      {state.previews && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">{previewCount}개 항목 배분 예정</div>
          <div className="max-h-96 overflow-y-auto">
            <BlogDistributionPreview previews={state.previews} />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!state.previews ? (
          <button
            onClick={handleDistribute}
            disabled={state.loading || selectedBlogs.size === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
          >
            <Zap className="w-4 h-4" />
            {state.loading ? '배분 중...' : '자동 배분 실행'}
          </button>
        ) : (
          <>
            <button
              onClick={handleConfirm}
              disabled={state.confirming}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
            >
              {state.confirming ? '확정 중...' : '적용 확정'}
            </button>
            <button
              onClick={handleCancel}
              disabled={state.confirming}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded font-medium hover:bg-gray-200 disabled:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </>
        )}
      </div>
    </div>
  )
}
