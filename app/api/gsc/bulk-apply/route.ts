import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { bulkApplyAutoIndexAndSitemap } from '@/lib/google/gsc-site'

/**
 * 모든 블로그에 자동색인 ON + 사이트맵 일괄 재제출
 * - GET: 미사용
 * - POST: 실행
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const { results } = await bulkApplyAutoIndexAndSitemap(user.id)
    const summary = {
      total: results.length,
      autoIndexSet: results.filter(r => r.autoIndexSet).length,
      sitemapOk: results.filter(r => r.sitemapOk).length,
      failed: results.filter(r => !r.sitemapOk || !r.autoIndexSet).length,
    }
    return NextResponse.json({ ok: true, summary, results })
  } catch (e) {
    const message = e instanceof Error ? e.message : '일괄 적용 중 오류 발생'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
