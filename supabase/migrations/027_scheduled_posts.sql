-- 027: 예약 포스트 테이블 생성
-- P0-T2: 수익화 로켓 코어 테이블
-- 블로그별 포스트 발행 일정 및 상태 관리

CREATE TABLE public.scheduled_posts (
  -- 기본 정보
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id             UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  keyword_id          UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
  cluster_id          UUID REFERENCES public.keyword_clusters(id) ON DELETE SET NULL,

  -- 발행 일정
  scheduled_date      DATE NOT NULL,                     -- 예정된 발행 날짜
  scheduled_time      TIME DEFAULT '06:00',             -- 예정된 발행 시간

  -- 상태 관리
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','writing','reviewing','review_queue','auto_published','published','rejected')),
  writing_mode        TEXT DEFAULT 'auto' CHECK (writing_mode IN ('auto','manual')),

  -- 콘텐츠
  content_draft       TEXT,                              -- 작성 중인 콘텐츠
  platform_post_id    TEXT,                              -- 플랫폼 포스트 ID

  -- 의도 및 점수
  intent_type         TEXT CHECK (intent_type IN ('AD','REVIEW','INFO','CRITIC','COMPARE','TREND')),
  intent_fit_score    NUMERIC(3,2) DEFAULT 0,           -- 의도 적합도 점수 (0-1)

  -- 발행 정보
  published_at        TIMESTAMPTZ,

  -- 시간 정보
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 행 수준 보안 활성화
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- 정책: 본인의 블로그 포스트만 조회/수정
CREATE POLICY "scheduled_posts: 본인 블로그만" ON public.scheduled_posts
  FOR SELECT USING (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  );

CREATE POLICY "scheduled_posts: 본인 블로그만 수정" ON public.scheduled_posts
  FOR ALL USING (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  )
  WITH CHECK (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  );

-- 코멘트 (문서화)
COMMENT ON TABLE public.scheduled_posts IS '블로그 포스트의 발행 일정, 상태, 콘텐츠를 관리하는 테이블';
COMMENT ON COLUMN public.scheduled_posts.status IS '포스트 상태: pending(대기), writing(작성중), reviewing(검토중), review_queue(검토대기), auto_published(자동발행), published(발행완료), rejected(거절)';
COMMENT ON COLUMN public.scheduled_posts.writing_mode IS '작성 모드: auto(자동), manual(수동)';
COMMENT ON COLUMN public.scheduled_posts.intent_fit_score IS '키워드 의도와의 적합도 점수 (0-1)';
