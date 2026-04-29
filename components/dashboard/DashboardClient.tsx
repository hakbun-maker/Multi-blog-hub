'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Eye, Users, FileText, DollarSign, TrendingUp, Globe,
  AlertCircle, RefreshCw,
} from 'lucide-react'

const BLOG_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#84cc16','#f97316',
]

const BLOG_TYPE_LABELS: Record<string, string> = {
  legal: '법률', finance: '금융', medical: '의료', 'it-tech': 'IT', education: '교육',
  'beauty-fashion': '뷰티', food: '음식', travel: '여행', parenting: '육아', lifestyle: '라이프',
  'real-estate': '부동산', business: '비즈니스', entertainment: '엔터', sports: '스포츠', pets: '반려동물',
  automotive: '자동차', interior: '인테리어', news: '뉴스', science: '과학', other: '기타',
}

const LANG_LABELS: Record<string, string> = {
  ko: '한국어', en: 'EN', ja: '日本語', de: 'DE', pt_br: 'PT', es: 'ES',
}

export interface DashboardBlogMeta {
  id: string
  name: string
  slug: string | null
  custom_domain: string | null
  subdomain?: string | null
  color: string | null
  blog_type: string | null
  language: string | null
  publishedCount: number
}

export interface DashboardRecentPost {
  id: string
  title: string
  slug: string
  blog_id: string
}

interface BlogStat {
  id: string
  name: string
  slug: string | null
  color: string | null
  custom_domain: string | null
  ga4PropertyId: string | null
  visitors: number
  pageViews: number
  sessions: number
  revenueUsd: number
  source: { traffic: 'ga4' | 'fallback'; revenue: 'adsense' | 'estimate' }
}

interface AnalyticsResponse {
  range: { startDate: string; endDate: string; days: number }
  connections: {
    ga4: boolean
    adsense: boolean
    adsenseAccountId: string | null
    hasAdsenseScope: boolean
  }
  totals: { visitors: number; pageViews: number; sessions: number; revenueUsd: number }
  blogs: BlogStat[]
}

interface Props {
  blogs: DashboardBlogMeta[]
  recentPublished: DashboardRecentPost[]
  totalPosts: number
  defaultBlogId: string | null
}

export default function DashboardClient({ blogs, recentPublished, totalPosts, defaultBlogId }: Props) {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard/analytics?days=30', { cache: 'no-store' })
      if (!res.ok) throw new Error(`API ${res.status}`)
      setData((await res.json()) as AnalyticsResponse)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '로드 실패')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])
  const handleRefresh = () => { setRefreshing(true); load() }

  const totals = data?.totals ?? { visitors: 0, pageViews: 0, sessions: 0, revenueUsd: 0 }
  const conn = data?.connections
  const statByBlogId: Record<string, BlogStat> = {}
  for (const b of data?.blogs ?? []) statByBlogId[b.id] = b
  const maxRevenue = Math.max(0.01, ...(data?.blogs ?? []).map(b => b.revenueUsd))

  const blogsMissingGa4 = (data?.blogs ?? []).filter(b => !b.ga4PropertyId)
  const showGa4Notice = !!conn && blogsMissingGa4.length > 0
  const showReconnectNotice = !!conn && !conn.hasAdsenseScope

  return (
    <>
      {/* StatSummaryBar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '총 방문자', value: totals.visitors, icon: Users, color: 'text-blue-600 bg-blue-50', suffix: '명' },
          { label: '총 조회수', value: totals.pageViews, icon: Eye, color: 'text-green-600 bg-green-50', suffix: '회' },
          { label: '총 글 수', value: totalPosts, icon: FileText, color: 'text-purple-600 bg-purple-50', suffix: '개' },
          { label: '예상 수익', value: totals.revenueUsd, icon: DollarSign, color: 'text-orange-600 bg-orange-50', prefix: '$', isMoney: true },
        ].map(({ label, value, icon: Icon, color, suffix, prefix, isMoney }) => (
          <Card key={label} className="shadow-none border border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {prefix}
                  {loading && label !== '총 글 수'
                    ? '—'
                    : isMoney
                      ? value.toFixed(2)
                      : value.toLocaleString()}
                  {suffix}
                </p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 연결 상태 안내 */}
      {(showGa4Notice || showReconnectNotice || error) && !loading && (
        <div className="space-y-2">
          {error && (
            <div className="flex items-start gap-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>분석 데이터 로드 실패: {error}</span>
            </div>
          )}
          {showReconnectNotice && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-md p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <strong>AdSense 실수익 연동을 위해 권한이 추가로 필요합니다.</strong>{' '}
                블로그 설정 → 레이아웃 탭에서 Google 계정을 다시 연결해주세요.
                {defaultBlogId && (
                  <Link
                    href={`/blogs/${defaultBlogId}/settings?tab=layout`}
                    className="ml-2 underline hover:opacity-80"
                  >
                    설정으로 이동
                  </Link>
                )}
              </div>
            </div>
          )}
          {showGa4Notice && (
            <div className="flex items-start gap-2 text-sm bg-blue-50 text-blue-800 border border-blue-200 rounded-md p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                GA4 미연결 블로그 {blogsMissingGa4.length}개 — 자체 트래커로 임시 집계 중입니다.
                각 블로그 설정 → 레이아웃 탭에서 GA4를 연결하면 실데이터가 표시됩니다.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 블로그 카드 그리드 + 수익 현황 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">내 블로그</h2>
            <Link href="/blogs" className="text-sm text-blue-600 hover:underline">전체 보기</Link>
          </div>

          {!blogs.length ? (
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
                const stat = statByBlogId[blog.id]
                const views = stat?.pageViews ?? 0
                const isReal = stat?.source.traffic === 'ga4'
                return (
                  <Link key={blog.id} href={`/blogs/${blog.id}`}>
                    <Card className="shadow-none border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: color }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{blog.name}</p>
                            <p className="text-xs text-gray-400 truncate">{blog.subdomain ?? blog.custom_domain ?? blog.slug}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />발행 {blog.publishedCount}개
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                조회 {loading ? '—' : views.toLocaleString()}
                                {isReal && <span className="ml-0.5 text-[9px] text-green-600 font-bold">●GA4</span>}
                              </span>
                              {blog.blog_type && BLOG_TYPE_LABELS[blog.blog_type] && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium text-[10px]">{BLOG_TYPE_LABELS[blog.blog_type]}</span>
                              )}
                              {blog.language && blog.language !== 'ko' && LANG_LABELS[blog.language] && (
                                <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium text-[10px]">{LANG_LABELS[blog.language]}</span>
                              )}
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

          {/* 수익 현황 */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">수익 현황</h2>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>
            <Card className="shadow-none border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">광고별 수익 기여 ({data?.range.days ?? 30}일)</span>
                  {conn?.adsense && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">AdSense 실데이터</span>
                  )}
                  {conn && !conn.adsense && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">추정치 ($1 CPM)</span>
                  )}
                </div>
                {loading ? (
                  <p className="text-sm text-gray-400 text-center py-4">분석 데이터 로드 중…</p>
                ) : !blogs.length ? (
                  <p className="text-sm text-gray-400 text-center py-4">광고 설정 후 수익 현황이 표시됩니다.</p>
                ) : (
                  <div className="space-y-3">
                    {[...(data?.blogs ?? [])]
                      .sort((a, b) => b.revenueUsd - a.revenueUsd)
                      .slice(0, 6)
                      .map((b, i) => {
                        const color = b.color ?? BLOG_COLORS[i % BLOG_COLORS.length]
                        const pct = Math.min(100, Math.round((b.revenueUsd / maxRevenue) * 100))
                        return (
                          <div key={b.id} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm text-gray-600 flex-1 truncate">
                              {b.name}
                              {b.source.revenue === 'adsense' && (
                                <span className="ml-1.5 text-[10px] text-green-600 font-bold">●</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-14 text-right">${b.revenueUsd.toFixed(2)}</span>
                            </div>
                          </div>
                        )
                      })}
                    <p className="text-xs text-gray-400 pt-1">
                      {conn?.adsense
                        ? '* AdSense 실수익 (USD)'
                        : '* AdSense 미연동 — 1,000 조회당 $1 추정치 (● 표시는 실수익)'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 최근 발행글 */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">최근 발행글</h2>
          {!recentPublished.length ? (
            <p className="text-sm text-gray-400">아직 발행된 글이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentPublished.map(post => {
                const blog = blogs.find(b => b.id === post.blog_id)
                const color = blog?.color ?? '#3b82f6'
                return (
                  <Link key={post.id} href={`/blog/${blog?.slug}/${post.slug}`} target="_blank">
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
    </>
  )
}
