import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Vercel 도메인 추가
async function addVercelDomain(domain: string) {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    }
  )
  const data = await res.json()
  if (!res.ok && data.error?.code !== 'domain_already_in_use') {
    console.error('Vercel domain add failed:', data)
    return { ok: false, error: data.error?.message ?? 'Failed to add domain' }
  }
  return { ok: true }
}

// Vercel 도메인 삭제
async function removeVercelDomain(domain: string) {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    }
  )
  if (!res.ok) {
    const data = await res.json()
    console.error('Vercel domain remove failed:', data)
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await request.json()
  const { name, description, customDomain, aiCharacterConfig, aiProvider, isActive, color, url, defaultCategoryId, blogType } = body

  // 도메인 변경 시 Vercel에 자동 등록/삭제
  if (customDomain !== undefined) {
    // 기존 도메인 조회
    const { data: currentBlog } = await supabase
      .from('blogs')
      .select('custom_domain')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    const oldDomain = currentBlog?.custom_domain
    const newDomain = customDomain || null

    // 기존 도메인 삭제
    if (oldDomain && oldDomain !== newDomain) {
      await removeVercelDomain(oldDomain)
    }

    // 새 도메인 추가
    if (newDomain && newDomain !== oldDomain) {
      const result = await addVercelDomain(newDomain)
      if (!result.ok) {
        return NextResponse.json({ error: `도메인 등록 실패: ${result.error}` }, { status: 400 })
      }
    }
  }

  const { data, error } = await supabase
    .from('blogs')
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(customDomain !== undefined && { custom_domain: customDomain }),
      ...(aiCharacterConfig !== undefined && { ai_character_config: aiCharacterConfig }),
      ...(aiProvider !== undefined && { ai_provider: aiProvider }),
      ...(isActive !== undefined && { is_active: isActive }),
      ...(color !== undefined && { color }),
      ...(url !== undefined && { url }),
      ...(defaultCategoryId !== undefined && { default_category_id: defaultCategoryId }),
      ...(blogType !== undefined && { blog_type: blogType }),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { error } = await supabase
    .from('blogs')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
