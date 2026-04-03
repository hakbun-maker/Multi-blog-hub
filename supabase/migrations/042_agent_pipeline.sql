-- 042: AI 에이전트 자동화 파이프라인 테이블
-- 에이전트 활동 기록(agent_logs)과 키워드 파이프라인 단계 추적(keyword_pipeline)을 생성합니다.

-- ============================================================
-- 1. agent_logs — AI 에이전트 활동 기록
-- ============================================================
-- agent_type: 'scout' | 'analyst' | 'planner' | 'writer' | 'publisher'
-- status    : 'running' | 'completed' | 'error'
-- summary   : { discovered: 42, scored: 15, ... } 형태의 집계 데이터

CREATE TABLE IF NOT EXISTS public.agent_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type    text        NOT NULL
                              CHECK (agent_type IN ('scout','analyst','planner','writer','publisher')),
  status        text        NOT NULL DEFAULT 'running'
                              CHECK (status IN ('running','completed','error')),
  started_at    timestamptz DEFAULT now(),
  completed_at  timestamptz,
  summary       jsonb       DEFAULT '{}'::jsonb,
  error_message text,
  created_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE  public.agent_logs               IS 'AI 에이전트(scout/analyst/planner/writer/publisher) 실행 이력';
COMMENT ON COLUMN public.agent_logs.agent_type    IS '에이전트 유형: scout | analyst | planner | writer | publisher';
COMMENT ON COLUMN public.agent_logs.status        IS '실행 상태: running | completed | error';
COMMENT ON COLUMN public.agent_logs.summary       IS '집계 결과 (예: { discovered: 42, scored: 15 })';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_type
  ON public.agent_logs(user_id, agent_type);

CREATE INDEX IF NOT EXISTS idx_agent_logs_created
  ON public.agent_logs(created_at DESC);

-- RLS
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent logs"
  ON public.agent_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. keyword_pipeline — 키워드 파이프라인 단계 추적
-- ============================================================
-- stage 순서: discovered → scored → assigned → writing → review → scheduled → published
-- keyword_type: 'gold' | 'event' | 'seasonal'

CREATE TABLE IF NOT EXISTS public.keyword_pipeline (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 원본 키워드 참조 (키워드 삭제 시 파이프라인 레코드는 유지)
  keyword_id              uuid        REFERENCES public.keywords(id) ON DELETE SET NULL,
  keyword_text            text        NOT NULL,
  keyword_type            text        NOT NULL DEFAULT 'gold'
                                        CHECK (keyword_type IN ('gold','event','seasonal')),

  -- 파이프라인 단계
  stage                   text        NOT NULL DEFAULT 'discovered'
                                        CHECK (stage IN (
                                          'discovered','scored','assigned',
                                          'writing','review','scheduled','published'
                                        )),

  -- 분석 데이터 (analyst 에이전트 결과)
  revenue_score           numeric(5,2)  DEFAULT 0,
  keyword_grade           varchar(1)    DEFAULT 'D'
                                          CHECK (keyword_grade IN ('S','A','B','C','D')),
  intent_type             text          CHECK (intent_type IN ('AD','REVIEW','INFO','CRITIC','COMPARE','TREND')),
  monthly_search_volume   integer       DEFAULT 0,
  cpc_estimate            numeric(10,2) DEFAULT 0,
  competition_score       numeric(5,2)  DEFAULT 0,
  trend_index             numeric(5,2)  DEFAULT 0,

  -- 블로그 배정 데이터 (planner 에이전트 결과)
  assigned_blog_id        uuid,
  assigned_blog_name      text,

  -- 발행 스케줄 데이터
  scheduled_date          date,
  scheduled_time          time,
  scheduled_post_id       uuid,

  -- 이벤트 키워드 전용 데이터
  event_title             text,
  event_date              date,
  event_d_day             integer,
  event_phase             text
                            CHECK (event_phase IN ('pre_info','comparison','preparation','review')),
  event_cluster_id        text,   -- 연관 이벤트 키워드 그룹 식별자

  -- 작성 데이터 (writer 에이전트 결과)
  post_id                 uuid,
  writing_progress        integer DEFAULT 0
                            CHECK (writing_progress BETWEEN 0 AND 100),

  -- 단계별 타임스탬프
  discovered_at           timestamptz DEFAULT now(),
  scored_at               timestamptz,
  assigned_at             timestamptz,
  writing_started_at      timestamptz,
  published_at            timestamptz,

  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

COMMENT ON TABLE  public.keyword_pipeline                  IS '키워드별 자동화 파이프라인 단계 추적 테이블';
COMMENT ON COLUMN public.keyword_pipeline.stage            IS '파이프라인 단계: discovered → scored → assigned → writing → review → scheduled → published';
COMMENT ON COLUMN public.keyword_pipeline.keyword_type     IS '키워드 유형: gold(수익형) | event(이벤트) | seasonal(계절)';
COMMENT ON COLUMN public.keyword_pipeline.revenue_score    IS '수익성 점수 (0-100). analyst 에이전트가 산출';
COMMENT ON COLUMN public.keyword_pipeline.event_cluster_id IS '연관 이벤트 키워드를 묶는 클러스터 식별자';
COMMENT ON COLUMN public.keyword_pipeline.writing_progress IS '글쓰기 진행률 (0-100%)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_kp_user_stage
  ON public.keyword_pipeline(user_id, stage);

CREATE INDEX IF NOT EXISTS idx_kp_event_cluster
  ON public.keyword_pipeline(event_cluster_id)
  WHERE event_cluster_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kp_scheduled
  ON public.keyword_pipeline(scheduled_date)
  WHERE scheduled_date IS NOT NULL;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_keyword_pipeline_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_keyword_pipeline_updated_at ON public.keyword_pipeline;
CREATE TRIGGER trg_keyword_pipeline_updated_at
  BEFORE UPDATE ON public.keyword_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.set_keyword_pipeline_updated_at();

-- RLS
ALTER TABLE public.keyword_pipeline ENABLE ROW LEVEL SECURITY;

-- 조회: 본인 데이터만
CREATE POLICY "Users can view own pipeline"
  ON public.keyword_pipeline
  FOR SELECT
  USING (auth.uid() = user_id);

-- 전체 CUD: 본인 데이터만 삽입·수정·삭제 가능
CREATE POLICY "Users can manage own pipeline"
  ON public.keyword_pipeline
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
