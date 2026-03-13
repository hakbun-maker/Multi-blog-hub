-- ai_api_keys.provider CHECK 제약 조건에 'imagen' 추가
ALTER TABLE public.ai_api_keys
  DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;

ALTER TABLE public.ai_api_keys
  ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (provider IN ('claude', 'openai', 'gemini', 'imagen'));
