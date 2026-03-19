-- 블로그 레이아웃 및 추적 설정 컬럼 추가
ALTER TABLE public.blogs
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}' NOT NULL;

COMMENT ON COLUMN public.blogs.layout_config IS 'Blog layout and tracking configuration';
