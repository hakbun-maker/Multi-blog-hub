-- Google Search Console URL Inspection API 검사 결과 저장
-- 일괄 적용 버튼이 호출하는 자동 색인 상태 검증용 (수동 GSC UI의 10건/일 한도 대체)

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS indexing_verdict TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS indexing_coverage_state TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS indexing_inspected_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS indexing_last_crawl_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_indexing_inspected
  ON public.posts(user_id, indexing_inspected_at);

COMMENT ON COLUMN public.posts.indexing_verdict IS
  'GSC URL Inspection API verdict: PASS / PARTIAL / FAIL / NEUTRAL / VERDICT_UNSPECIFIED';
COMMENT ON COLUMN public.posts.indexing_coverage_state IS
  'GSC가 반환한 사람이 읽을 수 있는 색인 상태. 예: "Submitted and indexed", "Crawled - currently not indexed"';
COMMENT ON COLUMN public.posts.indexing_inspected_at IS
  '마지막 URL Inspection API 검사 시각. 결과 신선도 판정용';
COMMENT ON COLUMN public.posts.indexing_last_crawl_at IS
  'Googlebot이 마지막으로 이 URL을 크롤링한 시각 (GSC가 보고한 값)';
