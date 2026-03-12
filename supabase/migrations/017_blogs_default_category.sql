-- blogs 테이블에 기본 카테고리 FK 추가
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS default_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
