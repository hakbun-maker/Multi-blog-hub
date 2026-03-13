CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  custom_domain TEXT,
  subdomain TEXT,
  description TEXT,
  ai_character_config JSONB DEFAULT '{}',
  ai_provider TEXT DEFAULT 'claude',
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, slug)
);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blogs: 본인만 조회" ON public.blogs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "blogs: 본인만 생성" ON public.blogs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blogs: 본인만 수정" ON public.blogs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "blogs: 본인만 삭제" ON public.blogs FOR DELETE USING (auth.uid() = user_id);
