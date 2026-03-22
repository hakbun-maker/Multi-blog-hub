-- 사용자 OAuth 토큰 저장 테이블
-- Google Analytics, 향후 Google AdSense 등 OAuth 연동용

CREATE TABLE public.user_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 참조
  user_id UUID NOT NULL,

  -- OAuth 제공자
  provider TEXT NOT NULL,

  -- 암호화된 토큰
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,

  -- 토큰 만료 시간
  token_expires_at TIMESTAMPTZ,

  -- 인증 범위
  scopes TEXT,

  -- 연결된 Google 계정 (표시용)
  google_account_id TEXT,

  -- 타임스탬프
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 외래 키
  CONSTRAINT fk_user_oauth_tokens_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,

  -- 제공자 제약 조건 (향후 확장 가능)
  CONSTRAINT check_oauth_provider CHECK (provider IN ('google_analytics')),

  -- 사용자별 제공자 유니크
  CONSTRAINT unique_user_oauth_provider UNIQUE (user_id, provider)
);

-- 인덱스
CREATE INDEX idx_user_oauth_tokens_user ON public.user_oauth_tokens(user_id);

-- RLS 활성화
ALTER TABLE public.user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 정책: 본인만 조회
CREATE POLICY "user_oauth_tokens_select" ON public.user_oauth_tokens
  FOR SELECT USING (user_id = auth.uid());

-- 정책: 본인만 삽입
CREATE POLICY "user_oauth_tokens_insert" ON public.user_oauth_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 정책: 본인만 수정
CREATE POLICY "user_oauth_tokens_update" ON public.user_oauth_tokens
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 정책: 본인만 삭제
CREATE POLICY "user_oauth_tokens_delete" ON public.user_oauth_tokens
  FOR DELETE USING (user_id = auth.uid());

-- 테이블 설명
COMMENT ON TABLE public.user_oauth_tokens IS '사용자의 외부 서비스 OAuth 토큰을 암호화하여 저장하는 테이블';
COMMENT ON COLUMN public.user_oauth_tokens.provider IS 'OAuth 제공자 (google_analytics 등)';
COMMENT ON COLUMN public.user_oauth_tokens.encrypted_access_token IS 'AES-256-GCM으로 암호화된 액세스 토큰';
COMMENT ON COLUMN public.user_oauth_tokens.encrypted_refresh_token IS 'AES-256-GCM으로 암호화된 리프레시 토큰';
COMMENT ON COLUMN public.user_oauth_tokens.google_account_id IS '연결된 Google 계정 이메일 (UI 표시용)';
