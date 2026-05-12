/**
 * 알림 트리거 헬퍼 — 서버에서 직접 호출하여 notifications 테이블에 row 생성.
 *
 * 사용처:
 *  - /api/cron/check-notifications (일 1회 cron)
 *  - /api/posts/[id] PATCH (글 발행 시 색인 갱신 알림 등)
 *  - GSC OAuth 콜백 등
 *
 * 중복 방지: 같은 user_id + type 조합의 활성 알림이 이미 있으면 metadata만 갱신.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationType =
  | 'threads_token_expiring'    // 50일 경과
  | 'threads_token_expired'      // 60일 만료
  | 'gsc_token_disconnected'     // GSC 토큰 끊김
  | 'indexing_refresh_due'       // 색인 후 6일 경과 (7일차 재색인 안내)
  | 'gsc_quota_warning'          // Indexing API 일일 한도 임박
  | 'general'                    // 일반 알림

export interface NotificationInput {
  userId: string
  type: NotificationType
  severity: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  guideMarkdown?: string
  metadata?: Record<string, unknown>
}

/**
 * 알림 생성. 같은 (userId, type) 활성 알림 있으면 업데이트 (덮어쓰기).
 */
export async function createNotification(
  supabase: SupabaseClient,
  input: NotificationInput,
): Promise<{ ok: boolean; error?: string }> {
  // 기존 활성 알림 조회
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', input.userId)
    .eq('type', input.type)
    .is('dismissed_at', null)
    .maybeSingle()

  const payload = {
    user_id: input.userId,
    type: input.type,
    severity: input.severity,
    title: input.title,
    message: input.message,
    action_label: input.actionLabel ?? null,
    action_url: input.actionUrl ?? null,
    guide_markdown: input.guideMarkdown ?? null,
    metadata: input.metadata ?? null,
  }

  if (existing) {
    // 업데이트 (read_at은 그대로 유지하지 않고 reset — 새 알림이므로)
    const { error } = await supabase
      .from('notifications')
      .update({ ...payload, read_at: null })
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  const { error } = await supabase.from('notifications').insert(payload)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * 같은 type의 활성 알림이 있으면 자동 dismiss (조건 해소 시 호출).
 */
export async function resolveNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
): Promise<void> {
  await supabase
    .from('notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('type', type)
    .is('dismissed_at', null)
}

// ─── 미리 만들어둔 알림 템플릿 ──────────────────────

export function threadsTokenExpiringNotification(daysLeft: number): Omit<NotificationInput, 'userId'> {
  return {
    type: 'threads_token_expiring',
    severity: 'warning',
    title: `Threads 토큰 ${daysLeft}일 후 만료`,
    message: `Threads Long-Lived Access Token이 ${daysLeft}일 후 만료됩니다. 만료 전 갱신해주세요.`,
    actionLabel: 'API 키 관리로 이동',
    actionUrl: '/settings',
    guideMarkdown: `Threads 토큰 갱신 절차:

1. Meta for Developers 콘솔 접속:
   https://developers.facebook.com

2. 본인 앱 선택 → "Threads API" → "사용자 토큰 생성기"

3. 본인 Threads 계정 인증 → Short-Lived Token 발급

4. "Long-Lived Token으로 교환" 버튼 클릭

5. 새 토큰 (EAAJ... / IGAAxxx...) 복사

6. 이 사이트 설정 > API 키 관리 > Threads 항목에 붙여넣고 저장

⚠️ 갱신 안 하면 자동 발행 중단됩니다.`,
  }
}

export function threadsTokenExpiredNotification(): Omit<NotificationInput, 'userId'> {
  return {
    type: 'threads_token_expired',
    severity: 'error',
    title: 'Threads 토큰 만료됨',
    message: 'Threads Long-Lived Token이 만료되어 자동 발행이 중단됐습니다. 즉시 재발급해주세요.',
    actionLabel: 'API 키 관리로 이동',
    actionUrl: '/settings',
    guideMarkdown: `Threads 토큰 만료 후 재발급:

1. https://developers.facebook.com 접속
2. 앱 → Threads API → 사용자 토큰 생성기
3. 본인 Threads 계정 재인증 → Short-Lived Token 발급
4. Long-Lived Token으로 교환 (60일 유효)
5. 새 토큰 복사 → 이 사이트 설정 > API 키 관리 > Threads에 붙여넣기
6. 저장 후 자동 발행 재개`,
  }
}

export function gscTokenDisconnectedNotification(): Omit<NotificationInput, 'userId'> {
  return {
    type: 'gsc_token_disconnected',
    severity: 'error',
    title: 'GSC 색인 토큰 끊김',
    message: 'Google Search Console 색인 토큰이 만료되거나 취소됐습니다. 자동 색인이 동작하지 않습니다.',
    actionLabel: '블로그 설정으로 이동',
    actionUrl: '/blogs',
    guideMarkdown: `GSC 색인 OAuth 재연결:

1. 좌측 메뉴 "블로그 관리" → 아무 블로그 선택
2. 우상단 "설정" → "레이아웃" 탭
3. "색인/사이트맵" 섹션 펼치기
4. "연결 해제" 클릭 (있으면)
5. "Google 계정 연결하기 (Indexing API)" 클릭
6. OAuth 동의 화면에서 모든 권한 체크 → 계속

⚠️ 본인 OAuth는 7일마다 자동 만료됩니다 (Google 정책).`,
  }
}

export function indexingRefreshDueNotification(daysSinceLastIndex: number): Omit<NotificationInput, 'userId'> {
  return {
    type: 'indexing_refresh_due',
    severity: 'warning',
    title: '색인 갱신 필요',
    message: `마지막 자동 색인 후 ${daysSinceLastIndex}일 경과. 7일차에 GSC OAuth가 만료되니 미리 재연결해주세요.`,
    actionLabel: '블로그 설정으로 이동',
    actionUrl: '/blogs',
    guideMarkdown: `7일 만료 전 미리 재연결하면 발행글 자동 색인이 끊기지 않습니다.

1. 블로그 관리 → 블로그 선택 → 설정
2. 레이아웃 탭 → 색인/사이트맵
3. "Google 계정 연결하기 (Indexing API)"

⏱️ 약 1분 소요됩니다.`,
  }
}
