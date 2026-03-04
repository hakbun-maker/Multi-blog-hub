CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  html_content TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  keywords TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  seo_meta JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts: 본인만 조회" ON public.posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "posts: 본인만 생성" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts: 본인만 수정" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts: 본인만 삭제" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
