import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/utils/encryption'

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
    const affiliateConfig = settings.affiliateConfig || {
      autoInsert: false,
      maxProductsPerPost: 1,
      provider: 'coupang',
      intentSettings: {
        AD: true,
        REVIEW: true,
        INFO: false,
        CRITIC: false,
        COMPARE: true,
        TREND: false,
      },
    }

    // 민감한 정보 제거
    const coupangSettings = settings.coupangSettings ? {
      ...settings.coupangSettings,
      apiKey: undefined, // 반환 금지
    } : {}

    return NextResponse.json({
      success: true,
      data: {
        affiliateConfig,
        coupangConfigured: !!settings.coupangSettings?.affiliateId,
        amazonConfigured: !!settings.amazonSettings?.associatesTag,
      },
    })
  } catch (error: any) {
    console.error('Affiliate settings get error:', error)
    return NextResponse.json(
      { error: error.message || '제휴 설정 조회 중 오류가 발생했습니다.' },
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
    const { autoInsert, maxProductsPerPost, provider, intentSettings, coupangSettings, amazonSettings } = body

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
    const affiliateConfig = {
      autoInsert: autoInsert !== undefined ? autoInsert : (settings.affiliateConfig?.autoInsert ?? false),
      maxProductsPerPost: maxProductsPerPost ?? (settings.affiliateConfig?.maxProductsPerPost ?? 1),
      provider: provider ?? (settings.affiliateConfig?.provider ?? 'coupang'),
      intentSettings: intentSettings ?? (settings.affiliateConfig?.intentSettings ?? {}),
    }

    // API 키 암호화
    let encryptedCoupangSettings = settings.coupangSettings || {}
    let encryptedAmazonSettings = settings.amazonSettings || {}

    if (coupangSettings?.apiKey) {
      encryptedCoupangSettings = {
        ...coupangSettings,
        apiKey: encrypt(coupangSettings.apiKey),
      }
    }

    if (amazonSettings?.accessKey) {
      encryptedAmazonSettings = {
        ...amazonSettings,
        accessKey: encrypt(amazonSettings.accessKey),
        secretKey: encrypt(amazonSettings.secretKey || ''),
      }
    }

    // 블로그 설정 업데이트
    const { data: updated, error: updateError } = await supabase
      .from('blogs')
      .update({
        settings: {
          ...settings,
          affiliateConfig,
          coupangSettings: encryptedCoupangSettings,
          amazonSettings: encryptedAmazonSettings,
        },
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: '제휴 설정 업데이트 실패: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        affiliateConfig: updated.settings?.affiliateConfig,
        coupangConfigured: !!updated.settings?.coupangSettings?.affiliateId,
        amazonConfigured: !!updated.settings?.amazonSettings?.associatesTag,
      },
    })
  } catch (error: any) {
    console.error('Affiliate settings update error:', error)
    return NextResponse.json(
      { error: error.message || '제휴 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
