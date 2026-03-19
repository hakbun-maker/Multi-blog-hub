'use client'

import { FeatureGate } from '@/components/plan/FeatureGate'
import { SchedulerCalendar } from '@/components/monetize/scheduler/SchedulerCalendar'
import { DistributionEnginePanel } from '@/components/monetize/scheduler/DistributionEnginePanel'

export default function SchedulerPage() {
  return (
    <FeatureGate featureKey="scheduler" minPlan="pro" featureName="스케줄러">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">스케줄러</h1>
          <p className="text-sm text-gray-500 mt-0.5">키워드를 블로그별 날짜에 배분하고 발행 일정을 관리합니다.</p>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <SchedulerCalendar />
          </div>
          <div className="col-span-1">
            <DistributionEnginePanel />
          </div>
        </div>
      </div>
    </FeatureGate>
  )
}
