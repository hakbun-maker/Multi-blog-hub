// 동의서 시스템 타입 정의

// 동의 유형 (12종)
export type ConsentType =
  | 'tos'
  | 'privacy'
  | 'marketing'
  | 'api_key_storage'
  | 'automation'
  | 'sns_oauth_instagram'
  | 'sns_oauth_twitter'
  | 'sns_oauth_threads'
  | 'affiliate_marketing'
  | 'adsense_oauth'

// 동의 수집 방법
export type ConsentMethod = 'checkbox' | 'modal' | 'inline_panel' | 'upgrade_flow'

// 동의 버전 정보
export interface ConsentVersion {
  id: string
  consentType: ConsentType
  version: string
  title: string
  summary: string | null
  contentUrl: string | null
  effectiveDate: string
}

// 사용자 동의 기록
export interface UserConsent {
  id: string
  userId: string
  consentType: ConsentType
  consentVersion: string
  agreedAt: string
  ipAddress: string | null
  userAgent: string | null
  method: ConsentMethod
  revokedAt: string | null
  revokedReason: string | null
}

// 동의 확인 결과
export interface ConsentCheckResult {
  consentType: ConsentType
  hasValidConsent: boolean
  currentVersion: string
  agreedVersion: string | null
  needsReConsent: boolean
}

// 동의 현황 (UI용)
export interface ConsentStatusItem {
  consentType: ConsentType
  title: string
  isAgreed: boolean
  agreedAt: string | null
  version: string
  latestVersion: string
  needsUpdate: boolean
}
