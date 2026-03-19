'use client'

import { FeatureGate } from '@/components/plan/FeatureGate'
import { RocketStatusCard } from '@/components/monetize/dashboard/RocketStatusCard'
import { RevenueSummaryCard } from '@/components/monetize/dashboard/RevenueSummaryCard'
import { BlogGradeTable } from '@/components/monetize/dashboard/BlogGradeTable'
import { RevenueLineChart } from '@/components/monetize/dashboard/RevenueLineChart'

export default function MonetizePage() {
  return (
    <FeatureGate featureKey="revenue_dashboard" minPlan="pro" featureName="수익화 대시보드">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">수익화 대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">파이프라인 현황과 수익 분석을 한눈에 확인합니다.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <RocketStatusCard />
          <RevenueSummaryCard />
        </div>
        <RevenueLineChart />
        <BlogGradeTable />
      </div>
    </FeatureGate>
  )
}
