-- consent_versions 시드 데이터 (재실행 안전)
-- 024_consent_versions.sql에 포함된 INSERT가 실행되지 않은 경우 대비

INSERT INTO public.consent_versions (consent_type, version, title, summary, effective_date)
VALUES
  ('tos', '1.0', '서비스 이용약관', '블로그 허브 서비스 이용 시 동의해야 하는 약관입니다. 서비스 사용 조건, 사용자 권리 및 의무, 콘텐츠 소유권, 면책 조항 등을 포함합니다.', '2026-01-01'),
  ('privacy', '1.0', '개인정보 처리방침', '사용자의 개인정보 수집 항목, 이용 목적, 보유 기간, 제3자 제공 여부 등에 관한 정책입니다.', '2026-01-01'),
  ('marketing', '1.0', '마케팅 정보 수신 동의', '서비스 업데이트, 이벤트, 프로모션 등 마케팅 이메일 및 알림 수신에 대한 동의입니다.', '2026-01-01'),
  ('api_key_storage', '1.0', 'API 키 저장 동의', '사용자가 입력한 외부 서비스 API 키(OpenAI, Google, 네이버 등)를 AES-256-GCM 암호화하여 서버에 저장합니다. 저장된 키는 자동 콘텐츠 생성, 키워드 분석 등 사용자가 설정한 자동화 작업에만 사용됩니다.', '2026-01-01'),
  ('automation', '1.0', '자동화 처리 동의', '수익화 로켓 기능이 사용자 설정에 따라 키워드 분석, 콘텐츠 생성, 스케줄링, 발행을 자동으로 처리합니다. 자동화된 작업 결과는 검수 워크플로우를 통해 사용자가 확인할 수 있습니다.', '2026-01-01'),
  ('sns_oauth_instagram', '1.0', 'Instagram 연동 동의', 'Instagram 계정에 대한 OAuth 인증을 통해 프로필 정보 조회 및 게시물 자동 공유 기능을 제공합니다. 연동 해제 시 저장된 토큰이 즉시 삭제됩니다.', '2026-01-01'),
  ('sns_oauth_twitter', '1.0', 'X(Twitter) 연동 동의', 'X(Twitter) 계정에 대한 OAuth 인증을 통해 트윗 자동 게시 기능을 제공합니다. 연동 해제 시 저장된 토큰이 즉시 삭제됩니다.', '2026-01-01'),
  ('sns_oauth_threads', '1.0', 'Threads 연동 동의', 'Threads 계정에 대한 OAuth 인증을 통해 게시물 자동 공유 기능을 제공합니다. 연동 해제 시 저장된 토큰이 즉시 삭제됩니다.', '2026-01-01'),
  ('affiliate_marketing', '1.0', '제휴마케팅 자동 삽입 동의', '블로그 게시물에 쿠팡 파트너스, Amazon Associates 등 제휴마케팅 상품 링크를 자동으로 삽입합니다. 게시물의 주제(Intent)에 따라 삽입 여부가 결정되며, 설정에서 세부 규칙을 조정할 수 있습니다.', '2026-01-01'),
  ('adsense_oauth', '1.0', 'AdSense 연동 동의', 'Google AdSense 계정 연동을 통해 광고 수익 데이터를 대시보드에 표시합니다. 수익 데이터 조회 목적으로만 사용됩니다.', '2026-01-01'),
  ('blog_platform_tistory', '1.0', '티스토리 연동 동의', '티스토리 블로그 플랫폼에 대한 인증을 통해 게시물 자동 발행 기능을 제공합니다. 연동 해제 시 저장된 인증 정보가 즉시 삭제됩니다.', '2026-01-01'),
  ('blog_platform_wordpress', '1.0', 'WordPress 연동 동의', 'WordPress 블로그 플랫폼에 대한 인증을 통해 게시물 자동 발행 기능을 제공합니다. 연동 해제 시 저장된 인증 정보가 즉시 삭제됩니다.', '2026-01-01')
ON CONFLICT (consent_type, version) DO UPDATE SET
  summary = EXCLUDED.summary,
  effective_date = EXCLUDED.effective_date;
