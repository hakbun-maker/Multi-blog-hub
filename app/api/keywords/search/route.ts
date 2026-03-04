import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) return NextResponse.json({ error: '검색어를 입력하세요.' }, { status: 400 })

  // 연관 키워드 생성 (실제 SEO API 연동 전 placeholder)
  const related = generateRelatedKeywords(q)

  // 검색 이력 저장
  const { data } = await supabase
    .from('keyword_searches')
    .upsert({
      user_id: user.id,
      keyword: q,
      search_volume: Math.floor(Math.random() * 10000) + 100, // placeholder
      competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      related_keywords: related,
      source: 'manual',
    }, { onConflict: 'id' })
    .select()
    .single()

  return NextResponse.json({
    data: {
      keyword: q,
      searchVolume: data?.search_volume ?? 0,
      competition: data?.competition ?? 'unknown',
      relatedKeywords: related,
    },
  })
}

function generateRelatedKeywords(keyword: string): string[] {
  const suffixes = ['추천', '방법', '비교', '후기', '가격', '종류', '효과', '순위']
  return suffixes.slice(0, 5).map(s => `${keyword} ${s}`)
}

export async function GET_HISTORY(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('keyword_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
