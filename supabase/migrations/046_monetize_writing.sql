-- 수익화 글 작성 (PASONA × AEO/GEO) 지원 컬럼 추가
--
-- 결정사항:
-- 1) 광고 슬롯: 중단 1개만 → adsense_slot_mid 컬럼 추가
-- 2) JSON-LD 토글: layout_config JSONB 안의 키로 저장 (스키마 변경 불필요)
-- 3) 광고 카테고리: blog_type + 키워드 기반 자동 매핑 → 컬럼 불필요
-- 4) PASONA 글 유형(비교/해결/비용): AI가 자동 판정 → 컬럼 불필요
--
-- 결과적으로 필요한 변경은 2개:
--   blogs.adsense_slot_mid (TEXT)  — 광고 슬롯 1개
--   posts.monetize_meta (JSONB)    — 글 작성 후 메타 (pasona_type, ad_category, fact_count 등)

-- 1) blogs: 중단 광고 슬롯 ID
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS adsense_slot_mid TEXT;

COMMENT ON COLUMN public.blogs.adsense_slot_mid IS
  '수익화 글 작성 시 S단계 직후에 자동 삽입되는 AdSense 슬롯 ID. NULL이면 광고 미삽입.';

-- 2) posts: 수익화 글 메타 정보 (JSONB로 유연하게)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS monetize_meta JSONB;

COMMENT ON COLUMN public.posts.monetize_meta IS
  '수익화 글 작성 메타데이터. 예: { "pasona_type": "compare", "ad_category": "insurance", "has_answer_capsule": true, "fact_count": 3, "info_gain": "..." }';

-- 인덱스 (수익화 글만 조회/통계용)
CREATE INDEX IF NOT EXISTS idx_posts_monetize_meta_gin
  ON public.posts USING GIN (monetize_meta);
