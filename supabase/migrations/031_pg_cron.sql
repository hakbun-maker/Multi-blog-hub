-- P0-T4: pg_cron 스케줄 등록
-- 수익화 로켓 자동 발행 + 급상승 키워드 체크

-- ============================================================
-- 1. 자동 발행 트리거 함수 (스텁)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_auto_publish()
RETURNS void AS $$
BEGIN
  -- 스텁: P1-R7-T1에서 실제 파이프라인 로직으로 교체 예정
  -- 오늘 날짜 + pending 상태인 scheduled_posts를 처리
  UPDATE public.scheduled_posts
  SET status = 'writing', updated_at = now()
  WHERE scheduled_date = CURRENT_DATE
    AND status = 'pending'
    AND scheduled_time <= CURRENT_TIME;

  RAISE NOTICE 'Auto-publish triggered at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. 급상승 키워드 체크 함수 (스텁)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_trending_keywords()
RETURNS void AS $$
BEGIN
  -- 스텁: P1-R1-T3에서 실제 트렌드 체크 로직으로 교체 예정
  RAISE NOTICE 'Trending keyword check triggered at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. pg_cron 등록 (Supabase에서 pg_cron 확장이 활성화되어 있어야 함)
-- 주의: Supabase Free 플랜에서는 pg_cron이 제한될 수 있음
-- 대안으로 Vercel Cron 사용 가능 (vercel.json에서 설정)
-- ============================================================

-- 3-1. 자동 발행: 매일 UTC 21:00 (KST 06:00)
-- SELECT cron.schedule('auto-publish-rocket', '0 21 * * *', 'SELECT public.trigger_auto_publish()');

-- 3-2. 급상승 키워드 체크: 매시간 정각
-- SELECT cron.schedule('trending-keyword-check', '0 * * * *', 'SELECT public.check_trending_keywords()');

-- 참고: pg_cron이 비활성화된 환경에서는 위 SELECT를 수동 실행하거나
-- Vercel Cron (/api/cron/monetize-publish, /api/cron/trending-check)을 사용

-- ============================================================
-- 4. 함수 권한 설정
-- ============================================================
COMMENT ON FUNCTION public.trigger_auto_publish IS '수익화 로켓 자동 발행 트리거. KST 06:00에 실행됨';
COMMENT ON FUNCTION public.check_trending_keywords IS '급상승 키워드 자동 체크. 매시간 실행됨';
