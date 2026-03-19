-- 026: 키워드 클러스터 테이블 생성
-- P0-T2: 수익화 로켓 코어 테이블
-- 관련 키워드들을 의도별로 그룹화

CREATE TABLE public.keyword_clusters (
  -- 기본 정보
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seed_keyword_id     UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,

  -- 클러스터 구성
  cluster_keywords    JSONB DEFAULT '[]',                 -- 클러스터 내 키워드 배열
  cluster_strategy    TEXT,                               -- 클러스터 전략 설명

  -- 의도별 가중치
  intent_weights      JSONB DEFAULT '{}',                 -- {'AD': 0.5, 'REVIEW': 0.3, ...}

  -- 시간 정보
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.keyword_clusters ENABLE ROW LEVEL SECURITY;

-- 정책: 본인의 클러스터만 조회/수정
CREATE POLICY "keyword_clusters: 본인만 조회" ON public.keyword_clusters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "keyword_clusters: 본인만 수정" ON public.keyword_clusters
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 코멘트 (문서화)
COMMENT ON TABLE public.keyword_clusters IS '관련 키워드들을 시드 키워드 기준으로 의도별로 그룹화한 테이블';
COMMENT ON COLUMN public.keyword_clusters.cluster_keywords IS '클러스터 내 키워드 목록 (JSON 배열)';
COMMENT ON COLUMN public.keyword_clusters.intent_weights IS '각 의도별 가중치 (JSON 객체)';
