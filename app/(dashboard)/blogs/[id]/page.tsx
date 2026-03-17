'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, PenSquare, Globe, ArrowLeft, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PostsTab } from '@/components/blogs/PostsTab'
import { StatsTab } from '@/components/blogs/StatsTab'

type Tab = 'posts' | 'stats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'posts', label: '발행글' },
  { id: 'stats', label: '통계' },
]

const BLOG_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

export default function BlogDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('posts')
  const [blog, setBlog] = useState<{ id: string; name: string; color?: string; description?: string; url?: string; is_active?: boolean; subdomain?: string; custom_domain?: string; slug?: string } | null>(null)
  const [posts, setPosts] = useState<{ id: string; title: string | null; slug?: string; status: string; view_count: number | null; published_at: string | null; created_at: string; category_id?: string | null }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [blogRes, postsRes, catRes] = await Promise.all([
        fetch(`/api/blogs/${params.id}`),
        fetch(`/api/posts?blogId=${params.id}`),
        fetch(`/api/categories?blogId=${params.id}`),
      ])

      if (!blogRes.ok) { router.push('/blogs'); return }

      const [{ data: blogData }, { data: postsData }, { data: catData }] = await Promise.all([
        blogRes.json(),
        postsRes.json(),
        catRes.json(),
      ])

      setBlog(blogData)
      setPosts(postsData ?? [])
      setCategories(catData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-24 bg-gray-100 rounded" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    )
  }

  if (!blog) return null

  const color = blog.color ?? BLOG_COLORS[0]
  const publishedCount = posts.filter((p) => p.status === 'published').length
  const publicUrl = blog.custom_domain ? `https://${blog.custom_domain}` : `/blog/${blog.slug}`

  return (
    <div className="space-y-6">
      {/* BlogHeader */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button asChild variant="ghost" size="sm" className="mt-0.5 h-8 w-8 p-0 flex-shrink-0">
            <Link href="/blogs"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color }} />
              <h1 className="text-2xl font-bold text-gray-900 break-words">{blog.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${blog.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {blog.is_active ? '활성' : '비활성'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 ml-6">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-400 break-all">{blog.subdomain ?? blog.custom_domain ?? blog.slug}</span>
            </div>
            {blog.description && (
              <p className="text-sm text-gray-500 mt-1 ml-6">{blog.description}</p>
            )}
            <div className="flex gap-3 mt-2 ml-6 text-xs text-gray-500">
              <span>발행 {publishedCount}개</span>
              <span>전체 {posts.length}개</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1.5" />공개 페이지
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href={`/editor/new?blogId=${blog.id}`}>
              <PenSquare className="w-4 h-4 mr-1.5" />글 작성
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/blogs/${blog.id}/settings`}>
              <Settings className="w-4 h-4 mr-1.5" />설정
            </Link>
          </Button>
        </div>
      </div>

      {/* TabNav */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {t.id === 'posts' && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {posts.length}
                </span>
              )}
              {/* memo 뱃지는 MemoTab이 직접 fetch하므로 제거 */}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 콘텐츠 */}
      <div>
        {tab === 'posts' && <PostsTab posts={posts} blogId={blog.id} blogSlug={blog.slug} categories={categories} />}
        {tab === 'stats' && <StatsTab posts={posts} />}
      </div>
    </div>
  )
}
