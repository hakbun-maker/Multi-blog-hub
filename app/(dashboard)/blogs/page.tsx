import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Globe, PenSquare, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const BLOG_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

export default async function BlogsPage() {
  const supabase = createClient()
  const [{ data: blogs }, { data: posts }] = await Promise.all([
    supabase.from('blogs').select('*').order('created_at', { ascending: true }),
    supabase.from('posts').select('id, blog_id, status'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">블로그 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {blogs?.length ?? 0}개의 블로그</p>
        </div>
        <Button asChild>
          <Link href="/blogs/new"><Plus className="w-4 h-4 mr-1.5" />새 블로그</Link>
        </Button>
      </div>

      {!blogs?.length ? (
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
            const blogPosts = posts?.filter(p => p.blog_id === blog.id) ?? []
            const published = blogPosts.filter(p => p.status === 'published').length
            return (
              <Card key={blog.id} className="shadow-none border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <h3 className="font-semibold text-gray-900">{blog.name}</h3>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${blog.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {blog.is_active ? '활성' : '비활성'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{blog.subdomain ?? blog.custom_domain ?? blog.slug}</p>
                  {blog.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{blog.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>발행 {published}개</span>
                    <span>전체 {blogPosts.length}개</span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/editor/new?blogId=${blog.id}`}>
                        <PenSquare className="w-3.5 h-3.5 mr-1" />글 작성
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/blogs/${blog.id}`}>상세 보기</Link>
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
  )
}
