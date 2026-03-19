-- 동의 버전 관리 테이블
-- PC-T1: Consent Management DB tables - File 2

CREATE TABLE public.consent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 동의 유형 및 버전 정보
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,

  -- 버전 메타데이터
  title TEXT NOT NULL,
  summary TEXT,
  content_url TEXT,

  -- 타이밍 정보
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),

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

  -- 동의 유형과 버전의 중복 방지
  CONSTRAINT unique_consent_type_version UNIQUE (consent_type, version)
);

-- 인덱스 생성
-- 동의 유형별 버전 조회
CREATE INDEX idx_consent_versions_type ON public.consent_versions(consent_type);

-- 동의 유형과 버전 조합으로 빠른 조회
CREATE INDEX idx_consent_versions_type_version ON public.consent_versions(consent_type, version);

-- 행 수준 보안 (RLS) 활성화
ALTER TABLE public.consent_versions ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 인증된 사용자는 동의 버전 정보 조회 가능
CREATE POLICY "인증된_사용자_동의_버전_조회"
  ON public.consent_versions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 테이블 설명
COMMENT ON TABLE public.consent_versions IS '동의의 각 버전을 관리하는 테이블. 동의 내용 변경 이력 추적용';
COMMENT ON COLUMN public.consent_versions.id IS '버전 기록의 고유 식별자';
COMMENT ON COLUMN public.consent_versions.consent_type IS '동의 유형 (약관, 개인정보, 마케팅 등)';
COMMENT ON COLUMN public.consent_versions.version IS '버전 번호 (예: 1.0, 2.0)';
COMMENT ON COLUMN public.consent_versions.title IS '동의의 제목';
COMMENT ON COLUMN public.consent_versions.summary IS '동의의 요약';
COMMENT ON COLUMN public.consent_versions.content_url IS '동의 내용을 볼 수 있는 URL';
COMMENT ON COLUMN public.consent_versions.effective_date IS '해당 버전이 효력을 발생하는 날짜';
COMMENT ON COLUMN public.consent_versions.created_at IS '버전이 생성된 시간';

-- 초기 데이터 삽입 (모든 동의 유형에 대해 v1.0 생성)
INSERT INTO public.consent_versions (consent_type, version, title, summary, effective_date)
VALUES
  ('tos', '1.0', '서비스 이용약관', '블로그 허브 서비스 이용 시 동의해야 하는 약관', CURRENT_DATE),
  ('privacy', '1.0', '개인정보 처리방침', '사용자의 개인정보 수집 및 이용에 관한 정책', CURRENT_DATE),
  ('marketing', '1.0', '마케팅 정보 수신', '마케팅 이메일 및 알림 수신에 대한 동의', CURRENT_DATE),
  ('api_key_storage', '1.0', 'API 키 저장 동의', '사용자의 API 키를 서버에 저장하기 위한 동의', CURRENT_DATE),
  ('automation', '1.0', '자동화 처리 동의', '자동화 기능 사용을 위한 동의', CURRENT_DATE),
  ('sns_oauth_instagram', '1.0', 'Instagram 연동 동의', 'Instagram 계정 연동 및 접근에 대한 동의', CURRENT_DATE),
  ('sns_oauth_twitter', '1.0', 'X(Twitter) 연동 동의', 'X(Twitter) 계정 연동 및 접근에 대한 동의', CURRENT_DATE),
  ('sns_oauth_threads', '1.0', 'Threads 연동 동의', 'Threads 계정 연동 및 접근에 대한 동의', CURRENT_DATE),
  ('affiliate_marketing', '1.0', '제휴마케팅 자동 삽입 동의', '게시물에 제휴마케팅 링크 자동 삽입에 대한 동의', CURRENT_DATE),
  ('adsense_oauth', '1.0', 'AdSense 연동 동의', 'Google AdSense 계정 연동 및 접근에 대한 동의', CURRENT_DATE),
  ('blog_platform_tistory', '1.0', '티스토리 연동 동의', '티스토리 플랫폼 연동 및 자동 발행에 대한 동의', CURRENT_DATE),
  ('blog_platform_wordpress', '1.0', 'WordPress 연동 동의', 'WordPress 플랫폼 연동 및 자동 발행에 대한 동의', CURRENT_DATE)
ON CONFLICT (consent_type, version) DO NOTHING;
