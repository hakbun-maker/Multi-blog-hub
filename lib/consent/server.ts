import { createClient } from '@/lib/supabase/server'
import type { ConsentType, ConsentMethod } from '@/types/consent'

/** 특정 동의의 유효 여부 확인 (최신 버전 기준) */
export async function hasValidConsent(userId: string, consentType: ConsentType): Promise<boolean> {
  const supabase = createClient()

  // 최신 버전 조회
  const { data: latestVersion } = await supabase
    .from('consent_versions')
    .select('version')
    .eq('consent_type', consentType)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (!latestVersion) return false

  // 해당 버전에 대한 유효 동의 존재 여부
  const { data: consent } = await supabase
    .from('user_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .eq('consent_version', latestVersion.version)
    .is('revoked_at', null)
    .limit(1)
    .single()

  return !!consent
}

/** 미동의 / 재동의 필요 목록 반환 */
export async function getPendingConsents(userId: string): Promise<ConsentType[]> {
  const supabase = createClient()

  // 모든 최신 버전 조회
  const { data: versions } = await supabase
    .from('consent_versions')
    .select('consent_type, version')
    .order('effective_date', { ascending: false })

  if (!versions) return []

  // consent_type별 최신 버전만 추출
  const latestByType = new Map<string, string>()
  for (const v of versions) {
    if (!latestByType.has(v.consent_type)) {
      latestByType.set(v.consent_type, v.version)
    }
  }

  // 사용자의 유효 동의 조회
  const { data: consents } = await supabase
    .from('user_consents')
    .select('consent_type, consent_version')
    .eq('user_id', userId)
    .is('revoked_at', null)

  const agreedMap = new Map<string, string>()
  for (const c of (consents ?? [])) {
    agreedMap.set(c.consent_type, c.consent_version)
  }

  // 미동의 또는 버전 불일치 항목
  const pending: ConsentType[] = []
  latestByType.forEach((latestVer, type) => {
    const agreedVer = agreedMap.get(type)
    if (!agreedVer || agreedVer !== latestVer) {
      pending.push(type as ConsentType)
    }
  })

  return pending
}

/** 동의 기록 */
export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  version: string,
  method: ConsentMethod,
  ip?: string,
  userAgent?: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_consents')
    .upsert({
      user_id: userId,
      consent_type: consentType,
      consent_version: version,
      method,
      ip_address: ip || null,
      user_agent: userAgent || null,
      agreed_at: new Date().toISOString(),
      revoked_at: null,
      revoked_reason: null,
    }, {
      onConflict: 'user_id,consent_type,consent_version',
    })

  if (error) throw new Error(`동의 기록 실패: ${error.message}`)
}

/** 동의 철회 + 연쇄 처리 */
export async function revokeConsent(
  userId: string,
  consentType: ConsentType,
  reason: string
): Promise<void> {
  const supabase = createClient()

  // 1. 동의 철회 기록
  const { error } = await supabase
    .from('user_consents')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .is('revoked_at', null)

  if (error) throw new Error(`동의 철회 실패: ${error.message}`)

  // 2. 연쇄 처리
  await handleRevokeCascade(userId, consentType)
}

/** 동의 철회 연쇄 처리 */
async function handleRevokeCascade(userId: string, consentType: ConsentType): Promise<void> {
  const supabase = createClient()

  switch (consentType) {
    case 'api_key_storage':
      // ai_api_keys 전체 삭제
      await supabase.from('ai_api_keys').delete().eq('user_id', userId)
      break
    case 'automation':
      // 수익화 로켓 비활성화
      await supabase.from('blogs').update({ rocket_enabled: false }).eq('user_id', userId)
      break
    case 'sns_oauth_instagram':
    case 'sns_oauth_twitter':
    case 'sns_oauth_threads': {
      // 해당 플랫폼 토큰 삭제 (blog_settings.sns_settings에서)
      const platform = consentType.replace('sns_oauth_', '')
      const { data: blogs } = await supabase.from('blogs').select('id').eq('user_id', userId)
      if (blogs) {
        for (const blog of blogs) {
          const { data: settings } = await supabase
            .from('blog_settings')
            .select('sns_settings')
            .eq('blog_id', blog.id)
            .single()
          if (settings?.sns_settings) {
            const snsSettings = { ...settings.sns_settings }
            delete snsSettings[platform]
            await supabase
              .from('blog_settings')
              .update({ sns_settings: snsSettings })
              .eq('blog_id', blog.id)
          }
        }
      }
      break
    }
    case 'affiliate_marketing':
      // 제휴마케팅 자동 삽입 비활성화
      const { data: userBlogs } = await supabase.from('blogs').select('id').eq('user_id', userId)
      if (userBlogs) {
        for (const blog of userBlogs) {
          const { data: bs } = await supabase
            .from('blog_settings')
            .select('affiliate_config')
            .eq('blog_id', blog.id)
            .single()
          if (bs?.affiliate_config) {
            await supabase
              .from('blog_settings')
              .update({ affiliate_config: { ...bs.affiliate_config, autoInsert: false } })
              .eq('blog_id', blog.id)
          }
        }
      }
      break
    case 'adsense_oauth':
      // AdSense OAuth 토큰 삭제 처리 (향후 구현)
      break
    case 'blog_platform_tistory':
    case 'blog_platform_wordpress':
      // 블로그 플랫폼 인증 정보 삭제 (향후 구현)
      break
    case 'tos':
    case 'privacy':
      // 필수 동의 철회 → 서비스 이용 불가 (프론트에서 처리)
      break
  }
}

/** 최신 동의 버전 조회 */
export async function getLatestConsentVersion(consentType: ConsentType): Promise<string | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('consent_versions')
    .select('version')
    .eq('consent_type', consentType)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  return data?.version ?? null
}
