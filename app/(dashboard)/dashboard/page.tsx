import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PenSquare, CalendarClock, Globe, FileText, Eye, Users, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const BLOG_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const [{ data: blogs }, { data: posts }] = await Promise.all([
    supabase.from('blogs').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('posts').select('*').eq('user_id', userId).order('published_at', { ascending: false }),
  ])

  const publishedPosts = posts?.filter(p => p.status === 'published') ?? []
  const totalViews = posts?.reduce((sum, p) => sum + (p.view_count ?? 0), 0) ?? 0
  const recentPublished = publishedPosts.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* 헤더 + QuickActionButtons */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/editor/new"><PenSquare className="w-4 h-4 mr-1.5" />글 작성</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/scheduler"><CalendarClock className="w-4 h-4 mr-1.5" />스케줄 추가</Link>
          </Button>
        </div>
      </div>

      {/* StatSummaryBar: 총 방문자 / 조회수 / 글 수 / 예상 수익 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '총 방문자', value: 0, icon: Users, color: 'text-blue-600 bg-blue-50', suffix: '명' },
          { label: '총 조회수', value: totalViews, icon: Eye, color: 'text-green-600 bg-green-50', suffix: '회' },
          { label: '총 글 수', value: posts?.length ?? 0, icon: FileText, color: 'text-purple-600 bg-purple-50', suffix: '개' },
          { label: '예상 수익', value: 0, icon: DollarSign, color: 'text-orange-600 bg-orange-50', prefix: '$' },
        ].map(({ label, value, icon: Icon, color, suffix, prefix }) => (
          <Card key={label} className="shadow-none border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {prefix}{value.toLocaleString()}{suffix}
                </p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BlogStatGrid: 블로그별 통계 카드 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">내 블로그</h2>
            <Link href="/blogs" className="text-sm text-blue-600 hover:underline">전체 보기</Link>
          </div>

          {!blogs?.length ? (
            <Card className="shadow-none border-dashed border-gray-300">
              <CardContent className="p-8 text-center">
                <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">아직 블로그가 없습니다.</p>
                <Button asChild size="sm">
                  <Link href="/blogs/new">첫 블로그 만들기</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {blogs.map((blog, i) => {
                const color = blog.color ?? BLOG_COLORS[i % BLOG_COLORS.length]
                const blogPosts = posts?.filter(p => p.blog_id === blog.id) ?? []
                const published = blogPosts.filter(p => p.status === 'published').length
                const views = blogPosts.reduce((sum, p) => sum + (p.view_count ?? 0), 0)
                return (
                  <Link key={blog.id} href={`/blogs/${blog.id}`}>
                    <Card className="shadow-none border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{blog.name}</p>
                            <p className="text-xs text-gray-400 truncate">{blog.subdomain ?? blog.custom_domain ?? blog.slug}</p>
                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />발행 {published}개
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />조회 {views.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {/* RevenueOverview: 광고별 수익 기여 현황 */}
          <div className="mt-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">수익 현황</h2>
            <Card className="shadow-none border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">광고별 수익 기여 현황</span>
                </div>
                {!blogs?.length ? (
                  <p className="text-sm text-gray-400 text-center py-4">광고 설정 후 수익 현황이 표시됩니다.</p>
                ) : (
                  <div className="space-y-3">
                    {blogs.slice(0, 4).map((blog, i) => {
                      const color = blog.color ?? BLOG_COLORS[i % BLOG_COLORS.length]
                      return (
                        <div key={blog.id} className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm text-gray-600 flex-1 truncate">{blog.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: '0%' }} />
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right">$0</span>
                          </div>
                        </div>
                      )
                    })}
                    <p className="text-xs text-gray-400 pt-1">* 광고 연동 후 실제 수익이 표시됩니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RecentPostsList: 최근 발행글 10개 */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">최근 발행글</h2>
          {!recentPublished.length ? (
            <p className="text-sm text-gray-400">아직 발행된 글이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentPublished.map(post => {
                const blog = blogs?.find(b => b.id === post.blog_id)
                const color = blog?.color ?? '#3b82f6'
                return (
                  <Link key={post.id} href={`/editor/${post.id}`}>
                    <div className="flex items-start gap-2 p-3 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all cursor-pointer">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{post.title || '(제목 없음)'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">발행</span>
                          <span className="text-xs text-gray-400 truncate">{blog?.name}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
