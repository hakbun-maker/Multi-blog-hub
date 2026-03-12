import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: '도메인 필요' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
      { headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` } }
    )

    if (!res.ok) {
      return NextResponse.json({ status: 'not_found', message: '도메인이 Vercel에 등록되지 않았습니다.' })
    }

    const data = await res.json()

    // verification: 도메인 소유권 확인
    if (data.verification && data.verification.length > 0) {
      return NextResponse.json({
        status: 'pending_verification',
        message: '도메인 소유권 확인이 필요합니다.',
        verification: data.verification,
      })
    }

    // misconfigured: DNS 설정 오류
    if (data.misconfigured) {
      return NextResponse.json({
        status: 'misconfigured',
        message: 'DNS 설정이 올바르지 않습니다. CNAME 또는 A 레코드를 확인하세요.',
      })
    }

    // 정상 연결
    return NextResponse.json({
      status: 'connected',
      message: '도메인이 정상적으로 연결되어 있습니다.',
    })
  } catch (err) {
    console.error('Domain status check failed:', err)
    return NextResponse.json({ status: 'error', message: '상태 확인 중 오류가 발생했습니다.' })
  }
}
