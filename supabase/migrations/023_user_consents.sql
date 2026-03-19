-- 사용자 동의 관리 테이블
-- PC-T1: Consent Management DB tables - File 1

CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 및 동의 정보
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',

  -- 동의 시간 정보
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 동의 수집 메타데이터
  ip_address TEXT,
  user_agent TEXT,
  method TEXT DEFAULT 'checkbox',

  -- 동의 철회 정보
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- 외래 키: users 테이블 참조
  CONSTRAINT fk_user_consents_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,

  -- 동의 유형 제약 조건
  CONSTRAINT check_consent_type CHECK (consent_type IN (
    'tos',
    'privacy',
    'marketing',
    'api_key_storage',
    'automation',
    'sns_oauth_instagram',
    'sns_oauth_twitter',
    'sns_oauth_threads',
    'affiliate_marketing',
    'adsense_oauth',
    'blog_platform_tistory',
    'blog_platform_wordpress'
  )),

  -- 동의 수집 방법 제약 조건
  CONSTRAINT check_method CHECK (method IN ('checkbox', 'modal', 'inline_panel', 'upgrade_flow')),

  -- 사용자별 동의 유형 및 버전 중복 방지
  CONSTRAINT unique_user_consent_version UNIQUE (user_id, consent_type, consent_version)
);

-- 인덱스 생성
-- 사용자 ID로 빠른 조회
CREATE INDEX idx_user_consents_user ON public.user_consents(user_id);

-- 활성 동의 (철회되지 않음)로 빠른 조회
CREATE INDEX idx_user_consents_active ON public.user_consents(user_id, consent_type)
  WHERE revoked_at IS NULL;

-- 행 수준 보안 (RLS) 활성화
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 동의 정보만 조회 가능
CREATE POLICY "사용자_자신의_동의_조회"
  ON public.user_consents
  FOR SELECT
  USING (user_id = auth.uid());

-- 정책: 사용자는 자신의 동의 정보만 삽입 가능
CREATE POLICY "사용자_자신의_동의_삽입"
  ON public.user_consents
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 정책: 사용자는 자신의 동의 정보만 수정 가능 (철회만 가능)
CREATE POLICY "사용자_자신의_동의_수정"
  ON public.user_consents
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 정책: 사용자는 자신의 동의 정보만 삭제 가능
CREATE POLICY "사용자_자신의_동의_삭제"
  ON public.user_consents
  FOR DELETE
  USING (user_id = auth.uid());

-- 테이블 설명
COMMENT ON TABLE public.user_consents IS '사용자의 각 동의 기록을 관리하는 테이블';
COMMENT ON COLUMN public.user_consents.id IS '동의 기록의 고유 식별자';
COMMENT ON COLUMN public.user_consents.user_id IS '동의한 사용자의 ID';
COMMENT ON COLUMN public.user_consents.consent_type IS '동의 유형 (약관, 개인정보, 마케팅 등)';
COMMENT ON COLUMN public.user_consents.consent_version IS '동의한 버전';
COMMENT ON COLUMN public.user_consents.agreed_at IS '동의한 시간';
COMMENT ON COLUMN public.user_consents.ip_address IS '동의 시 사용자의 IP 주소';
COMMENT ON COLUMN public.user_consents.user_agent IS '동의 시 사용자의 브라우저 정보';
COMMENT ON COLUMN public.user_consents.method IS '동의 수집 방법 (체크박스, 모달, 인라인 패널, 업그레이드 플로우)';
COMMENT ON COLUMN public.user_consents.revoked_at IS '동의 철회 시간';
COMMENT ON COLUMN public.user_consents.revoked_reason IS '동의 철회 사유';
