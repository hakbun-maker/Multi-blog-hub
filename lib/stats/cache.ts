/**
 * 통계 페이지 캐시 헬퍼.
 *
 * 1시간 TTL로 가공된 통계 데이터를 stats_cache 테이블에 저장한다.
 * 외부 API(GA4·AdSense·GSC) 호출 비용 절감 + 페이지 응답 속도 향상.
 *
 * 사용 예:
 *   const data = await getOrCompute(supabase, userId, 'roi-ranking', 60 * 60 * 1000, async () => {
 *     // 비싼 계산 (외부 API 여러 개 호출)
 *     return aggregatedData
 *   })
 *
 * 캐시 무효화 (수동 갱신 버튼 등):
 *   await invalidate(supabase, userId, 'roi-ranking')
 *   await invalidateAll(supabase, userId) // 전체 무효화
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1시간

interface StatsCacheRow<T> {
  data: T
  expires_at: string
  computed_at: string
}

/**
 * 캐시에서 가져오거나, 만료/없으면 compute()로 계산 후 캐시 저장.
 * @param supabase 인증된 supabase client (RLS 통과 필요)
 * @param userId 캐시 소유자
 * @param cacheKey 캐시 식별자 ('overview' / 'roi-ranking' 등)
 * @param ttlMs 유효 시간 (default 1시간)
 * @param compute 캐시 미스 시 실행할 비싼 계산 함수
 */
export async function getOrCompute<T>(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string,
  ttlMs: number | null,
  compute: () => Promise<T>,
): Promise<T> {
  const ttl = ttlMs ?? DEFAULT_TTL_MS

  // 1) 캐시 조회
  const { data: cached, error: readErr } = await supabase
    .from('stats_cache')
    .select('data, expires_at, computed_at')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .maybeSingle<StatsCacheRow<T>>()

  if (!readErr && cached && new Date(cached.expires_at).getTime() > Date.now()) {
    return cached.data
  }

  // 2) 캐시 미스 → 계산
  const fresh = await compute()

  // 3) 캐시 저장 (upsert)
  const computedAt = new Date()
  const expiresAt = new Date(computedAt.getTime() + ttl)
  const { error: writeErr } = await supabase
    .from('stats_cache')
    .upsert({
      user_id: userId,
      cache_key: cacheKey,
      data: fresh as unknown as Record<string, unknown>,
      computed_at: computedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'user_id,cache_key' })

  if (writeErr) {
    console.error('[stats-cache] write failed:', { userId, cacheKey, error: writeErr.message })
  }

  return fresh
}

/** 특정 캐시 키 무효화 */
export async function invalidate(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string,
): Promise<void> {
  await supabase
    .from('stats_cache')
    .delete()
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
}

/** 사용자의 모든 캐시 무효화 (수동 갱신 버튼용) */
export async function invalidateAll(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  await supabase
    .from('stats_cache')
    .delete()
    .eq('user_id', userId)
}

/** 캐시 메타 조회 (마지막 갱신 시각, 만료 예정 시각 등 UI 표시용) */
export async function getCacheMeta(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string,
): Promise<{ computedAt: Date; expiresAt: Date } | null> {
  const { data } = await supabase
    .from('stats_cache')
    .select('computed_at, expires_at')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .maybeSingle()

  if (!data) return null
  return {
    computedAt: new Date(data.computed_at),
    expiresAt: new Date(data.expires_at),
  }
}
