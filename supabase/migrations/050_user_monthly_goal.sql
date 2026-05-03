-- 통계 페이지 forecast 섹션의 월 목표 진척도 계산용
-- 사용자가 설정한 월 수익 목표(USD). 미설정 시 NULL.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS monthly_revenue_goal NUMERIC(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.users.monthly_revenue_goal IS
  '사용자가 설정한 월 수익 목표 (USD). /stats forecast 섹션에서 진척도/달성 가능성 계산에 사용';
