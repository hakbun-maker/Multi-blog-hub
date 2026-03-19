-- AI API Keys 테이블 확장 - 새로운 프로바이더 및 암호화 필드 추가
-- 목적: Naver, Google Keyword Planner, Coupang, Amazon 등의 추가 프로바이더 지원
-- P0-T1-1 요구사항

-- 1. 기존 CHECK 제약 조건 제거 (안전한 방식으로 처리)
ALTER TABLE public.ai_api_keys
  DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;

-- 2. 새로운 CHECK 제약 조건 추가 (확장된 프로바이더 목록)
ALTER TABLE public.ai_api_keys
  ADD CONSTRAINT ai_api_keys_provider_check
  CHECK (provider IN (
    'claude',       -- Anthropic Claude
    'openai',       -- OpenAI (GPT)
    'gemini',       -- Google Gemini (formerly Bard)
    'imagen',       -- Google Imagen (이미지 생성)
    'naver_ad',     -- Naver 광고 API
    'naver_search', -- Naver 검색 API
    'google_kwp',   -- Google Keyword Planner
    'coupang',      -- Coupang API
    'amazon'        -- Amazon API
  ));

-- 3. 암호화된 시크릿 필드 추가 (Key+Secret 쌍이 필요한 프로바이더용)
-- 예: Naver는 Client ID + Client Secret 필요
ALTER TABLE public.ai_api_keys
  ADD COLUMN IF NOT EXISTS encrypted_secret TEXT;

-- 4. 기존 RLS 정책 유지 (테이블 소유자만 접근 가능)
-- RLS 정책은 005_ai_api_keys.sql에서 이미 생성되었으므로 변경 없음
-- UNIQUE(user_id, provider) 제약도 유지됨

-- 5. 테이블 설명 주석 업데이트
COMMENT ON TABLE public.ai_api_keys IS
  'AI 및 광고 플랫폼 API 키/시크릿 저장소 (암호화 저장)
   AI and Advertising Platform API credentials storage (encrypted)

   지원 프로바이더 목록:
   - claude: Anthropic Claude API
   - openai: OpenAI (GPT) API
   - gemini: Google Gemini API
   - imagen: Google Imagen API (이미지 생성)
   - naver_ad: Naver 광고 API
   - naver_search: Naver 검색 API
   - google_kwp: Google Keyword Planner API
   - coupang: Coupang Partners API
   - amazon: Amazon Product Advertising API

   주의: encrypted_secret이 필요한 프로바이더는 key와 secret을 모두 저장합니다.';

COMMENT ON COLUMN public.ai_api_keys.encrypted_key IS
  'Main API key or credential (암호화된 API 키/인증정보)';

COMMENT ON COLUMN public.ai_api_keys.encrypted_secret IS
  'Secondary secret for dual-credential providers like Naver (Naver 같은 이중 인증이 필요한 프로바이더의 암호화된 시크릿)';

COMMENT ON COLUMN public.ai_api_keys.provider IS
  'API 프로바이더 유형 (AI 서비스 또는 광고 플랫폼)';

COMMENT ON COLUMN public.ai_api_keys.is_active IS
  'API 키의 활성 여부 (False일 경우 사용하지 않음)';
