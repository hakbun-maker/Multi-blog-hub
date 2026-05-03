/**
 * POST /api/stats/action/apply
 *
 * 통계 페이지의 4종 화이트리스트 액션 적용. 다른 액션은 거부.
 *
 * 액션 종류:
 *   1) toggle_slot         { slot, enabled }                — users.ads_config 업데이트
 *   2) apply_slot_position { slot, position }               — users.ads_config 업데이트
 *   3) change_title        { postId, newTitle }             — posts.title 업데이트
 *   4) add_to_rewrite_queue { postId }                       — posts.rewrite_queued_at 설정
 *
 * 응답: { ok: true, message, next?: { actionType, payload } }
 *       실패 시 { ok: false, error }
 *
 * 적용 후 stats_cache 자동 무효화 (관련 캐시만).
 */

import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { invalidate } from '@/lib/stats/cache'

export const dynamic = 'force-dynamic'

type ActionType = 'toggle_slot' | 'apply_slot_position' | 'change_title' | 'add_to_rewrite_queue'

interface ActionRequest {
  actionType: ActionType
  payload: Record<string, unknown>
}

const VALID_SLOTS = ['top', 'middle', 'bottom', 'sidebar']

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Partial<ActionRequest>
  const actionType = body.actionType
  const payload = body.payload ?? {}

  if (!actionType) {
    return NextResponse.json({ ok: false, error: 'actionType 필요' }, { status: 400 })
  }

  // RLS가 id = auth.uid() / user_id = auth.uid() 정책이라 쿠키 인증 클라이언트로 자기 row 업데이트 가능
  // service role 불필요 — 캐시 무효화도 stats_cache RLS로 자기 캐시만 삭제
  try {
    const result = await applyAction(supabase as unknown as SupabaseClient, user.id, actionType, payload)
    await invalidateRelatedCaches(supabase as unknown as SupabaseClient, user.id, actionType)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : '액션 적용 실패' },
      { status: 400 },
    )
  }
}

async function applyAction(
  supabaseAdmin: SupabaseClient,
  userId: string,
  actionType: ActionType,
  payload: Record<string, unknown>,
): Promise<{ message: string; next?: { actionType: ActionType; payload: Record<string, unknown> } }> {
  switch (actionType) {
    case 'toggle_slot':
      return toggleSlot(supabaseAdmin, userId, payload)
    case 'apply_slot_position':
      return applySlotPosition(supabaseAdmin, userId, payload)
    case 'change_title':
      return changeTitle(supabaseAdmin, userId, payload)
    case 'add_to_rewrite_queue':
      return addToRewriteQueue(supabaseAdmin, userId, payload)
    default:
      throw new Error(`알 수 없는 액션: ${actionType}`)
  }
}

async function toggleSlot(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
) {
  const slot = String(payload.slot ?? '')
  const enabled = Boolean(payload.enabled)
  if (!VALID_SLOTS.includes(slot)) throw new Error('유효하지 않은 slot')

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('ads_config')
    .eq('id', userId)
    .maybeSingle()

  const adsConfig = (userRow?.ads_config as Record<string, { enabled?: boolean; position?: string }> | null) ?? {}
  adsConfig[slot] = { ...(adsConfig[slot] ?? {}), enabled }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ ads_config: adsConfig })
    .eq('id', userId)
  if (error) throw new Error(error.message)

  return {
    message: `${slot} 슬롯이 ${enabled ? '활성화' : '비활성화'}되었습니다.`,
  }
}

async function applySlotPosition(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
) {
  const slot = String(payload.slot ?? '')
  const position = String(payload.position ?? '')
  if (!VALID_SLOTS.includes(slot)) throw new Error('유효하지 않은 slot')
  if (!position) throw new Error('position 필요')

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('ads_config')
    .eq('id', userId)
    .maybeSingle()

  const adsConfig = (userRow?.ads_config as Record<string, { enabled?: boolean; position?: string }> | null) ?? {}
  adsConfig[slot] = { ...(adsConfig[slot] ?? {}), position }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ ads_config: adsConfig })
    .eq('id', userId)
  if (error) throw new Error(error.message)

  return { message: `${slot} 슬롯 위치가 "${position}"로 변경되었습니다.` }
}

async function changeTitle(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
) {
  const postId = String(payload.postId ?? '')
  const newTitle = String(payload.newTitle ?? '').trim()
  if (!postId) throw new Error('postId 필요')
  if (!newTitle) throw new Error('newTitle 필요')
  if (newTitle.length > 200) throw new Error('newTitle 200자 초과')

  const { error } = await supabaseAdmin
    .from('posts')
    .update({ title: newTitle, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  return { message: '제목이 변경되었습니다.' }
}

async function addToRewriteQueue(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: Record<string, unknown>,
) {
  const postId = String(payload.postId ?? '')
  if (!postId) throw new Error('postId 필요')

  const { error } = await supabaseAdmin
    .from('posts')
    .update({ rewrite_queued_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  return { message: '재작성 큐에 등록되었습니다.' }
}

async function invalidateRelatedCaches(
  supabase: SupabaseClient,
  userId: string,
  actionType: ActionType,
): Promise<void> {
  const keysByAction: Record<ActionType, string[]> = {
    toggle_slot: ['overview', 'optimization'],
    apply_slot_position: ['overview', 'optimization'],
    change_title: ['overview', 'hidden-gems', 'diagnosis'],
    add_to_rewrite_queue: ['overview', 'diagnosis'],
  }
  const keys = keysByAction[actionType] ?? []
  await Promise.all(keys.map(k => invalidate(supabase, userId, k)))
}
