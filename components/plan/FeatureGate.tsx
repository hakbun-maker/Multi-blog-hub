'use client'

import { useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { usePlanContext } from '@/components/plan/PlanContext'
import { UpgradeModal } from '@/components/plan/UpgradeModal'
import type { FeatureKey, PlanId } from '@/types/plan'
import { PLAN_LABELS } from '@/lib/plan/constants'

interface FeatureGateProps {
  featureKey: FeatureKey
  minPlan: PlanId
  featureName: string
  children: ReactNode
  mode?: 'overlay' | 'replace'
}

export function FeatureGate({ featureKey, minPlan, featureName, children, mode = 'overlay' }: FeatureGateProps) {
  const { hasFeature, planId } = usePlanContext()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const allowed = hasFeature(featureKey)

  if (allowed) return <>{children}</>

  const message = `이 기능은 ${PLAN_LABELS[minPlan]} 플랜부터 사용할 수 있어요.`

  if (mode === 'replace') {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center cursor-pointer" onClick={() => setShowUpgrade(true)}>
          <Lock className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm font-medium text-gray-500">{featureName}</p>
          <p className="text-xs text-gray-400 mt-1">{PLAN_LABELS[minPlan]} 플랜부터 사용 가능</p>
          <button className="mt-3 text-sm text-blue-600 hover:underline">요금제 업그레이드</button>
        </div>
        <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} currentPlan={planId} targetPlan={minPlan} message={message} featureName={featureName} />
      </>
    )
  }

  return (
    <>
      <div className="relative" onClick={() => setShowUpgrade(true)}>
        <div className="opacity-30 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
          <div className="bg-white/80 rounded-lg px-4 py-3 flex items-center gap-2 shadow-sm border">
            <Lock className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">{PLAN_LABELS[minPlan]}+ 전용</span>
          </div>
        </div>
      </div>
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} currentPlan={planId} targetPlan={minPlan} message={message} featureName={featureName} />
    </>
  )
}
