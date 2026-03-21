import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recordConsent } from '@/lib/consent/server'
import type { ConsentType, ConsentMethod } from '@/types/consent'

export async function GET() {
  // 사용자의 전체 동의 현황 조회
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    // 모든 최신 동의 버전 조회
    const { data: versions, error: versionsError } = await supabase
      .from('consent_versions')
      .select('consent_type, version, title, effective_date')
      .order('effective_date', { ascending: false })

    if (versionsError) {
      return NextResponse.json({ error: versionsError.message }, { status: 500 })
    }

    // consent_type별 최신 버전만 추출
    const latestVersions = new Map<string, { version: string; title: string; effectiveDate: string }>()
    if (versions) {
      for (const v of versions) {
        if (!latestVersions.has(v.consent_type)) {
          latestVersions.set(v.consent_type, {
            version: v.version,
            title: v.title,
            effectiveDate: v.effective_date,
          })
        }
      }
    }

    // 사용자의 유효 동의 조회
    const { data: userConsents, error: consentsError } = await supabase
      .from('user_consents')
      .select('consent_type, consent_version, agreed_at, method')
      .eq('user_id', user.id)
      .is('revoked_at', null)

    if (consentsError) {
      return NextResponse.json({ error: consentsError.message }, { status: 500 })
    }

    // 동의 현황 병합
    const consentStatus = Array.from(latestVersions.entries()).map(([type, versionInfo]) => {
      const userConsent = userConsents?.find(c => c.consent_type === type)
      return {
        consent_type: type,
        title: versionInfo.title,
        latest_version: versionInfo.version,
        agreed_version: userConsent?.consent_version ?? null,
        is_agreed: !!userConsent && userConsent.consent_version === versionInfo.version,
        agreed_at: userConsent?.agreed_at ?? null,
        method: userConsent?.method ?? null,
        needs_update: !userConsent || userConsent.consent_version !== versionInfo.version,
      }
    })

    return NextResponse.json({ data: consentStatus })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // 새로운 동의 기록
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  try {
    const body = await request.json()
    // camelCase / snake_case 모두 호환
    const consentType = (body.consent_type || body.consentType) as ConsentType | undefined
    let version = (body.version) as string | undefined
    const method = (body.method || 'inline_panel') as ConsentMethod

    if (!consentType) {
      return NextResponse.json(
        { error: 'consent_type 또는 consentType은 필수입니다.' },
        { status: 400 }
      )
    }

    // version 미제공 시 최신 버전 자동 조회
    if (!version) {
      const { data: latestVersion } = await supabase
        .from('consent_versions')
        .select('version')
        .eq('consent_type', consentType)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

      version = latestVersion?.version ?? '1.0'
    }

    // IP 주소 추출 (x-forwarded-for 헤더)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null

    // User-Agent 추출
    const userAgent = request.headers.get('user-agent') || null

    const resolvedVersion = version!

    // 동의 기록
    await recordConsent(user.id, consentType, resolvedVersion, method, ip || undefined, userAgent || undefined)

    return NextResponse.json({
      data: {
        user_id: user.id,
        consent_type: consentType,
        version,
        method,
        agreed_at: new Date().toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
