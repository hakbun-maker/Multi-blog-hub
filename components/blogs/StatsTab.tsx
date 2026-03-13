import { Eye, FileText, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Post {
  id: string
  title: string | null
  status: string
  view_count: number | null
  published_at: string | null
}

interface StatsTabProps {
  posts: Post[]
}

export function StatsTab({ posts }: StatsTabProps) {
  const publishedPosts = posts.filter(p => p.status === 'published')
  const totalViews = posts.reduce((sum, p) => sum + (p.view_count ?? 0), 0)
  const avgViews = publishedPosts.length > 0 ? Math.round(totalViews / publishedPosts.length) : 0
  const topPosts = [...publishedPosts]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 5)
  const maxViews = topPosts[0]?.view_count ?? 1

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '총 조회수', value: totalViews.toLocaleString(), icon: Eye, color: 'text-blue-600 bg-blue-50' },
          { label: '발행 글 수', value: publishedPosts.length, icon: FileText, color: 'text-green-600 bg-green-50' },
          { label: '평균 조회수', value: avgViews.toLocaleString(), icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-none border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 방문자 통계 안내 */}
      <Card className="shadow-none border border-gray-200">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">방문자 통계</h3>
          <div className="py-8 text-center text-gray-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">방문자 추적 스크립트 연동 후 통계가 표시됩니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* 인기 글 Top 5 */}
      {topPosts.length > 0 && (
        <Card className="shadow-none border border-gray-200">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">조회수 Top {topPosts.length}</h3>
            <div className="space-y-3">
              {topPosts.map((post, i) => {
                const views = post.view_count ?? 0
                const pct = maxViews > 0 ? Math.round((views / maxViews) * 100) : 0
                return (
                  <div key={post.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                        <span className="text-gray-700 truncate">{post.title || '(제목 없음)'}</span>
                      </span>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {views.toLocaleString()}회
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
