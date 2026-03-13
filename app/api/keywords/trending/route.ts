import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 최근 검색량 높은 키워드 반환 (실제 SEO API 연동 전 DB 기반)
  const { data, error } = await supabase
    .from('keyword_searches')
    .select('keyword, search_volume, competition')
    .eq('user_id', user.id)
    .order('search_volume', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
