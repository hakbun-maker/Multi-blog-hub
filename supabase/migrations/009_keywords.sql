-- 키워드 검색 이력 테이블
CREATE TABLE IF NOT EXISTS public.keyword_searches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  keyword          TEXT NOT NULL,
  search_volume    INTEGER DEFAULT 0,
  competition      TEXT DEFAULT 'unknown' CHECK (competition IN ('low','medium','high','unknown')),
  related_keywords TEXT[] DEFAULT '{}',
  source           TEXT DEFAULT 'manual',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.keyword_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "keyword_searches: 본인만" ON public.keyword_searches FOR ALL USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_keyword_searches_user ON public.keyword_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_pool_user ON public.keyword_pool(user_id, status);
