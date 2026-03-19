'use client'

import { FeatureGate } from '@/components/plan/FeatureGate'
import { PipelineStatusBoard } from '@/components/monetize/writing/PipelineStatusBoard'
import { ReviewQueueList } from '@/components/monetize/writing/ReviewQueueList'

export default function WritingPage() {
  return (
    <FeatureGate featureKey="revenue_dashboard" minPlan="pro" featureName="글작성&대기">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">글작성 & 대기</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI 글쓰기 파이프라인 현황과 검수 대기 목록을 관리합니다.</p>
        </div>
        <PipelineStatusBoard />
        <ReviewQueueList />
      </div>
    </FeatureGate>
  )
}
