/**
 * 모든 사용자에 대해 알림 조건 체크.
 * - Threads 토큰 50/60일 경과
 * - GSC OAuth 토큰 끊김 (refresh_token 없거나 만료)
 * - 색인 마지막 갱신 후 6일 경과
 *
 * 일 1회 cron에서 호출. service role 또는 RLS 우회 가능한 supabase client 필요.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createNotification,
  resolveNotification,
  threadsTokenExpiringNotification,
  threadsTokenExpiredNotification,
  gscTokenDisconnectedNotification,
  indexingRefreshDueNotification,
} from './trigger'

const THREADS_TOKEN_TTL_DAYS = 60
const THREADS_WARNING_DAYS = 50
const GSC_OAUTH_TTL_DAYS = 7
const INDEXING_WARN_DAYS = 6

export interface CheckSummary {
  checked: number
  threadsExpiring: number
  threadsExpired: number
  gscDisconnected: number
  indexingDue: number
}

export async function checkAllNotifications(supabase: SupabaseClient): Promise<CheckSummary> {
  const summary: CheckSummary = {
    checked: 0,
    threadsExpiring: 0,
    threadsExpired: 0,
    gscDisconnected: 0,
    indexingDue: 0,
  }

  const { data: users } = await supabase.from('users').select('id')
  for (const u of (users ?? []) as { id: string }[]) {
    summary.checked++
    await checkOneUser(supabase, u.id, summary)
  }

  return summary
}

async function checkOneUser(
  supabase: SupabaseClient,
  userId: string,
  summary: CheckSummary,
): Promise<void> {
  // ─── Threads ──
  const { data: threadsKey } = await supabase
    .from('ai_api_keys')
    .select('created_at')
    .eq('user_id', userId)
    .eq('provider', 'threads')
    .eq('is_active', true)
    .maybeSingle()

  if (threadsKey) {
    const createdAt = new Date(threadsKey.created_at as string)
    const daysSince = Math.floor((Date.now() - createdAt.getTime()) / 86400000)
    const daysLeft = THREADS_TOKEN_TTL_DAYS - daysSince

    if (daysSince >= THREADS_TOKEN_TTL_DAYS) {
      await createNotification(supabase, { userId, ...threadsTokenExpiredNotification() })
      summary.threadsExpired++
    } else if (daysSince >= THREADS_WARNING_DAYS) {
      await createNotification(supabase, { userId, ...threadsTokenExpiringNotification(daysLeft) })
      summary.threadsExpiring++
    } else {
      await resolveNotification(supabase, userId, 'threads_token_expiring')
      await resolveNotification(supabase, userId, 'threads_token_expired')
    }
  }

  // ─── GSC ──
  const { data: gscToken } = await supabase
    .from('user_oauth_tokens')
    .select('encrypted_refresh_token, updated_at')
    .eq('user_id', userId)
    .eq('provider', 'google_indexing')
    .maybeSingle()

  if (gscToken) {
    const tokenAge = gscToken.updated_at
      ? Math.floor((Date.now() - new Date(gscToken.updated_at as string).getTime()) / 86400000)
      : 999
    const noRefreshToken = !gscToken.encrypted_refresh_token

    if (noRefreshToken || tokenAge >= GSC_OAUTH_TTL_DAYS) {
      await createNotification(supabase, { userId, ...gscTokenDisconnectedNotification() })
      summary.gscDisconnected++
    } else {
      await resolveNotification(supabase, userId, 'gsc_token_disconnected')
      if (tokenAge >= INDEXING_WARN_DAYS) {
        await createNotification(supabase, { userId, ...indexingRefreshDueNotification(tokenAge) })
        summary.indexingDue++
      } else {
        await resolveNotification(supabase, userId, 'indexing_refresh_due')
      }
    }
  }
}
