-- 통계 페이지 행동 카탈로그의 'add_to_rewrite_queue' 액션용
-- ROI 하위 글을 재작성 큐에 넣어 추적하기 위한 단순 플래그.
-- NULL = 미등록, timestamptz = 등록 시각

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS rewrite_queued_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_rewrite_queued
  ON public.posts(user_id, rewrite_queued_at)
  WHERE rewrite_queued_at IS NOT NULL;

COMMENT ON COLUMN public.posts.rewrite_queued_at IS
  '재작성 큐 등록 시각. /stats action/apply의 add_to_rewrite_queue 액션으로 설정';
