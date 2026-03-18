'use client'

import { useState, useEffect } from 'react'
import { Check, Crown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { PlanId, FeatureKey } from '@/types/plan'
import { PLAN_ORDER, FEATURE_LABELS } from '@/lib/plan/constants'

interface PlanData {
  id: PlanId
  name: string
  display_name: string
  monthly_price: number
  annual_price: number
  max_blogs: number
  position: string
  features: Record<string, string>
}

const DISPLAY_FEATURES: FeatureKey[] = [
  'general_writing',
  'full_editor',
  'keyword_explorer',
  'scheduler',
  'revenue_dashboard',
  'auto_writing_pipeline',
  'auto_publish',
  'sns_auto_deploy',
  'coupang_affiliate',
  'multilingual',
  'revenue_guide_panel',
  'team_accounts',
  'priority_support',
]

const PLAN_COLORS: Record<PlanId, string> = {
  lite: 'border-gray-300',
  basic: 'border-blue-400',
  pro: 'border-purple-400',
  growth: 'border-orange-400',
  scale: 'border-red-400',
}

const PLAN_BG: Record<PlanId, string> = {
  lite: 'bg-gray-50',
  basic: 'bg-blue-50',
  pro: 'bg-purple-50',
  growth: 'bg-orange-50',
  scale: 'bg-red-50',
}

export function PlanSettingsTab({ currentPlanId, onPlanChange }: { currentPlanId: PlanId; onPlanChange: () => void }) {
  const [plans, setPlans] = useState<PlanData[]>([])
  const [loading, setLoading] = useState(true)
  const [annual, setAnnual] = useState(false)
  const [changing, setChanging] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(({ data }) => { setPlans(data?.plans ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSelect = async (planId: PlanId) => {
    if (planId === currentPlanId) return
    setChanging(planId)
    try {
      const res = await fetch('/api/user/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle: annual ? 'annual' : 'monthly' }),
      })
      if (res.ok) onPlanChange()
    } finally {
      setChanging(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-lg" />)}
        </div>
      </div>
    )
  }

  const formatPrice = (price: number) => price === 0 ? '무료' : `${price.toLocaleString()}원`

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">요금제</h3>
        <p className="text-sm text-gray-500 mt-1">현재 플랜을 확인하고 변경할 수 있습니다. (결제 기능은 추후 추가 예정)</p>
      </div>

      {/* 월간/연간 토글 */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-400'}`}>월간</span>
        <button
          onClick={() => setAnnual(!annual)}
          className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
        <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
          연간 <span className="text-xs text-green-600 font-normal">(1개월 무료)</span>
        </span>
      </div>

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {plans.map(plan => {
          const isCurrent = plan.id === currentPlanId
          const isUpgrade = PLAN_ORDER[plan.id] > PLAN_ORDER[currentPlanId]
          const price = annual ? plan.annual_price : plan.monthly_price
          const priceLabel = annual ? '/년' : '/월'

          return (
            <Card key={plan.id} className={`relative transition-all ${isCurrent ? `ring-2 ring-blue-500 ${PLAN_BG[plan.id]}` : `hover:shadow-md ${PLAN_COLORS[plan.id]}`}`}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <Crown className="w-3 h-3" /> 현재 플랜
                  </span>
                </div>
              )}
              <CardContent className="p-4 pt-6">
                <div className="text-center mb-4">
                  <h4 className="font-bold text-lg">{plan.display_name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.position}</p>
                  <div className="mt-3">
                    <span className="text-2xl font-bold">{formatPrice(price)}</span>
                    {price > 0 && <span className="text-xs text-gray-400">{priceLabel}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">블로그 {plan.max_blogs}개</p>
                </div>

                {/* 기능 목록 */}
                <div className="space-y-1.5 mb-4">
                  {DISPLAY_FEATURES.map(fk => {
                    const val = plan.features[fk] ?? 'false'
                    const enabled = val === 'true' || val === 'readonly' || val === 'unlimited'
                    const label = fk === 'writing_limit_monthly'
                      ? (val === 'unlimited' ? '무제한' : `월 ${val}건`)
                      : FEATURE_LABELS[fk]
                    const extra = val === 'readonly' ? ' (열람)' : fk === 'team_accounts' && val !== '0' ? ` (${val}명)` : ''

                    return (
                      <div key={fk} className={`flex items-center gap-1.5 text-xs ${enabled ? 'text-gray-700' : 'text-gray-300'}`}>
                        <Check className={`w-3.5 h-3.5 flex-shrink-0 ${enabled ? 'text-green-500' : 'text-gray-200'}`} />
                        <span>{label}{extra}</span>
                      </div>
                    )
                  })}
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  variant={isCurrent ? 'outline' : isUpgrade ? 'default' : 'secondary'}
                  disabled={isCurrent || changing !== null}
                  onClick={() => handleSelect(plan.id)}
                >
                  {changing === plan.id ? '변경 중...' : isCurrent ? '사용 중' : isUpgrade ? (
                    <><Sparkles className="w-3.5 h-3.5 mr-1" />업그레이드</>
                  ) : '다운그레이드'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">* 현재는 테스트 모드입니다. 실제 결제 없이 플랜을 변경할 수 있습니다.</p>
    </div>
  )
}
