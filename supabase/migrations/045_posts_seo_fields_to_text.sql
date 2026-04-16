-- varchar(160) 제한으로 인한 발행 실패 해결
-- seo_title, meta_description 컬럼이 VARCHAR로 생성되어 있으면 TEXT로 변경
-- (이미 TEXT이면 아무 영향 없음)

ALTER TABLE public.posts
  ALTER COLUMN seo_title TYPE TEXT,
  ALTER COLUMN meta_description TYPE TEXT;
