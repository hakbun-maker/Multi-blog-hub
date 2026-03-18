export type PlanId = 'lite' | 'basic' | 'pro' | 'growth' | 'scale'

export type FeatureKey =
  | 'general_writing'
  | 'writing_limit_monthly'
  | 'full_editor'
  | 'revenue_dashboard'
  | 'keyword_explorer'
  | 'scheduler'
  | 'auto_writing_pipeline'
  | 'auto_publish'
  | 'coupang_affiliate'
  | 'sns_auto_deploy'
  | 'multilingual'
  | 'revenue_guide_panel'
  | 'team_accounts'
  | 'priority_support'

export type FeatureAccess = 'true' | 'false' | 'readonly' | 'unlimited' | string

export interface Plan {
  id: PlanId
  name: string
  display_name: string
  monthly_price: number
  annual_price: number
  max_blogs: number
  position: string
  sort_order: number
  is_active: boolean
}

export interface PlanFeature {
  plan_id: PlanId
  feature_key: FeatureKey
  enabled: FeatureAccess
}

export interface UserPlan {
  user_id: string
  plan_id: PlanId
  billing_cycle: 'monthly' | 'annual'
  started_at: string
  expires_at: string | null
}

export interface UserPlanContext {
  plan: Plan
  features: Record<FeatureKey, FeatureAccess>
  usage: {
    blogCount: number
    monthlyPostCount: number
  }
}

export interface UpsellTrigger {
  currentPlan: PlanId
  triggerType: string
  targetPlan: PlanId
  message: string
}
