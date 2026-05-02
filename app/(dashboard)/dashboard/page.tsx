import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PenSquare, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DashboardClient, { type DashboardBlogMeta, type DashboardRecentPost } from '@/components/dashboard/DashboardClient'

// 항상 최신 — 분석 데이터는 클라이언트가 /api/dashboard/analytics에서 직접 fetch
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id

  const [{ data: blogsRaw }, { data: posts }] = await Promise.all([
    supabase.from('blogs')
      .select('id, name, slug, color, blog_type, language, custom_domain, subdomain')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase.from('posts')
      .select('id, title, slug, blog_id, status, published_at')
      .eq('user_id', userId)
      .order('published_at', { ascending: false }),
  ])

  const blogs = blogsRaw ?? []
  const allPosts = posts ?? []
  const publishedPosts = allPosts.filter(p => p.status === 'published')

  const blogsMeta: DashboardBlogMeta[] = blogs.map(b => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    custom_domain: b.custom_domain,
    subdomain: b.subdomain,
    color: b.color,
    blog_type: b.blog_type,
    language: b.language,
    publishedCount: publishedPosts.filter(p => p.blog_id === b.id).length,
  }))

  const recentPublished: DashboardRecentPost[] = publishedPosts.slice(0, 10).map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    blog_id: p.blog_id,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/editor/new"><PenSquare className="w-4 h-4 mr-1.5" />글 작성</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings?tab=snippets"><BookOpen className="w-4 h-4 mr-1.5" />스니펫 관리</Link>
          </Button>
        </div>
      </div>

      <DashboardClient
        blogs={blogsMeta}
        recentPublished={recentPublished}
        totalPosts={allPosts.length}
        defaultBlogId={blogs[0]?.id ?? null}
      />
    </div>
  )
}
