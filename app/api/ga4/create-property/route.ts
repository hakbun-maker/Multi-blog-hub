import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getValidGoogleToken } from '@/lib/google/token-refresh'

const GA_ADMIN_BASE = 'https://analyticsadmin.googleapis.com/v1beta'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { blogId } = await request.json()
  if (!blogId) return NextResponse.json({ error: 'blogId 필수' }, { status: 400 })

  // 블로그 정보 조회
  const { data: blog } = await supabase
    .from('blogs')
    .select('id, name, slug, custom_domain, url')
    .eq('id', blogId)
    .eq('user_id', user.id)
    .single()

  if (!blog) return NextResponse.json({ error: '블로그를 찾을 수 없습니다.' }, { status: 404 })

  // 유효한 Google 토큰 획득
  const accessToken = await getValidGoogleToken(user.id)
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Google 계정이 연결되어 있지 않거나 토큰이 만료되었습니다. 다시 연결해주세요.' },
      { status: 401 }
    )
  }

  try {
    // 1. Google Analytics 계정 목록 조회
    const accountsRes = await fetch(`${GA_ADMIN_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!accountsRes.ok) {
      const err = await accountsRes.text()
      throw new Error(`Google Analytics 계정 목록 조회 실패: ${err}`)
    }

    const accountsData = await accountsRes.json()
    const accounts = accountsData.accounts || []
    if (accounts.length === 0) {
      throw new Error(
        'Google Analytics 계정이 없습니다. analytics.google.com에서 먼저 계정을 생성해주세요.'
      )
    }

    const accountName = accounts[0].name // "accounts/12345"

    // 2. GA4 속성 생성
    const blogDisplayName = blog.name || blog.slug
    const propertyRes = await fetch(`${GA_ADMIN_BASE}/properties`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: accountName,
        displayName: blogDisplayName,
        timeZone: 'Asia/Seoul',
        currencyCode: 'KRW',
      }),
    })

    if (!propertyRes.ok) {
      const err = await propertyRes.text()
      throw new Error(`GA4 속성 생성 실패: ${err}`)
    }

    const property = await propertyRes.json()
    const propertyName = property.name // "properties/67890"

    // 3. 웹 데이터 스트림 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const blogUrl = blog.custom_domain
      ? `https://${blog.custom_domain}`
      : blog.url || `${baseUrl}/blog/${blog.slug}`

    const streamRes = await fetch(`${GA_ADMIN_BASE}/${propertyName}/dataStreams`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'WEB_DATA_STREAM',
        displayName: `${blogDisplayName} Web`,
        webStreamData: {
          defaultUri: blogUrl,
        },
      }),
    })

    if (!streamRes.ok) {
      const err = await streamRes.text()
      throw new Error(`웹 데이터 스트림 생성 실패: ${err}`)
    }

    const stream = await streamRes.json()
    const measurementId = stream.webStreamData?.measurementId

    if (!measurementId) throw new Error('측정 ID를 가져올 수 없습니다.')

    return NextResponse.json({
      success: true,
      measurementId,
      propertyName,
      streamName: stream.name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GA4 속성 생성 실패'
    console.error('GA4 create-property error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
