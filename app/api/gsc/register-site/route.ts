import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { registerBlogToGSC } from '@/lib/google/gsc-site'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { blogId } = await request.json()
  if (!blogId) return NextResponse.json({ error: 'blogId는 필수입니다.' }, { status: 400 })

  const { data: blog } = await supabase
    .from('blogs')
    .select('id, slug, custom_domain')
    .eq('id', blogId)
    .eq('user_id', user.id)
    .single()

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  const result = await registerBlogToGSC(user.id, blog)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
