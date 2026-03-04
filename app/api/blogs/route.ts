import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { name, slug, description, customDomain, subdomain, aiProvider, color } = body

  if (!name || !slug) {
    return NextResponse.json({ error: '이름과 슬러그는 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('blogs')
    .insert({
      user_id: user.id,
      name,
      slug,
      description,
      custom_domain: customDomain,
      subdomain,
      ai_provider: aiProvider ?? 'claude',
      color: color ?? '#3b82f6',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 슬러그입니다.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
