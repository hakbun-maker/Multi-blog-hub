-- 032: SNS 포스트 테이블
CREATE TABLE public.sns_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  scheduled_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','twitter','threads')),
  content TEXT NOT NULL,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','published','failed')),
  platform_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sns_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sns_posts: 본인 블로그만" ON public.sns_posts
  FOR ALL USING (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()))
  WITH CHECK (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));

CREATE INDEX idx_sns_posts_blog ON public.sns_posts(blog_id);
CREATE INDEX idx_sns_posts_status ON public.sns_posts(status);
