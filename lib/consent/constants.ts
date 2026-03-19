import type { ConsentType } from '@/types/consent'

// 전체 동의 유형 목록
export const CONSENT_TYPES: ConsentType[] = [
  'tos', 'privacy', 'marketing', 'api_key_storage', 'automation',
  'sns_oauth_instagram', 'sns_oauth_twitter', 'sns_oauth_threads',
  'affiliate_marketing', 'adsense_oauth',
  'blog_platform_tistory', 'blog_platform_wordpress',
]

// 회원가입 시 필수 동의
export const REQUIRED_AT_SIGNUP: ConsentType[] = ['tos', 'privacy']

// 회원가입 시 선택 동의
export const OPTIONAL_AT_SIGNUP: ConsentType[] = ['marketing']

// 동의 UI 설정 (consent_type별 UI 방식)
export const CONSENT_UI_CONFIG: Record<ConsentType, 'checkbox' | 'inline_panel' | 'modal'> = {
  tos: 'checkbox',
  privacy: 'checkbox',
  marketing: 'checkbox',
  api_key_storage: 'inline_panel',
  automation: 'modal',
  sns_oauth_instagram: 'modal',
  sns_oauth_twitter: 'modal',
  sns_oauth_threads: 'modal',
  affiliate_marketing: 'inline_panel',
  adsense_oauth: 'modal',
  blog_platform_tistory: 'modal',
  blog_platform_wordpress: 'modal',
}

// 동의 유형별 한국어 라벨
export const CONSENT_LABELS: Record<ConsentType, string> = {
  tos: '서비스 이용약관',
  privacy: '개인정보 처리방침',
  marketing: '마케팅 정보 수신',
  api_key_storage: 'API 키 저장',
  automation: '자동화 처리',
  sns_oauth_instagram: 'Instagram 연동',
  sns_oauth_twitter: 'X(Twitter) 연동',
  sns_oauth_threads: 'Threads 연동',
  affiliate_marketing: '제휴마케팅 자동 삽입',
  adsense_oauth: 'AdSense 연동',
  blog_platform_tistory: '티스토리 연동',
  blog_platform_wordpress: 'WordPress 연동',
}

// 동의 철회 시 연쇄 처리 매핑
export const REVOKE_CASCADES: Partial<Record<ConsentType, string>> = {
  api_key_storage: 'ai_api_keys 전체 삭제',
  automation: '수익화 로켓 비활성화 (blogs.rocket_enabled = false)',
  sns_oauth_instagram: 'Instagram 토큰 삭제',
  sns_oauth_twitter: 'X(Twitter) 토큰 삭제',
  sns_oauth_threads: 'Threads 토큰 삭제',
  affiliate_marketing: '제휴마케팅 자동 삽입 비활성화',
  adsense_oauth: 'AdSense OAuth 토큰 삭제',
  blog_platform_tistory: '티스토리 인증 정보 삭제',
  blog_platform_wordpress: 'WordPress 인증 정보 삭제',
  tos: '서비스 이용 불가 + 탈퇴 유도',
  privacy: '서비스 이용 불가 + 탈퇴 유도',
}

// 필수 동의 (철회 시 서비스 이용 불가)
export const ESSENTIAL_CONSENTS: ConsentType[] = ['tos', 'privacy']
