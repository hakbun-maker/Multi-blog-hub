-- 029: 지원 테이블 생성 (포스트 광고 성과, 블로그 키워드 할당, 키워드 검색 이력)
-- P0-T2: 수익화 로켓 코어 테이블
-- 포스트별 광고 성과, 블로그별 키워드 할당, 사용자 검색 이력 추적

-- ============================================================
-- 1. 포스트 광고 성과 테이블
-- ============================================================

CREATE TABLE public.post_ad_performance (
  -- 기본 정보
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             UUID NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,

  -- 성과 날짜
  performance_date    DATE NOT NULL,                    -- 성과 기록 날짜

  -- 광고 성과 데이터
  revenue             NUMERIC(10,2) DEFAULT 0,          -- 광고 수익 (원화)
  cpc                 NUMERIC(10,2) DEFAULT 0,          -- Cost Per Click (원화)
  ctr                 NUMERIC(5,2) DEFAULT 0,           -- 클릭률 (%)
  clicks              INTEGER DEFAULT 0,                 -- 클릭 수
  impressions         INTEGER DEFAULT 0,                 -- 노출 수

  -- 시간 정보
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.post_ad_performance ENABLE ROW LEVEL SECURITY;

-- 정책: 포스트 소유자(블로그 소유자)만 조회/수정
CREATE POLICY "post_ad_performance: 소유자만" ON public.post_ad_performance
  FOR SELECT USING (
    post_id IN (
      SELECT sp.id FROM public.scheduled_posts sp
      JOIN public.blogs b ON sp.blog_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

CREATE POLICY "post_ad_performance: 소유자만 수정" ON public.post_ad_performance
  FOR ALL USING (
    post_id IN (
      SELECT sp.id FROM public.scheduled_posts sp
      JOIN public.blogs b ON sp.blog_id = b.id
      WHERE b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    post_id IN (
      SELECT sp.id FROM public.scheduled_posts sp
      JOIN public.blogs b ON sp.blog_id = b.id
      WHERE b.user_id = auth.uid()
    )
  );

-- 코멘트 (문서화)
COMMENT ON TABLE public.post_ad_performance IS '각 포스트의 일별 광고 성과 추적 테이블';
COMMENT ON COLUMN public.post_ad_performance.performance_date IS '광고 성과 기록 날짜';
COMMENT ON COLUMN public.post_ad_performance.cpc IS 'Cost Per Click: 클릭당 비용 (원화)';
COMMENT ON COLUMN public.post_ad_performance.ctr IS 'Click Through Rate: 클릭률 (%)';

-- ============================================================
-- 2. 블로그 키워드 할당 테이블
-- ============================================================

CREATE TABLE public.blog_keyword_assignments (
  -- 기본 정보
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id             UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  keyword_id          UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,

  -- 할당 정보
  assigned_date       DATE NOT NULL,                    -- 할당 날짜
  assigned_time       TIME DEFAULT '06:00',             -- 할당 시간
  assignment_reason   TEXT,                              -- 할당 사유

  -- 확인 및 의도
  is_confirmed        BOOLEAN DEFAULT false,             -- 확인 여부
  intent_type         TEXT CHECK (intent_type IN ('AD','REVIEW','INFO','CRITIC','COMPARE','TREND')),
  intent_fit_score    NUMERIC(3,2) DEFAULT 0,           -- 의도 적합도 점수 (0-1)

  -- 시간 정보
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.blog_keyword_assignments ENABLE ROW LEVEL SECURITY;

-- 정책: 본인의 블로그 할당만 조회/수정
CREATE POLICY "blog_keyword_assignments: 본인 블로그만" ON public.blog_keyword_assignments
  FOR SELECT USING (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  );

CREATE POLICY "blog_keyword_assignments: 본인 블로그만 수정" ON public.blog_keyword_assignments
  FOR ALL USING (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  )
  WITH CHECK (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  );

-- 코멘트 (문서화)
COMMENT ON TABLE public.blog_keyword_assignments IS '블로그별로 할당된 키워드 관리 테이블';
COMMENT ON COLUMN public.blog_keyword_assignments.assignment_reason IS '해당 키워드를 블로그에 할당한 사유';
COMMENT ON COLUMN public.blog_keyword_assignments.is_confirmed IS '블로그 소유자가 키워드 할당을 확인했는지 여부';
COMMENT ON COLUMN public.blog_keyword_assignments.intent_fit_score IS '키워드 의도와 블로그 콘텐츠의 적합도 점수 (0-1)';

-- ============================================================
-- 3. 키워드 검색 이력 테이블
-- ============================================================

CREATE TABLE public.keyword_search_history (
  -- 기본 정보
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 검색 정보
  search_query        TEXT NOT NULL,                    -- 검색 쿼리
  search_type         TEXT DEFAULT 'gold' CHECK (search_type IN ('gold','event','seasonal')),

  -- 결과 정보
  result_count        INTEGER DEFAULT 0,                 -- 검색 결과 수

  -- 시간 정보
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.keyword_search_history ENABLE ROW LEVEL SECURITY;

-- 정책: 본인의 검색 이력만 조회/수정
CREATE POLICY "keyword_search_history: 본인만" ON public.keyword_search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "keyword_search_history: 본인만 수정" ON public.keyword_search_history
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 코멘트 (문서화)
COMMENT ON TABLE public.keyword_search_history IS '사용자의 키워드 검색 이력을 추적하는 테이블. 검색 행동 분석에 활용';
COMMENT ON COLUMN public.keyword_search_history.search_query IS '사용자가 검색한 키워드 쿼리';
COMMENT ON COLUMN public.keyword_search_history.search_type IS '검색 유형: gold(수익형), event(이벤트), seasonal(계절)';
COMMENT ON COLUMN public.keyword_search_history.result_count IS '해당 검색에서 나온 결과 키워드 개수';
