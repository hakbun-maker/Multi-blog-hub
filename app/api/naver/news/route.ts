import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchNaverNewsForUser } from '@/lib/utils/naver-news'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { keywords } = await request.json()
  if (!keywords?.length) return NextResponse.json({ error: 'keywords는 필수입니다.' }, { status: 400 })

  const articles = await fetchNaverNewsForUser(supabase, user.id, keywords)

  if (!articles.length) {
    return NextResponse.json({ error: '네이버 검색 API 키가 등록되지 않았거나 검색 결과가 없습니다.' }, { status: 400 })
  }

  return NextResponse.json({ articles })
}
