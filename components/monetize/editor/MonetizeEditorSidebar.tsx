'use client'

import { FeatureGate } from '@/components/plan/FeatureGate'
import { QualityScoreSidebar } from './QualityScoreSidebar'
import { AIImproveSuggestion } from './AIImproveSuggestion'
import { SEOChecklist } from './SEOChecklist'

interface MonetizeEditorSidebarProps {
  postId: string
  keyword: string
  content: string
}

export function MonetizeEditorSidebar({ postId, keyword, content }: MonetizeEditorSidebarProps) {
  return (
    <FeatureGate featureKey="auto_writing_pipeline" minPlan="growth" featureName="품질 검수 사이드패널">
      <div className="space-y-4">
        <QualityScoreSidebar postId={postId} />
        <AIImproveSuggestion postId={postId} />
        <SEOChecklist content={content} keyword={keyword} />
      </div>
    </FeatureGate>
  )
}
