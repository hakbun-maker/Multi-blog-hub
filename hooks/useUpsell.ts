'use client'

import { useState, useCallback } from 'react'
import { UPSELL_TRIGGERS } from '@/lib/plan/constants'
import type { UpsellTrigger } from '@/types/plan'
import { usePlanContext } from '@/components/plan/PlanContext'

export function useUpsell() {
  const { planId, planContext } = usePlanContext()
  const [activeUpsell, setActiveUpsell] = useState<UpsellTrigger | null>(null)

  const checkBlogLimit = useCallback(() => {
    if (!planContext) return false
    const { usage, plan } = planContext
    if (usage.blogCount >= plan.max_blogs) {
      const trigger = UPSELL_TRIGGERS.find(
        t => t.currentPlan === planId && t.triggerType === 'blog_limit_reached'
      )
      if (trigger) { setActiveUpsell(trigger); return true }
    }
    if (usage.blogCount >= plan.max_blogs * 0.9) {
      const trigger = UPSELL_TRIGGERS.find(
        t => t.currentPlan === planId && t.triggerType === 'blog_limit_warning'
      )
      if (trigger) { setActiveUpsell(trigger); return true }
    }
    return false
  }, [planContext, planId])

  const checkPostLimit = useCallback(() => {
    if (!planContext) return false
    const limit = planContext.features.writing_limit_monthly
    if (limit === 'unlimited') return false
    const max = parseInt(limit, 10)
    if (isNaN(max)) return false
    if (planContext.usage.monthlyPostCount >= max) {
      const trigger = UPSELL_TRIGGERS.find(
        t => t.currentPlan === planId && t.triggerType === 'writing_limit_reached'
      )
      if (trigger) { setActiveUpsell(trigger); return true }
    }
    return false
  }, [planContext, planId])

  const triggerFeatureUpsell = useCallback((triggerType: string) => {
    const trigger = UPSELL_TRIGGERS.find(
      t => t.currentPlan === planId && t.triggerType === triggerType
    )
    if (trigger) setActiveUpsell(trigger)
  }, [planId])

  const dismissUpsell = useCallback(() => setActiveUpsell(null), [])

  return { activeUpsell, checkBlogLimit, checkPostLimit, triggerFeatureUpsell, dismissUpsell }
}
