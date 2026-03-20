-- AI API Keys 테이블에 추가 인증 필드 확장
-- 목적: 네이버 광고 API의 Customer ID 등 3번째 인증 값이 필요한 프로바이더 지원

ALTER TABLE public.ai_api_keys
  ADD COLUMN IF NOT EXISTS encrypted_extra TEXT;

COMMENT ON COLUMN public.ai_api_keys.encrypted_extra IS
  '추가 인증 정보 (예: 네이버 광고 API Customer ID). AES-256-GCM 암호화 저장';
