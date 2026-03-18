'use client'

import { useRouter } from 'next/navigation'
import { Lock, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlanId } from '@/types/plan'
import { PLAN_LABELS } from '@/lib/plan/constants'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: PlanId
  targetPlan: PlanId
  message: string
  featureName?: string
}

export function UpgradeModal({ open, onOpenChange, currentPlan, targetPlan, message, featureName }: UpgradeModalProps) {
  const router = useRouter()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">업그레이드가 필요해요</h3>
        </div>

        <div className="space-y-4">
          {featureName && (
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              {featureName}
            </span>
          )}
          <p className="text-sm text-gray-600">{message}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium text-xs">
              {PLAN_LABELS[currentPlan]}
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="px-2 py-1 rounded-full bg-blue-600 text-white font-medium text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {PLAN_LABELS[targetPlan]}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>나중에</Button>
          <Button size="sm" onClick={() => { onOpenChange(false); router.push('/settings?tab=plan') }}>
            요금제 변경하기
          </Button>
        </div>
      </div>
    </div>
  )
}
