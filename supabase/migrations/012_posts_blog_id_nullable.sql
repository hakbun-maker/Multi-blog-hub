-- blog_id를 nullable로 변경 (임시저장 시 블로그 미선택 허용)
ALTER TABLE public.posts ALTER COLUMN blog_id DROP NOT NULL;
