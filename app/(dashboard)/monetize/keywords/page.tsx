'use client'

import { MonetizeSubNav } from '@/components/monetize/MonetizeSubNav'
import { FeatureGate } from '@/components/plan/FeatureGate'
import { ControlCenter } from '@/components/keywords/ControlCenter'

export default function MonetizeKeywordsPage() {
  return (
    <>
      <MonetizeSubNav />
      <FeatureGate featureKey="keyword_explorer" minPlan="pro" featureName="키워드 자동화 컨트롤센터">
        <ControlCenter />
      </FeatureGate>
    </>
  )
}
