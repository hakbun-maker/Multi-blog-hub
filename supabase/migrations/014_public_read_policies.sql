-- 공개 블로그 페이지용: 활성 블로그는 누구나 조회 가능
CREATE POLICY "blogs: 활성 블로그 공개 조회"
  ON public.blogs FOR SELECT
  USING (is_active = true);

-- 공개 블로그 페이지용: 발행된 글은 누구나 조회 가능
CREATE POLICY "posts: 발행글 공개 조회"
  ON public.posts FOR SELECT
  USING (status = 'published');
