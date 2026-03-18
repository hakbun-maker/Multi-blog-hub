-- ============================================================
-- 요금제 시스템 (Plans & Pricing)
-- ============================================================

-- 1. plans 테이블
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  annual_price INTEGER NOT NULL DEFAULT 0,
  max_blogs INTEGER NOT NULL DEFAULT 3,
  position TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. plan_features 테이블
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled TEXT NOT NULL DEFAULT 'false',
  UNIQUE(plan_id, feature_key)
);

-- 3. discount_policies 테이블
CREATE TABLE IF NOT EXISTS public.discount_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rate', 'amount')),
  value NUMERIC NOT NULL,
  target_plan TEXT REFERENCES public.plans(id),
  target_billing TEXT CHECK (target_billing IN ('monthly', 'annual', 'all')) DEFAULT 'all',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  stackable BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. user_plans 테이블
CREATE TABLE IF NOT EXISTS public.user_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id) DEFAULT 'lite',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly',
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. users 테이블에 plan_id 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES public.plans(id) DEFAULT 'lite';

-- ============================================================
-- RLS 정책
-- ============================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans: 인증 사용자 조회" ON public.plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features: 인증 사용자 조회" ON public.plan_features
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE public.discount_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discount_policies: 활성 할인 조회" ON public.discount_policies
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_plans: 본인만 조회" ON public.user_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_plans: 본인만 생성" ON public.user_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_plans: 본인만 수정" ON public.user_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON public.plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_policies_active ON public.discount_policies(is_active, start_at, end_at);

-- ============================================================
-- 시드 데이터: plans
-- ============================================================
INSERT INTO public.plans (id, name, display_name, monthly_price, annual_price, max_blogs, position, sort_order) VALUES
  ('lite',   'Lite',   '무료',    0,       0,         3,   '일단 써봐',       0),
  ('basic',  'Basic',  'Basic',   9900,    108900,    10,  '제대로 쓰자',     1),
  ('pro',    'Pro',    'Pro',     49000,   539000,    10,  '수익화 준비하자',  2),
  ('growth', 'Growth', 'Growth',  99000,   1089000,   30,  '자동으로 돈 벌자', 3),
  ('scale',  'Scale',  'Scale',   199000,  2189000,   100, '사업으로 굴리자',  4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 시드 데이터: plan_features
-- ============================================================
-- Lite
INSERT INTO public.plan_features (plan_id, feature_key, enabled) VALUES
  ('lite', 'general_writing', 'true'),
  ('lite', 'writing_limit_monthly', '20'),
  ('lite', 'full_editor', 'false'),
  ('lite', 'revenue_dashboard', 'false'),
  ('lite', 'keyword_explorer', 'false'),
  ('lite', 'scheduler', 'false'),
  ('lite', 'auto_writing_pipeline', 'false'),
  ('lite', 'auto_publish', 'false'),
  ('lite', 'coupang_affiliate', 'false'),
  ('lite', 'sns_auto_deploy', 'false'),
  ('lite', 'multilingual', 'false'),
  ('lite', 'revenue_guide_panel', 'false'),
  ('lite', 'team_accounts', '0'),
  ('lite', 'priority_support', 'false');

-- Basic
INSERT INTO public.plan_features (plan_id, feature_key, enabled) VALUES
  ('basic', 'general_writing', 'true'),
  ('basic', 'writing_limit_monthly', 'unlimited'),
  ('basic', 'full_editor', 'true'),
  ('basic', 'revenue_dashboard', 'false'),
  ('basic', 'keyword_explorer', 'false'),
  ('basic', 'scheduler', 'false'),
  ('basic', 'auto_writing_pipeline', 'false'),
  ('basic', 'auto_publish', 'false'),
  ('basic', 'coupang_affiliate', 'false'),
  ('basic', 'sns_auto_deploy', 'false'),
  ('basic', 'multilingual', 'false'),
  ('basic', 'revenue_guide_panel', 'false'),
  ('basic', 'team_accounts', '0'),
  ('basic', 'priority_support', 'false');

-- Pro
INSERT INTO public.plan_features (plan_id, feature_key, enabled) VALUES
  ('pro', 'general_writing', 'true'),
  ('pro', 'writing_limit_monthly', 'unlimited'),
  ('pro', 'full_editor', 'true'),
  ('pro', 'revenue_dashboard', 'readonly'),
  ('pro', 'keyword_explorer', 'true'),
  ('pro', 'scheduler', 'true'),
  ('pro', 'auto_writing_pipeline', 'false'),
  ('pro', 'auto_publish', 'false'),
  ('pro', 'coupang_affiliate', 'false'),
  ('pro', 'sns_auto_deploy', 'false'),
  ('pro', 'multilingual', 'false'),
  ('pro', 'revenue_guide_panel', 'false'),
  ('pro', 'team_accounts', '0'),
  ('pro', 'priority_support', 'false');

-- Growth
INSERT INTO public.plan_features (plan_id, feature_key, enabled) VALUES
  ('growth', 'general_writing', 'true'),
  ('growth', 'writing_limit_monthly', 'unlimited'),
  ('growth', 'full_editor', 'true'),
  ('growth', 'revenue_dashboard', 'true'),
  ('growth', 'keyword_explorer', 'true'),
  ('growth', 'scheduler', 'true'),
  ('growth', 'auto_writing_pipeline', 'true'),
  ('growth', 'auto_publish', 'true'),
  ('growth', 'coupang_affiliate', 'true'),
  ('growth', 'sns_auto_deploy', 'true'),
  ('growth', 'multilingual', 'true'),
  ('growth', 'revenue_guide_panel', 'true'),
  ('growth', 'team_accounts', '0'),
  ('growth', 'priority_support', 'false');

-- Scale
INSERT INTO public.plan_features (plan_id, feature_key, enabled) VALUES
  ('scale', 'general_writing', 'true'),
  ('scale', 'writing_limit_monthly', 'unlimited'),
  ('scale', 'full_editor', 'true'),
  ('scale', 'revenue_dashboard', 'true'),
  ('scale', 'keyword_explorer', 'true'),
  ('scale', 'scheduler', 'true'),
  ('scale', 'auto_writing_pipeline', 'true'),
  ('scale', 'auto_publish', 'true'),
  ('scale', 'coupang_affiliate', 'true'),
  ('scale', 'sns_auto_deploy', 'true'),
  ('scale', 'multilingual', 'true'),
  ('scale', 'revenue_guide_panel', 'true'),
  ('scale', 'team_accounts', '3'),
  ('scale', 'priority_support', 'true');

-- ============================================================
-- 기존 사용자 자동 할당
-- ============================================================
UPDATE public.users SET plan_id = 'lite' WHERE plan_id IS NULL;

INSERT INTO public.user_plans (user_id, plan_id, billing_cycle)
SELECT id, 'lite', 'monthly' FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_plans);

-- ============================================================
-- 신규 가입 트리거 업데이트
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'lite'
  );
  INSERT INTO public.user_plans (user_id, plan_id, billing_cycle)
  VALUES (NEW.id, 'lite', 'monthly');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
