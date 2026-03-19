-- 028: 품질 점수 및 수익 분석 테이블 생성
-- P0-T2: 수익화 로켓 코어 테이블
-- 포스트별 품질 평가 및 블로그별 수익 분석 데이터

-- ============================================================
-- 1. 포스트 품질 점수 테이블
-- ============================================================

CREATE TABLE public.post_quality_scores (
  -- 기본 정보
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID NOT NULL UNIQUE REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,

  -- 평가 설정
  check_type          TEXT NOT NULL DEFAULT 'standard' CHECK (check_type IN ('standard','event')),

  -- 점수 (각 항목별)
  discovery_score     NUMERIC(4,1) DEFAULT 0,           -- 발견도: 0-100
  persuasion_score    NUMERIC(4,1) DEFAULT 0,           -- 설득력: 0-100
  conversion_score    NUMERIC(4,1) DEFAULT 0,           -- 전환도: 0-100
  event_score         NUMERIC(4,1) DEFAULT 0,           -- 이벤트성: 0-100
  tech_score          NUMERIC(4,1) DEFAULT 0,           -- 기술도: 0-100

  -- 종합 점수 (자동 계산)
  total_score         NUMERIC(4,1) GENERATED ALWAYS AS (
                        discovery_score + persuasion_score + conversion_score + event_score + tech_score
                      ) STORED,

  -- 발행 판단
  auto_published      BOOLEAN DEFAULT false,            -- 자동 발행 여부
  review_reason       TEXT,                              -- 검토 사유

  -- 상세 정보
  score_breakdown     JSONB DEFAULT '{}',               -- 점수 상세 분석 (JSON)

  -- 시간 정보
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.post_quality_scores ENABLE ROW LEVEL SECURITY;

-- 정책: 포스트 소유자(블로그 소유자)만 조회/수정
CREATE POLICY "post_quality_scores: 소유자만" ON public.post_quality_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      JOIN public.blogs b ON sp.blog_id = b.id
      WHERE sp.id = post_quality_scores.post_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "post_quality_scores: 소유자만 수정" ON public.post_quality_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      JOIN public.blogs b ON sp.blog_id = b.id
      WHERE sp.id = post_quality_scores.post_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scheduled_posts sp
      JOIN public.blogs b ON sp.blog_id = b.id
      WHERE sp.id = post_quality_scores.post_id AND b.user_id = auth.uid()
    )
  );

-- 코멘트 (문서화)
COMMENT ON TABLE public.post_quality_scores IS '각 포스트의 품질을 다각도로 평가하고 자동 발행 여부를 결정하는 테이블';
COMMENT ON COLUMN public.post_quality_scores.check_type IS '평가 유형: standard(표준), event(이벤트)';
COMMENT ON COLUMN public.post_quality_scores.discovery_score IS '검색 발견도 점수 (0-100)';
COMMENT ON COLUMN public.post_quality_scores.persuasion_score IS '설득력 점수 (0-100)';
COMMENT ON COLUMN public.post_quality_scores.conversion_score IS '전환도 점수 (0-100)';
COMMENT ON COLUMN public.post_quality_scores.event_score IS '이벤트 연관성 점수 (0-100)';
COMMENT ON COLUMN public.post_quality_scores.tech_score IS '기술성 점수 (0-100)';

-- ============================================================
-- 2. 수익 분석 테이블
-- ============================================================

CREATE TABLE public.revenue_analytics (
  -- 기본 정보
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id             UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,

  -- 시간 정보
  analytics_date      DATE NOT NULL,                    -- 분석 날짜

  -- 수익 데이터
  estimated_revenue   NUMERIC(12,2) DEFAULT 0,          -- 예상 수익 (원화)
  actual_revenue      NUMERIC(12,2) DEFAULT 0,          -- 실제 수익 (원화)

  -- 분석 기준
  ad_category         TEXT,                              -- 광고 카테고리
  language            VARCHAR(10) DEFAULT 'ko',         -- 언어
  blog_type           TEXT,                              -- 블로그 유형

  -- 성과 메트릭
  page_views          INTEGER DEFAULT 0,                 -- 페이지뷰
  ctr                 NUMERIC(5,2) DEFAULT 0,           -- 클릭률 (%)
  rpm                 NUMERIC(10,2) DEFAULT 0,          -- RPM: 1000뷰당 수익 (원화)

  -- 시간 정보
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.revenue_analytics ENABLE ROW LEVEL SECURITY;

-- 정책: 본인의 블로그 분석 데이터만 조회/수정
CREATE POLICY "revenue_analytics: 본인 블로그만" ON public.revenue_analytics
  FOR SELECT USING (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  );

CREATE POLICY "revenue_analytics: 본인 블로그만 수정" ON public.revenue_analytics
  FOR ALL USING (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  )
  WITH CHECK (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  );

-- 코멘트 (문서화)
COMMENT ON TABLE public.revenue_analytics IS '블로그별 일일 수익 분석 데이터 테이블';
COMMENT ON COLUMN public.revenue_analytics.analytics_date IS '분석 대상 날짜';
COMMENT ON COLUMN public.revenue_analytics.estimated_revenue IS '예상 수익 (원화)';
COMMENT ON COLUMN public.revenue_analytics.actual_revenue IS '실제 수익 (원화)';
COMMENT ON COLUMN public.revenue_analytics.rpm IS 'Revenue Per Mille: 1000 페이지뷰당 수익 (원화)';
