'use client'

import { MonetizeSubNav } from '@/components/monetize/MonetizeSubNav'
import { FeatureGate } from '@/components/plan/FeatureGate'
import { KeywordExplorer } from '@/components/keywords/KeywordExplorer'

export default function KeywordsPage() {
  return (
    <>
      <MonetizeSubNav />
      <FeatureGate featureKey="keyword_explorer" minPlan="pro" featureName="키워드 탐색기">
        <KeywordExplorer />
      </FeatureGate>
    </>
  )
}
