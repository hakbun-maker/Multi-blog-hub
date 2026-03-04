-- 스케줄러 작업 테이블
CREATE TABLE IF NOT EXISTS public.scheduler_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '자동화 규칙',
  blog_ids      UUID[] NOT NULL DEFAULT '{}',
  frequency     TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('once','daily','weekly','monthly')),
  run_hour      INTEGER NOT NULL DEFAULT 9 CHECK (run_hour BETWEEN 0 AND 23),
  run_minute    INTEGER NOT NULL DEFAULT 0 CHECK (run_minute BETWEEN 0 AND 59),
  posts_per_run INTEGER NOT NULL DEFAULT 1,
  image_count   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  next_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 키워드 풀 테이블
CREATE TABLE IF NOT EXISTS public.keyword_pool (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id      UUID REFERENCES public.scheduler_jobs(id) ON DELETE SET NULL,
  keyword     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','used')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, keyword)
);

-- 실행 로그 테이블
CREATE TABLE IF NOT EXISTS public.scheduler_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID REFERENCES public.scheduler_jobs(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('success','failed','running')),
  post_ids     UUID[] DEFAULT '{}',
  error_msg    TEXT,
  executed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.scheduler_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduler_jobs: 본인만" ON public.scheduler_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "keyword_pool: 본인만" ON public.keyword_pool FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "scheduler_logs: 본인만" ON public.scheduler_logs FOR ALL USING (auth.uid() = user_id);
