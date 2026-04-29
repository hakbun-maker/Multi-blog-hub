import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT_UA = /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|googlebot|adsbot|mediapartners|chrome-lighthouse|headlesschrome|phantomjs|wget|curl/i

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || BOT_UA.test(ua)) {
    return NextResponse.json({ ok: true, skipped: 'bot' })
  }

  let body: { postId?: string; isNewVisitor?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const postId = body.postId
  const isNewVisitor = !!body.isNewVisitor
  if (!postId) return NextResponse.json({ error: 'postId 필요' }, { status: 400 })

  const sb = admin()

  // 포스트 조회 (블로그/사용자 식별)
  const { data: post, error: postErr } = await sb
    .from('posts')
    .select('id, blog_id, user_id, view_count, status')
    .eq('id', postId)
    .single()

  if (postErr || !post || post.status !== 'published') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // 1) 포스트 view_count 증가
  await sb
    .from('posts')
    .update({ view_count: (post.view_count ?? 0) + 1 })
    .eq('id', post.id)

  // 2) daily_stats UPSERT (한국 기준 날짜)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }) // YYYY-MM-DD

  const { data: existing } = await sb
    .from('daily_stats')
    .select('id, visitors, views')
    .eq('blog_id', post.blog_id)
    .eq('date', today)
    .maybeSingle()

  if (existing) {
    await sb
      .from('daily_stats')
      .update({
        views: (existing.views ?? 0) + 1,
        visitors: (existing.visitors ?? 0) + (isNewVisitor ? 1 : 0),
      })
      .eq('id', existing.id)
  } else {
    await sb.from('daily_stats').insert({
      user_id: post.user_id,
      blog_id: post.blog_id,
      date: today,
      views: 1,
      visitors: isNewVisitor ? 1 : 0,
    })
  }

  return NextResponse.json({ ok: true })
}
