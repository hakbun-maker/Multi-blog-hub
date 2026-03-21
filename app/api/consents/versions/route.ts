import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const type = request.nextUrl.searchParams.get('type')

  try {
    let query = supabase
      .from('consent_versions')
      .select('id, consent_type, version, title, summary, content_url, effective_date, created_at')
      .order('effective_date', { ascending: false })

    if (type) {
      query = query.eq('consent_type', type)
    }

    const { data: versions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const format = (v: any) => ({
      id: v.id,
      consentType: v.consent_type,
      version: v.version,
      title: v.title,
      summary: v.summary,
      contentUrl: v.content_url,
      effectiveDate: v.effective_date,
    })

    // ?type= 지정 시 최신 1건을 version 필드로 반환 (컴포넌트 호환)
    if (type) {
      const latest = versions?.[0] ?? null
      return NextResponse.json({
        version: latest ? format(latest) : null,
      })
    }

    // 전체 조회
    return NextResponse.json({
      data: (versions ?? []).map(format),
      total: versions?.length ?? 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
