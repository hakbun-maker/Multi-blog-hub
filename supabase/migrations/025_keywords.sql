-- 025: 키워드 테이블 생성
-- P0-T2: 수익화 로켓 코어 테이블
-- 사용자의 금 키워드, 이벤트 키워드, 시즌 키워드 관리

CREATE TABLE public.keywords (
  -- 기본 정보
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  keyword               TEXT NOT NULL,

  -- 키워드 분류
  keyword_type          TEXT NOT NULL DEFAULT 'gold' CHECK (keyword_type IN ('gold','event','seasonal')),
  intent_type           TEXT CHECK (intent_type IN ('AD','REVIEW','INFO','CRITIC','COMPARE','TREND')),

  -- 수익성 평가
  revenue_score         NUMERIC(5,2) DEFAULT 0,           -- 수익성 점수 (0-100)
  keyword_grade         VARCHAR(1) DEFAULT 'D' CHECK (keyword_grade IN ('S','A','B','C','D')),

  -- 검색 데이터
  monthly_search_volume INTEGER DEFAULT 0,                 -- 월간 검색량
  cpc_estimate          NUMERIC(10,2) DEFAULT 0,          -- CPC 예상값 (KRW)
  competition_score     NUMERIC(5,2) DEFAULT 0,           -- 경쟁도 점수 (0-100)
  trend_index           NUMERIC(5,2) DEFAULT 0,           -- 트렌드 지수 (0-100)

  -- 계절성 정보
  is_seasonal           BOOLEAN DEFAULT false,
  seasonal_months       INTEGER[],                         -- 시즌 월 배열 [3,4,5] 등

  -- 생명 주기
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

-- 정책: 본인의 키워드만 조회/수정
CREATE POLICY "keywords: 본인만 조회" ON public.keywords
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "keywords: 본인만 수정" ON public.keywords
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 코멘트 (문서화)
COMMENT ON TABLE public.keywords IS '사용자 키워드 관리 테이블. 금 키워드, 이벤트 키워드, 시즌 키워드를 관리합니다.';
COMMENT ON COLUMN public.keywords.keyword_type IS '키워드 유형: gold(수익형), event(이벤트), seasonal(계절)';
COMMENT ON COLUMN public.keywords.revenue_score IS '수익성 점수 (0-100). 높을수록 수익성 있음';
COMMENT ON COLUMN public.keywords.keyword_grade IS 'S부터 D까지의 등급. S가 가장 우수함';
COMMENT ON COLUMN public.keywords.cpc_estimate IS 'Cost Per Click 예상값 (원화)';
