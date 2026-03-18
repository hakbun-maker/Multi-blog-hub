'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PlanId, FeatureKey, FeatureAccess, Plan, UserPlanContext } from '@/types/plan'
import { PLAN_ORDER } from '@/lib/plan/constants'

export function usePlan() {
  const [planContext, setPlanContext] = useState<UserPlanContext | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/plan')
      const json = await res.json()
      if (json.data) setPlanContext(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  const hasFeature = useCallback((key: FeatureKey): boolean => {
    if (!planContext) return false
    const val = planContext.features[key]
    return val === 'true' || val === 'readonly' || val === 'unlimited'
  }, [planContext])

  const getFeatureValue = useCallback((key: FeatureKey): FeatureAccess => {
    return planContext?.features[key] ?? 'false'
  }, [planContext])

  const isAtLeast = useCallback((planId: PlanId): boolean => {
    if (!planContext) return false
    return PLAN_ORDER[planContext.plan.id as PlanId] >= PLAN_ORDER[planId]
  }, [planContext])

  const canCreateBlog = useCallback((): boolean => {
    if (!planContext) return false
    return planContext.usage.blogCount < planContext.plan.max_blogs
  }, [planContext])

  const canCreatePost = useCallback((): boolean => {
    if (!planContext) return false
    const limit = planContext.features.writing_limit_monthly
    if (limit === 'unlimited') return true
    const max = parseInt(limit, 10)
    if (isNaN(max)) return true
    return planContext.usage.monthlyPostCount < max
  }, [planContext])

  return {
    planContext,
    loading,
    refetch: fetchPlan,
    hasFeature,
    getFeatureValue,
    isAtLeast,
    canCreateBlog,
    canCreatePost,
    planId: (planContext?.plan.id as PlanId) ?? 'lite',
    plan: planContext?.plan ?? null,
  }
}
