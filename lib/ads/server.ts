import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeAdsConfig, type UserAdsConfig } from './types'

/**
 * 사용자의 통합 광고 설정 조회 (공개 페이지 server component에서 사용).
 * RLS 우회를 위해 service role client 전달 필요.
 */
export async function fetchUserAdsConfig(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<UserAdsConfig> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('ads_config')
    .eq('id', userId)
    .single()
  return mergeAdsConfig(data?.ads_config as Partial<UserAdsConfig> | null)
}
