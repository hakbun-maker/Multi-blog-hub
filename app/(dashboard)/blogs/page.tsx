'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Globe, Plus, Settings, Search, Pencil, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const BLOG_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

const LANGUAGE_LABELS: Record<string, string> = {
  'ko': '한국어',
  'en': 'English',
  'ja': '日本語',
  'de': 'Deutsch',
  'pt_br': 'Português',
  'es': 'Español',
}

const BLOG_TYPE_LABELS: Record<string, string> = {
  'legal': '법률',
  'finance': '금융/재테크',
  'medical': '의료/건강',
  'it-tech': 'IT/테크',
  'education': '교육',
  'beauty-fashion': '뷰티/패션',
  'food': '음식/요리',
  'travel': '여행',
  'parenting': '육아/가족',
  'lifestyle': '라이프스타일',
  'real-estate': '부동산',
  'business': '비즈니스/마케팅',
  'entertainment': '엔터테인먼트',
  'sports': '스포츠/피트니스',
  'pets': '반려동물',
  'automotive': '자동차',
  'interior': '인테리어/홈',
  'news': '뉴스/시사',
  'science': '과학/기술',
  'other': '기타',
}

type Blog = {
  id: string
  name: string
  color?: string
  description?: string
  is_active?: boolean
  subdomain?: string
  custom_domain?: string
  slug?: string
  blog_type?: string
  language?: string
}

type Post = {
  id: string
  blog_id: string
  title: string
  slug?: string
  status: string
  view_count: number | null
  published_at: string | null
  created_at: string
  keyword?: string
}

type SortKey = 'created_at_desc' | 'published_at_desc' | 'view_count_desc' | 'title_asc'

export default function BlogsPage() {
  const [activeTab, setActiveTab] = useState<'blogs' | 'posts'>('blogs')

  const [blogs, setBlogs] = useState<Blog[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loadingBlogs, setLoadingBlogs] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)

  // 블로그 글 관리 필터 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBlog, setFilterBlog] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at_desc')

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const res = await fetch('/api/blogs')
        const json = await res.json()
        setBlogs(json.data ?? [])
      } catch {
        setBlogs([])
      } finally {
        setLoadingBlogs(false)
      }
    }
    fetchBlogs()
  }, [])

  useEffect(() => {
    if (activeTab !== 'posts') return
    async function fetchPosts() {
      try {
        const res = await fetch('/api/posts')
        const json = await res.json()
        setPosts(json.data ?? [])
      } catch {
        setPosts([])
      } finally {
        setLoadingPosts(false)
      }
    }
    fetchPosts()
  }, [activeTab])

  // 블로그 카드용 포스트 수 집계 (blogs 탭에서도 필요하므로 별도 fetch 없이 posts 재활용)
  const postCountByBlog = useMemo(() => {
    const map: Record<string, { total: number; published: number }> = {}
    for (const p of posts) {
      if (!map[p.blog_id]) map[p.blog_id] = { total: 0, published: 0 }
      map[p.blog_id].total++
      if (p.status === 'published') map[p.blog_id].published++
    }
    return map
  }, [posts])

  const blogMap = useMemo(() => {
    const m: Record<string, Blog> = {}
    for (const b of blogs) m[b.id] = b
    return m
  }, [blogs])

  const filteredPosts = useMemo(() => {
    let result = [...posts]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q))
    }
    if (filterBlog) {
      result = result.filter(p => p.blog_id === filterBlog)
    }
    if (filterStatus) {
      result = result.filter(p => p.status === filterStatus)
    }
    if (filterType) {
      result = result.filter(p => {
        const blog = blogMap[p.blog_id]
        return blog?.blog_type === filterType
      })
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case 'published_at_desc': {
          const ta = a.published_at ? new Date(a.published_at).getTime() : 0
          const tb = b.published_at ? new Date(b.published_at).getTime() : 0
          return tb - ta
        }
        case 'view_count_desc':
          return (b.view_count ?? 0) - (a.view_count ?? 0)
        case 'title_asc':
          return a.title.localeCompare(b.title, 'ko')
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return result
  }, [posts, searchQuery, filterBlog, filterStatus, filterType, sortKey, blogMap])

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTab === 'blogs'
              ? (loadingBlogs ? '불러오는 중...' : `총 ${blogs.length}개의 블로그`)
              : (loadingPosts ? '불러오는 중...' : `총 ${filteredPosts.length}개의 글`)}
          </p>
        </div>
        {activeTab === 'blogs' && (
          <Button asChild>
            <Link href="/blogs/new"><Plus className="w-4 h-4 mr-1.5" />새 블로그</Link>
          </Button>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('blogs')}
            className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'blogs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            블로그 관리
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            블로그 글 관리
          </button>
        </nav>
      </div>

      {/* 탭 1: 블로그 관리 */}
      {activeTab === 'blogs' && (
        <div className="space-y-4">

          {loadingBlogs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="shadow-none border border-gray-200">
                  <CardContent className="p-5 space-y-3">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-8 bg-gray-200 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !blogs.length ? (
            <Card className="shadow-none border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2 font-medium">아직 블로그가 없습니다</p>
                <p className="text-sm text-gray-400 mb-6">첫 번째 블로그를 만들어 콘텐츠를 시작해보세요.</p>
                <Button asChild>
                  <Link href="/blogs/new">첫 블로그 만들기</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogs.map((blog, i) => {
                const color = blog.color ?? BLOG_COLORS[i % BLOG_COLORS.length]
                const counts = postCountByBlog[blog.id] ?? { total: 0, published: 0 }
                const langLabel = LANGUAGE_LABELS[blog.language ?? 'ko'] ?? '한국어'
                return (
                  <Card key={blog.id} className="shadow-none border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all h-full">
                    <CardContent className="p-5 h-full flex flex-col">
                      {/* 1행: 배지 (오른쪽 정렬) */}
                      <div className="flex flex-wrap items-center gap-1.5 justify-end mb-2">
                        {blog.blog_type && BLOG_TYPE_LABELS[blog.blog_type] && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                            {BLOG_TYPE_LABELS[blog.blog_type]}
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          {langLabel}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${blog.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {blog.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                      {/* 2행: 블로그명 */}
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <h3 className="font-semibold text-gray-900 truncate">{blog.name}</h3>
                      </div>
                      {/* 3행: 도메인/슬러그 */}
                      <p className="text-xs text-gray-400 mb-2 truncate">{blog.custom_domain ?? blog.subdomain ?? blog.slug}</p>
                      {/* 4행: 설명 */}
                      {blog.description && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{blog.description}</p>
                      )}
                      <div className="flex-1" />
                      {/* 5행: 글 수 */}
                      <p className="text-xs text-gray-500 mb-3">전체 글 {counts.total}개</p>
                      {/* 6행: 버튼 */}
                      <div className="flex gap-2">
                        <Button asChild size="sm" className="flex-1">
                          <Link href={`/blogs/${blog.id}`}>확인</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/blogs/${blog.id}/settings`}><Settings className="w-3.5 h-3.5 mr-1" />설정</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* 새 블로그 추가 카드 */}
              <Link href="/blogs/new">
                <Card className="shadow-none border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer h-full min-h-[180px]">
                  <CardContent className="p-5 h-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 transition-colors">
                    <Plus className="w-8 h-8" />
                    <span className="text-sm font-medium">새 블로그 추가</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 탭 2: 블로그 글 관리 */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* 검색 / 필터 / 정렬 */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="제목 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm w-48"
              />
            </div>

            <select
              value={filterBlog}
              onChange={e => setFilterBlog(e.target.value)}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 블로그</option>
              {blogs.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 상태</option>
              <option value="published">발행</option>
              <option value="draft">임시저장</option>
            </select>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 유형</option>
              {Object.entries(BLOG_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at_desc">최신순</option>
              <option value="published_at_desc">발행일순</option>
              <option value="view_count_desc">조회수순</option>
              <option value="title_asc">제목순</option>
            </select>
          </div>

          {/* 테이블 */}
          {loadingPosts ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4 px-4 py-3 border border-gray-100 rounded-md">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-100 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded flex-1" />
                  <div className="h-4 bg-gray-100 rounded w-16" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">블로그명</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">유형</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">언어</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-[200px]">제목</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">상태</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap max-w-[80px]">키워드</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">조회수</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">발행일</th>
                    <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">편집</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                        검색 결과가 없습니다
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post, i) => {
                      const blog = blogMap[post.blog_id]
                      const blogIndex = blog ? blogs.findIndex(b => b.id === blog.id) : -1
                      const blogColor = blog?.color ?? (blogIndex >= 0 ? BLOG_COLORS[blogIndex % BLOG_COLORS.length] : '#94a3b8')
                      const typeLabel = blog?.blog_type ? (BLOG_TYPE_LABELS[blog.blog_type] ?? '-') : '-'
                      return (
                        <tr key={post.id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: blogColor }} />
                              <span className="text-gray-800 font-medium">{blog?.name ?? '-'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {typeLabel !== '-' ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                {typeLabel}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {blog?.language && blog.language !== 'ko' && LANGUAGE_LABELS[blog.language] ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                {LANGUAGE_LABELS[blog.language]}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">한국어</span>
                            )}
                          </td>
                          <td className="px-4 py-3 min-w-[200px]">
                            {post.status === 'published' && blog?.slug && post.slug ? (
                              <a href={`/blog/${blog.slug}/${post.slug}`} target="_blank" rel="noopener noreferrer"
                                className="text-gray-900 line-clamp-1 hover:text-blue-600 hover:underline inline-flex items-center gap-1">
                                {post.title}
                                <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-400" />
                              </a>
                            ) : (
                              <span className="text-gray-900 line-clamp-1">{post.title}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {post.status === 'published' ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">발행</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">임시저장</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap max-w-[80px]">
                            <span className="text-gray-500 text-xs truncate block">{post.keyword ?? '-'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-gray-600">{post.view_count ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-gray-500 text-xs">{formatDate(post.published_at)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <Link
                              href={`/editor/${post.id}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                              title="편집"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
