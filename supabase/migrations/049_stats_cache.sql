-- 통계 페이지 캐시 테이블
-- 1시간 TTL로 GA4·AdSense·GSC API 호출 비용 절감
-- 캐시 키별로 가공된 통계 데이터를 jsonb로 저장
--
-- 사용처: lib/stats/cache.ts의 getOrCompute 헬퍼
-- 캐시 키 예: 'overview', 'roi-ranking', 'pareto', 'optimization', ...

CREATE TABLE public.stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  data JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT unique_user_cache_key UNIQUE (user_id, cache_key)
);

-- 만료 체크에 자주 사용
CREATE INDEX idx_stats_cache_user_key ON public.stats_cache(user_id, cache_key);
CREATE INDEX idx_stats_cache_expires ON public.stats_cache(expires_at);

-- RLS — 본인 row만 조회/수정/삭제
ALTER TABLE public.stats_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stats_cache_select" ON public.stats_cache
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "stats_cache_insert" ON public.stats_cache
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "stats_cache_update" ON public.stats_cache
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "stats_cache_delete" ON public.stats_cache
  FOR DELETE USING (user_id = auth.uid());

COMMENT ON TABLE public.stats_cache IS
  '통계 페이지의 가공된 데이터 캐시. 1시간 TTL로 외부 API 호출 비용 절감';
COMMENT ON COLUMN public.stats_cache.cache_key IS
  '캐시 종류 식별자: overview / roi-ranking / pareto / optimization / forecast / hidden-gems / drilldown 등';
