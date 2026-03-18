import { createClient } from '@/lib/supabase/server'
import type { PlanId, FeatureKey, FeatureAccess, Plan, UserPlanContext } from '@/types/plan'

export async function getUserPlanContext(): Promise<UserPlanContext | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('plan_id')
    .eq('id', user.id)
    .single()

  const planId: PlanId = (userData?.plan_id as PlanId) ?? 'lite'

  const [{ data: plan }, { data: features }] = await Promise.all([
    supabase.from('plans').select('*').eq('id', planId).single(),
    supabase.from('plan_features').select('feature_key, enabled').eq('plan_id', planId),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ count: blogCount }, { count: monthlyPostCount }] = await Promise.all([
    supabase.from('blogs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('posts').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart),
  ])

  const featuresMap: Record<string, FeatureAccess> = {}
  for (const f of (features ?? [])) {
    featuresMap[f.feature_key] = f.enabled
  }

  return {
    plan: plan as Plan,
    features: featuresMap as Record<FeatureKey, FeatureAccess>,
    usage: {
      blogCount: blogCount ?? 0,
      monthlyPostCount: monthlyPostCount ?? 0,
    },
  }
}

export function isFeatureEnabled(ctx: UserPlanContext, featureKey: FeatureKey): boolean {
  const val = ctx.features[featureKey]
  return val === 'true' || val === 'readonly' || val === 'unlimited'
}

export function canCreateBlog(ctx: UserPlanContext): { allowed: boolean; message?: string } {
  if (ctx.usage.blogCount >= ctx.plan.max_blogs) {
    return {
      allowed: false,
      message: `현재 플랜(${ctx.plan.display_name})의 블로그 한도(${ctx.plan.max_blogs}개)에 도달했습니다.`,
    }
  }
  return { allowed: true }
}

export function canCreatePost(ctx: UserPlanContext): { allowed: boolean; message?: string } {
  const limit = ctx.features.writing_limit_monthly
  if (limit === 'unlimited' || limit === 'true') return { allowed: true }

  const maxPosts = parseInt(limit, 10)
  if (isNaN(maxPosts)) return { allowed: true }

  if (ctx.usage.monthlyPostCount >= maxPosts) {
    return {
      allowed: false,
      message: `이번 달 글쓰기 한도(${maxPosts}건)에 도달했습니다. 플랜을 업그레이드하세요.`,
    }
  }
  return { allowed: true }
}
