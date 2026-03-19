import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // 모든 동의 버전 조회
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    // 모든 동의 버전 조회 (effective_date 기준 내림차순)
    const { data: versions, error } = await supabase
      .from('consent_versions')
      .select(
        `id,
         consent_type,
         version,
         title,
         summary,
         content_url,
         effective_date,
         created_at`
      )
      .order('effective_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 응답 형식 변환 (snake_case → camelCase)
    const formattedVersions = (versions ?? []).map(v => ({
      id: v.id,
      consent_type: v.consent_type,
      version: v.version,
      title: v.title,
      summary: v.summary,
      content_url: v.content_url,
      effective_date: v.effective_date,
      created_at: v.created_at,
    }))

    return NextResponse.json({
      data: formattedVersions,
      total: formattedVersions.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
