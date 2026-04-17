/**
 * ISR 캐시 즉시 무효화 API
 * 블로그 설정 변경 시 공개 페이지 캐시를 즉시 갱신
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { blogSlug } = await request.json()
  if (!blogSlug) return NextResponse.json({ error: 'blogSlug 필요' }, { status: 400 })

  // 블로그 목록 페이지 + 포스트 페이지 캐시 무효화
  revalidatePath(`/blog/${blogSlug}`, 'page')
  revalidatePath(`/blog/${blogSlug}`, 'layout')

  return NextResponse.json({ ok: true, revalidated: `/blog/${blogSlug}` })
}
