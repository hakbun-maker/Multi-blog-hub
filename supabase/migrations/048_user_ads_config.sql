-- 광고 설정을 사용자 단위로 저장하기 위한 컬럼 추가
-- 기존 blogs.layout_config.ads (블로그별)와 blogs.adsense_slot_mid (블로그별)를
-- users.ads_config (사용자 단위 통합) 로 이전한다.
--
-- 데이터 마이그레이션은 자동 복사하지 않고 빈 상태로 시작 (사용자 결정)
-- 사용자는 설정 > 광고 배치 페이지에서 한 번 입력하면 모든 블로그에 공통 적용됨

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ads_config jsonb NOT NULL DEFAULT '{
    "adsense_pub_id": "",
    "adsense_slot_mid": "",
    "top_banner": { "enabled": false, "code": "" },
    "below_title": { "enabled": false, "code": "" },
    "in_article": { "enabled": false, "code": "" },
    "left_sidebar_ad": { "enabled": false, "code": "" },
    "right_sidebar_ad": { "enabled": false, "code": "" },
    "footer_ad": { "enabled": false, "code": "" }
  }'::jsonb;

COMMENT ON COLUMN public.users.ads_config IS
  '사용자 단위 통합 광고 설정 (모든 블로그에 공통 적용). adsense_pub_id, adsense_slot_mid, 각 슬롯별 enabled/code';
