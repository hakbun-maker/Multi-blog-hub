'use client'

import { MonetizeSubNav } from '@/components/monetize/MonetizeSubNav'
import { FeatureGate } from '@/components/plan/FeatureGate'
import { KeywordExplorer } from '@/components/keywords/KeywordExplorer'

/** 수익화 > 키워드 탐색기 — 통합 대시보드로 전환 */
export default function MonetizeKeywordsPage() {
  return (
    <>
      <MonetizeSubNav />
      <FeatureGate featureKey="keyword_explorer" minPlan="pro" featureName="키워드 탐색기">
        <KeywordExplorer />
      </FeatureGate>
    </>
  )
}
