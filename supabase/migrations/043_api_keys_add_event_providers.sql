-- ai_api_keys 프로바이더 목록에 google_trends, interpark 추가

ALTER TABLE public.ai_api_keys
  DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;

ALTER TABLE public.ai_api_keys
  ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (provider IN (
    'claude',
    'openai',
    'gemini',
    'imagen',
    'naver_ad',
    'naver_search',
    'google_kwp',
    'google_trends',
    'interpark',
    'coupang',
    'amazon'
  ));
