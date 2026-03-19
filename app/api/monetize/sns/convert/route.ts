import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { convertToSNS } from '@/lib/monetize/engines/sns-converter'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const body = await request.json()
    const { blogId, content, keyword, platform, intentType } = body

    if (!content || !keyword || !platform) {
      return NextResponse.json(
        { error: '내용, 키워드, 플랫폼은 필수입니다.' },
        { status: 400 }
      )
    }

    if (!['instagram', 'twitter', 'threads'].includes(platform)) {
      return NextResponse.json(
        { error: '지원하지 않는 플랫폼입니다.' },
        { status: 400 }
      )
    }

    // 블로그 정보 및 AI API 키 조회
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, ai_provider, user_id')
      .eq('id', blogId)
      .eq('user_id', user.id)
      .single()

    if (blogError || !blog) {
      return NextResponse.json(
        { error: '블로그를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // AI API 키 조회
    const { data: apiKeys } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    if (!apiKeys?.length) {
      return NextResponse.json(
        { error: 'AI API 키가 등록되지 않았습니다.' },
        { status: 400 }
      )
    }

    const apiKey = decrypt(apiKeys[0].encrypted_key)

    // SNS 변환 실행
    const result = await convertToSNS({
      content,
      keyword,
      platform: platform as 'instagram' | 'twitter' | 'threads',
      intentType: intentType || 'INFO',
      aiApiKey: apiKey,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('SNS convert error:', error)
    return NextResponse.json(
      { error: error.message || 'SNS 변환 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
