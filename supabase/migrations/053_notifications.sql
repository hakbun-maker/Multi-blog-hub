-- 사용자 알림 시스템
-- 우측 상단 종 아이콘에 미읽음 카운트 표시 + /settings/notifications 페이지에서 상세 확인
--
-- 알림 종류 (type):
--   threads_token_expiring  — Threads Long-Lived Token 만료 임박 (50일 경과)
--   threads_token_expired   — 만료 후 갱신 실패
--   gsc_token_disconnected  — GSC OAuth 토큰 끊김
--   indexing_refresh_due    — 마지막 색인 후 6일 경과 (7일차 재색인 안내)
--   info / warning / error  — 일반 정보·경고·오류

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT DEFAULT NULL,
  action_url TEXT DEFAULT NULL,
  guide_markdown TEXT DEFAULT NULL,  -- 상세 가이드 (사용자가 직접 처리할 수 있도록 안내)
  read_at TIMESTAMPTZ DEFAULT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NULL,
  metadata JSONB DEFAULT NULL,  -- 추가 컨텍스트 (예: { blogId, expiresAt })
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read_at, dismissed_at)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type
  ON public.notifications(user_id, type);

-- 같은 type의 미해결 알림 중복 방지를 위한 unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_user_type_active
  ON public.notifications(user_id, type)
  WHERE dismissed_at IS NULL;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS
  '사용자 알림. 종 아이콘 + /settings/notifications 페이지에서 표시';
COMMENT ON COLUMN public.notifications.guide_markdown IS
  '사용자가 직접 처리할 수 있게 단계별 안내 (Threads 토큰 갱신, GSC 재연결 등)';
