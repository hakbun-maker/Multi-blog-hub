/**
 * 독립 cron 라우트 — 외부 cron 서비스(예: cron-job.org)에서 호출 시 사용.
 * Vercel Cron에선 /api/cron/run이 같은 헬퍼를 호출하므로 이 라우트는 백업용.
 *
 * 헤더: Authorization: Bearer ${CRON_SECRET}
 */

import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkAllNotifications } from '@/lib/notifications/check-all'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase: SupabaseClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const summary = await checkAllNotifications(supabase)
  return NextResponse.json({ ok: true, summary })
}
