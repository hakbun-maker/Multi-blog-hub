CREATE TABLE IF NOT EXISTS public.snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'code', 'html', 'link')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snippets: 본인만 조회" ON public.snippets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snippets: 본인만 생성" ON public.snippets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "snippets: 본인만 수정" ON public.snippets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "snippets: 본인만 삭제" ON public.snippets FOR DELETE USING (auth.uid() = user_id);
