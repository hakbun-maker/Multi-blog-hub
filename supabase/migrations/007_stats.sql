-- 통계 집계 뷰 (posts 테이블 기반)
CREATE OR REPLACE VIEW public.stats_summary AS
SELECT
  p.user_id,
  p.blog_id,
  COUNT(*) FILTER (WHERE p.status = 'published') AS published_count,
  COUNT(*) AS total_count,
  COALESCE(SUM(p.view_count), 0) AS total_views,
  DATE_TRUNC('day', p.published_at) AS day
FROM public.posts p
GROUP BY p.user_id, p.blog_id, DATE_TRUNC('day', p.published_at);

-- 일별 뷰 집계 테이블 (실제 방문자 트래킹용, 나중에 연동)
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blog_id    UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  visitors   INTEGER DEFAULT 0,
  views      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blog_id, date)
);

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_stats: 본인만" ON public.daily_stats FOR ALL USING (auth.uid() = user_id);
