import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/utils/encryption'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    // 블로그 소유권 확인
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, settings')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (blogError || !blog) {
      return NextResponse.json(
        { error: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const settings = blog.settings || {}
    const snsSettings = settings.snsSettings || {
      instagram: { enabled: false },
      twitter: { enabled: false },
      threads: { enabled: false },
    }

    return NextResponse.json({
      success: true,
      data: snsSettings,
    })
  } catch (error: any) {
    console.error('SNS settings get error:', error)
    return NextResponse.json(
      { error: error.message || 'SNS 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const body = await request.json()
    const { instagram, twitter, threads } = body

    // 블로그 소유권 확인
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, settings')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (blogError || !blog) {
      return NextResponse.json(
        { error: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const settings = blog.settings || {}
    const snsSettings = {
      instagram: instagram || { enabled: false },
      twitter: twitter || { enabled: false },
      threads: threads || { enabled: false },
    }

    // 접근 토큰 암호화 (저장할 경우)
    if (instagram?.accessToken) {
      snsSettings.instagram.accessToken = encrypt(instagram.accessToken)
    }
    if (twitter?.accessToken) {
      snsSettings.twitter.accessToken = encrypt(twitter.accessToken)
    }
    if (threads?.accessToken) {
      snsSettings.threads.accessToken = encrypt(threads.accessToken)
    }

    // 블로그 설정 업데이트
    const { data: updated, error: updateError } = await supabase
      .from('blogs')
      .update({
        settings: {
          ...settings,
          snsSettings,
        },
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'SNS 설정 업데이트 실패: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updated.settings?.snsSettings,
    })
  } catch (error: any) {
    console.error('SNS settings update error:', error)
    return NextResponse.json(
      { error: error.message || 'SNS 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
