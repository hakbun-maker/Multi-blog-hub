import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/utils/encryption'

const VALID_PLATFORMS = ['instagram', 'twitter', 'threads'] as const

export async function POST(
  _request: Request,
  { params }: { params: { id: string; platform: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { id: blogId, platform } = params

  if (!VALID_PLATFORMS.includes(platform as any)) {
    return NextResponse.json(
      { success: false, message: '지원하지 않는 플랫폼입니다.' },
      { status: 400 }
    )
  }

  try {
    // 블로그 소유권 확인 + 설정 조회
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, settings')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()

    if (blogError || !blog) {
      return NextResponse.json(
        { success: false, message: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const snsSettings = blog.settings?.snsSettings || {}
    const platformConfig = snsSettings[platform]

    if (!platformConfig?.accessToken) {
      return NextResponse.json({
        success: false,
        message: `${platform} 계정이 연결되지 않았습니다.`,
      })
    }

    // 토큰 복호화
    const accessToken = decrypt(platformConfig.accessToken)

    // 플랫폼별 경량 API 호출로 연결 테스트
    let testResult: { success: boolean; message: string; username?: string }

    switch (platform) {
      case 'instagram':
        testResult = await testInstagram(accessToken)
        break
      case 'twitter':
        testResult = await testTwitter(accessToken)
        break
      case 'threads':
        testResult = await testThreads(accessToken)
        break
      default:
        testResult = { success: false, message: '지원하지 않는 플랫폼' }
    }

    return NextResponse.json(testResult)
  } catch (error) {
    const message = error instanceof Error ? error.message : '테스트 중 오류 발생'
    console.error(`SNS test error (${platform}):`, message)
    return NextResponse.json({
      success: false,
      message,
    })
  }
}

async function testInstagram(accessToken: string) {
  // Instagram Business Account 프로필 조회
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{username}&access_token=${accessToken}`
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return {
      success: false,
      message: `Instagram API 오류: ${(err as any).error?.message || res.status}`,
    }
  }

  const data = await res.json()
  const igAccount = data.data?.[0]?.instagram_business_account
  if (!igAccount) {
    return {
      success: false,
      message: 'Instagram 비즈니스 계정을 찾을 수 없습니다.',
    }
  }

  return {
    success: true,
    message: `연결 정상${igAccount.username ? ` (@${igAccount.username})` : ''}`,
    username: igAccount.username,
  }
}

async function testTwitter(accessToken: string) {
  // Twitter /2/users/me 프로필 조회
  const res = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return {
      success: false,
      message: `Twitter API 오류: ${(err as any).detail || (err as any).title || res.status}`,
    }
  }

  const data = await res.json()
  const username = data.data?.username

  return {
    success: true,
    message: `연결 정상${username ? ` (@${username})` : ''}`,
    username,
  }
}

async function testThreads(accessToken: string) {
  // Threads /me 프로필 조회
  const res = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return {
      success: false,
      message: `Threads API 오류: ${(err as any).error?.message || res.status}`,
    }
  }

  const data = await res.json()
  const username = data.username

  return {
    success: true,
    message: `연결 정상${username ? ` (@${username})` : ''}`,
    username,
  }
}
