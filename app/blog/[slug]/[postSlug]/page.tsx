'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Eye, Tag } from 'lucide-react'

interface Blog {
  id: string
  name: string
  slug: string
  color?: string
}

interface Post {
  id: string
  title: string
  slug: string
  content_html: string
  keyword?: string
  seo_title?: string
  meta_description?: string
  published_at: string
  view_count: number | null
}

export default function PublicPostPage({ params }: { params: { slug: string; postSlug: string } }) {
  const [blog, setBlog] = useState<Blog | null>(null)
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const decodedPostSlug = decodeURIComponent(params.postSlug)
    fetch(`/api/public/blog?slug=${encodeURIComponent(params.slug)}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then(data => {
        if (!data) return
        setBlog(data.blog)
        const found = data.posts.find((p: Post) => p.slug === decodedPostSlug)
        if (!found) { setNotFound(true) } else { setPost(found) }
        setLoading(false)
      })
  }, [params.slug, params.postSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    )
  }

  if (notFound || !blog || !post) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <p>글을 찾을 수 없습니다.</p>
        <Link href={`/blog/${params.slug}`} className="mt-4 text-blue-600 hover:underline text-sm">
          블로그로 돌아가기
        </Link>
      </div>
    )
  }

  const color = blog.color ?? '#3b82f6'
  const date = new Date(post.published_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const tags = post.keyword ? post.keyword.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 네비 */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/blog/${blog.slug}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-medium">{blog.name}</span>
          </Link>
        </div>
      </header>

      {/* 글 본문 */}
      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* 제목 */}
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
          {post.seo_title || post.title}
        </h1>

        {/* 메타 정보 */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />{date}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />{(post.view_count ?? 0).toLocaleString()}회
          </span>
        </div>

        {/* 본문 HTML */}
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content_html || '' }}
        />

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            {tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* 푸터 */}
      <footer className="border-t border-gray-100 py-6 text-center">
        <Link href={`/blog/${blog.slug}`}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          &larr; {blog.name} 블로그로 돌아가기
        </Link>
      </footer>
    </div>
  )
}
