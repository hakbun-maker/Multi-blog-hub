-- 공개 블로그 페이지용: 카테고리는 누구나 조회 가능
CREATE POLICY "categories: 공개 조회"
  ON public.categories FOR SELECT
  USING (true);
