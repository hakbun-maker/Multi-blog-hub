'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Eye } from 'lucide-react'

interface Blog {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
}

interface Post {
  id: string
  title: string
  slug: string
  meta_description?: string
  published_at: string
  view_count: number | null
  content_html?: string
}

export default function PublicBlogPage({ params }: { params: { slug: string } }) {
  const [blog, setBlog] = useState<Blog | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/public/blog?slug=${encodeURIComponent(params.slug)}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then(data => {
        if (!data) return
        setBlog(data.blog)
        setPosts(data.posts)
        setLoading(false)
      })
  }, [params.slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    )
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-500">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <p>블로그를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const color = blog.color ?? '#3b82f6'

  // 첫 번째 이미지 추출 (썸네일용)
  function extractFirstImage(html?: string): string | null {
    if (!html) return null
    const match = html.match(/<img[^>]+src="([^"]+)"/)
    return match?.[1] ?? null
  }

  // HTML 태그 제거 (요약용)
  function stripHtml(html?: string): string {
    if (!html) return ''
    return html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 블로그 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            <h1 className="text-2xl font-bold text-gray-900">{blog.name}</h1>
          </div>
          {blog.description && (
            <p className="text-gray-500 ml-7">{blog.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-2 ml-7">{posts.length}개의 글</p>
        </div>
      </header>

      {/* 글 목록 */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            아직 발행된 글이 없습니다.
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map(post => {
              const thumbnail = extractFirstImage(post.content_html)
              const excerpt = post.meta_description || stripHtml(post.content_html).slice(0, 150)
              const date = new Date(post.published_at).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })

              return (
                <Link key={post.id} href={`/blog/${blog.slug}/${post.slug}`}
                  className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                  <div className="flex">
                    <div className="flex-1 p-5">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {post.title}
                      </h2>
                      {excerpt && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{excerpt}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />{(post.view_count ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {thumbnail && (
                      <div className="w-40 flex-shrink-0">
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
