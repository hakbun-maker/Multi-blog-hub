'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Eye, FileText, TrendingUp, DollarSign, BarChart2, Loader2 } from 'lucide-react'

interface StatData {
  total_views: number
  total_posts: number
  avg_views_per_post: number
  estimated_revenue: number
  blogs: BlogStat[]
  top_posts: PostStat[]
}

interface BlogStat {
  blog_id: string
  blog_name: string
  color: string
  views: number
  posts: number
  revenue: number
}

interface PostStat {
  id: string
  title: string
  view_count: number
  blog_name: string
  published_at: string
}

export default function StatsPage() {
  const [data, setData] = useState<StatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stats?days=${period}`)
      const json = await res.json()
      setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchStats() }, [fetchStats])

  const maxViews = data?.blogs ? Math.max(...data.blogs.map(b => b.views), 1) : 1

  const statCards = [
    { label: '총 조회수', value: data?.total_views.toLocaleString() ?? '0', icon: Eye, color: 'text-blue-500' },
    { label: '총 게시글', value: data?.total_posts.toLocaleString() ?? '0', icon: FileText, color: 'text-violet-500' },
    { label: '평균 조회수', value: data?.avg_views_per_post.toFixed(1) ?? '0', icon: TrendingUp, color: 'text-green-500' },
    { label: '예상 수익', value: `$${(data?.estimated_revenue ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-amber-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">통계</h1>
          <p className="text-muted-foreground text-sm">블로그 성과를 분석합니다</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">최근 7일</SelectItem>
            <SelectItem value="30">최근 30일</SelectItem>
            <SelectItem value="90">최근 90일</SelectItem>
            <SelectItem value="365">최근 1년</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(card => (
              <Card key={card.label}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 블로그별 조회수 비교 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" /> 블로그별 조회수
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.blogs?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {data.blogs.sort((a, b) => b.views - a.views).map(blog => (
                      <div key={blog.blog_id}>
                        <div className="flex justify-between text-sm mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: blog.color ?? '#6366f1' }} />
                            <span className="font-medium">{blog.blog_name}</span>
                          </div>
                          <span className="text-muted-foreground">{blog.views.toLocaleString()}회</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(blog.views / maxViews) * 100}%`,
                              background: blog.color ?? '#6366f1',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 블로그별 수익 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> 블로그별 예상 수익
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.blogs?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {data.blogs.sort((a, b) => b.revenue - a.revenue).map(blog => (
                      <div key={blog.blog_id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: blog.color ?? '#6366f1' }} />
                          <span className="text-sm font-medium">{blog.blog_name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">${blog.revenue.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{blog.posts}개 글</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 인기 게시글 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">인기 게시글 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.top_posts?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">게시글이 없습니다.</p>
              ) : (
                <div className="space-y-1">
                  {data.top_posts.map((post, i) => (
                    <div key={post.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground">{post.blog_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />{post.view_count.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
