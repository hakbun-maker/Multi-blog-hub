'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'

interface BlogInfo {
  id: string
  name: string
  color: string | null
  description?: string
}

export default function PreviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [blog, setBlog] = useState<BlogInfo | null>(null)

  const title = searchParams.get('title') ?? ''
  const blogId = searchParams.get('blogId')

  // localStorage에서 미리보기 데이터 로드
  const [htmlContent, setHtmlContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [seoDescription, setSeoDescription] = useState('')

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('__preview_data__') ?? '{}')
      setHtmlContent(data.htmlContent ?? '')
      setTags(data.tags ?? [])
      setSeoDescription(data.seoDescription ?? '')
    } catch { /* ignore */ }

    if (blogId) {
      fetch(`/api/blogs/${blogId}`)
        .then(r => r.json())
        .then(d => setBlog(d.data ?? null))
        .catch(() => {})
    }
  }, [blogId])

  const blogColor = blog?.color ?? '#3b82f6'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 미리보기 툴바 */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="w-4 h-4" />돌아가기
          </Button>
          <span className="text-sm text-gray-400">미리보기 모드</span>
        </div>
        {blog && (
          <span className="text-xs px-2 py-1 rounded-full text-white" style={{ background: blogColor }}>
            {blog.name}
          </span>
        )}
      </div>

      {/* 블로그 스타일 헤더 */}
      <div className="w-full" style={{ background: `linear-gradient(135deg, ${blogColor}, ${blogColor}dd)` }}>
        <div className="max-w-3xl mx-auto px-6 py-12 text-white">
          {blog && <p className="text-sm opacity-80 mb-2">{blog.name}</p>}
          <h1 className="text-3xl font-bold leading-tight">{title || '(제목 없음)'}</h1>
          {seoDescription && (
            <p className="mt-3 text-sm opacity-80 leading-relaxed">{seoDescription}</p>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs opacity-70">
            <span>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <article
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-img:rounded-lg prose-li:text-gray-700"
          dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-gray-400">본문이 비어있습니다.</p>' }}
        />

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 블로그 정보 하단 */}
        {blog && (
          <div className="mt-8 p-4 rounded-lg border border-gray-200 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: blogColor }}>
              {blog.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{blog.name}</p>
              {blog.description && <p className="text-xs text-gray-500">{blog.description}</p>}
            </div>
            <Button size="sm" variant="outline" className="ml-auto gap-1 text-xs">
              <ExternalLink className="w-3 h-3" />블로그 방문
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
