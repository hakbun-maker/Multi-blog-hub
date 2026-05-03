/**
 * 통계 페이지 행동 카탈로그 — 클라이언트 액션 핸들러.
 *
 * 4종 화이트리스트 액션을 /api/stats/action/apply에 전달하고
 * 토스트 피드백 + 캐시 갱신 신호 반환.
 */

import { toast } from 'sonner'

export type StatsActionType =
  | 'toggle_slot'
  | 'apply_slot_position'
  | 'change_title'
  | 'add_to_rewrite_queue'

export interface StatsActionResult {
  ok: boolean
  message: string
}

/**
 * 통계 액션 적용 — 토스트 피드백 자동 처리.
 *
 * 호출 측에서 await으로 결과 받아 후속 fetch (낙관적 갱신) 처리.
 */
export async function applyStatsAction(
  actionType: StatsActionType,
  payload: Record<string, unknown>,
): Promise<StatsActionResult> {
  try {
    const res = await fetch('/api/stats/action/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType, payload }),
    })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      const errMsg = json.error || `요청 실패 (${res.status})`
      toast.error('적용 실패', { description: errMsg })
      return { ok: false, message: errMsg }
    }
    toast.success('적용 완료', { description: json.message })
    return { ok: true, message: json.message }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '네트워크 오류'
    toast.error('적용 실패', { description: msg })
    return { ok: false, message: msg }
  }
}
