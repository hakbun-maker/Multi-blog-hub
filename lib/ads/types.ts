/**
 * 사용자 단위 통합 광고 설정 타입.
 * users.ads_config 컬럼에 jsonb로 저장된다.
 *
 * 모든 블로그에 공통 적용 — ID, 슬롯, 배너 등 한 번 입력으로 끝.
 */

export interface AdSlot {
  enabled: boolean
  code: string
}

export interface UserAdsConfig {
  adsense_pub_id: string
  adsense_slot_mid: string         // 수익화 글의 S단계 직후 자동 삽입용 슬롯 ID
  top_banner: AdSlot
  below_title: AdSlot
  in_article: AdSlot
  left_sidebar_ad: AdSlot
  right_sidebar_ad: AdSlot
  footer_ad: AdSlot
}

export const DEFAULT_USER_ADS_CONFIG: UserAdsConfig = {
  adsense_pub_id: '',
  adsense_slot_mid: '',
  top_banner: { enabled: false, code: '' },
  below_title: { enabled: false, code: '' },
  in_article: { enabled: false, code: '' },
  left_sidebar_ad: { enabled: false, code: '' },
  right_sidebar_ad: { enabled: false, code: '' },
  footer_ad: { enabled: false, code: '' },
}

export function mergeAdsConfig(saved?: Partial<UserAdsConfig> | null): UserAdsConfig {
  return {
    ...DEFAULT_USER_ADS_CONFIG,
    ...(saved ?? {}),
    top_banner: { ...DEFAULT_USER_ADS_CONFIG.top_banner, ...(saved?.top_banner ?? {}) },
    below_title: { ...DEFAULT_USER_ADS_CONFIG.below_title, ...(saved?.below_title ?? {}) },
    in_article: { ...DEFAULT_USER_ADS_CONFIG.in_article, ...(saved?.in_article ?? {}) },
    left_sidebar_ad: { ...DEFAULT_USER_ADS_CONFIG.left_sidebar_ad, ...(saved?.left_sidebar_ad ?? {}) },
    right_sidebar_ad: { ...DEFAULT_USER_ADS_CONFIG.right_sidebar_ad, ...(saved?.right_sidebar_ad ?? {}) },
    footer_ad: { ...DEFAULT_USER_ADS_CONFIG.footer_ad, ...(saved?.footer_ad ?? {}) },
  }
}

export const AD_SLOT_KEYS = [
  'top_banner',
  'below_title',
  'in_article',
  'left_sidebar_ad',
  'right_sidebar_ad',
  'footer_ad',
] as const

export type AdSlotKey = typeof AD_SLOT_KEYS[number]

export const AD_SLOT_LABELS: Record<AdSlotKey, { label: string; desc: string }> = {
  top_banner: { label: '상단 배너', desc: '글 페이지 최상단(타이틀 위)' },
  below_title: { label: '제목 아래', desc: '글 제목과 본문 사이' },
  in_article: { label: '본문 중간', desc: '본문 첫 H2 직후 자동 삽입' },
  left_sidebar_ad: { label: '왼쪽 사이드바', desc: 'left_sidebar 또는 both_sidebar 레이아웃에서 노출' },
  right_sidebar_ad: { label: '오른쪽 사이드바', desc: 'right_sidebar 또는 both_sidebar 레이아웃에서 노출' },
  footer_ad: { label: '푸터', desc: '글 본문 하단' },
}
