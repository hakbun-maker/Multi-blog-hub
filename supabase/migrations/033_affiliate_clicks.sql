-- 033: 제휴 클릭 추적 테이블
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('coupang','amazon')),
  product_name TEXT,
  click_url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  converted BOOLEAN DEFAULT false,
  revenue NUMERIC(10,2) DEFAULT 0
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_clicks: 본인 블로그만" ON public.affiliate_clicks
  FOR ALL USING (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()))
  WITH CHECK (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));

CREATE INDEX idx_affiliate_clicks_blog ON public.affiliate_clicks(blog_id);
CREATE INDEX idx_affiliate_clicks_post ON public.affiliate_clicks(post_id);
