import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getVercelDomainStatus, addVercelDomain } from '@/lib/vercel'

/** GET /api/blogs/[id]/domain — 도메인 연결 상태 확인 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: blog } = await supabase
    .from('blogs')
    .select('custom_domain')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!blog?.custom_domain) {
    return NextResponse.json({ status: 'none' })
  }

  const status = await getVercelDomainStatus(blog.custom_domain)
  return NextResponse.json(status)
}

/** POST /api/blogs/[id]/domain — DB에 저장된 도메인을 Vercel에 강제 등록 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: blog } = await supabase
    .from('blogs')
    .select('custom_domain')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!blog?.custom_domain) {
    return NextResponse.json({ error: '등록된 도메인이 없습니다.' }, { status: 400 })
  }

  const result = await addVercelDomain(blog.custom_domain)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // 등록 후 바로 상태 확인해서 반환
  const status = await getVercelDomainStatus(blog.custom_domain)
  return NextResponse.json(status)
}
