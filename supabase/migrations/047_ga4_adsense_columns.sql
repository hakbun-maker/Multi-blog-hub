-- 047: GA4 Data API + AdSense Management API 풀 연동을 위한 컬럼 추가

-- 1) blogs.ga4_property_id
--    create-property API가 생성한 GA4 property의 숫자 ID (e.g. "123456789")
--    Data API 호출에 필요: GET https://analyticsdata.googleapis.com/v1beta/properties/{ga4_property_id}:runReport
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;

COMMENT ON COLUMN public.blogs.ga4_property_id IS
  'GA4 property numeric ID (Data API runReport 호출용). measurementId(G-XXXX)와는 별개.';

CREATE INDEX IF NOT EXISTS idx_blogs_ga4_property_id
  ON public.blogs(ga4_property_id) WHERE ga4_property_id IS NOT NULL;

-- 2) user_oauth_tokens.adsense_account_id
--    AdSense Management API의 accounts/{account} 식별자 (e.g. "pub-1234567890123456")
ALTER TABLE public.user_oauth_tokens
  ADD COLUMN IF NOT EXISTS adsense_account_id TEXT;

COMMENT ON COLUMN public.user_oauth_tokens.adsense_account_id IS
  'AdSense Management API account ID (없으면 AdSense 미승인 또는 미연동)';
