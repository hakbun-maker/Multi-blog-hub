-- 블로그별 카테고리 테이블
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(blog_id, slug)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: 본인 블로그만 조회" ON public.categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = categories.blog_id AND blogs.user_id = auth.uid())
  );
CREATE POLICY "categories: 본인 블로그만 생성" ON public.categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = categories.blog_id AND blogs.user_id = auth.uid())
  );
CREATE POLICY "categories: 본인 블로그만 수정" ON public.categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = categories.blog_id AND blogs.user_id = auth.uid())
  );
CREATE POLICY "categories: 본인 블로그만 삭제" ON public.categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.blogs WHERE blogs.id = categories.blog_id AND blogs.user_id = auth.uid())
  );
