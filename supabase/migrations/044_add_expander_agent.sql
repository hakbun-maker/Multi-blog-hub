-- Expander 에이전트 추가: agent_logs와 keyword_pipeline에 새 값 허용

-- 1. agent_logs: agent_type CHECK에 'expander' 추가
ALTER TABLE public.agent_logs DROP CONSTRAINT IF EXISTS agent_logs_agent_type_check;
ALTER TABLE public.agent_logs
  ADD CONSTRAINT agent_logs_agent_type_check
  CHECK (agent_type IN ('scout','expander','analyst','planner','writer','publisher'));

-- 2. keyword_pipeline: stage CHECK에 'expanded' 추가
ALTER TABLE public.keyword_pipeline DROP CONSTRAINT IF EXISTS keyword_pipeline_stage_check;
ALTER TABLE public.keyword_pipeline
  ADD CONSTRAINT keyword_pipeline_stage_check
  CHECK (stage IN (
    'discovered','expanded','scored','assigned',
    'writing','review','scheduled','published'
  ));

COMMENT ON COLUMN public.agent_logs.agent_type IS '에이전트 유형: scout | expander | analyst | planner | writer | publisher';
