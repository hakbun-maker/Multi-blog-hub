-- 광고 단위 테이블
CREATE TABLE IF NOT EXISTS public.ad_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blog_id     UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  ad_code     TEXT NOT NULL DEFAULT '',
  position    TEXT NOT NULL DEFAULT 'content' CHECK (position IN ('header','content','sidebar','footer')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ad_units: 본인만" ON public.ad_units FOR ALL USING (auth.uid() = user_id);
