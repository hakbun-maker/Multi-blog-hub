'use client'

import { useState } from 'react'
import { FeatureGate } from '@/components/plan/FeatureGate'
import { KeywordTypeSelector } from '@/components/monetize/keywords/KeywordTypeSelector'
import { GoldKeywordPanel } from '@/components/monetize/keywords/GoldKeywordPanel'
import { EventKeywordPanel } from '@/components/monetize/keywords/EventKeywordPanel'
import { SeasonKeywordPanel } from '@/components/monetize/keywords/SeasonKeywordPanel'
import type { KeywordType } from '@/types/monetize'

export default function KeywordsPage() {
  const [activeTab, setActiveTab] = useState<KeywordType>('gold')

  return (
    <FeatureGate featureKey="keyword_explorer" minPlan="pro" featureName="키워드 탐색기">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">키워드 탐색기</h1>
          <p className="text-sm text-gray-500 mt-0.5">수익성 높은 키워드를 발굴하고 달력에 등록하세요.</p>
        </div>
        <KeywordTypeSelector activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'gold' && <GoldKeywordPanel />}
        {activeTab === 'event' && <EventKeywordPanel />}
        {activeTab === 'seasonal' && <SeasonKeywordPanel />}
      </div>
    </FeatureGate>
  )
}
