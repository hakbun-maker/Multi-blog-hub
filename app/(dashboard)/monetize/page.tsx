'use client'

import { useEffect, useState } from 'react'
import { FeatureGate } from '@/components/plan/FeatureGate'
import { ConsentGate } from '@/components/consent/ConsentGate'
import { MonetizeSubNav } from '@/components/monetize/MonetizeSubNav'
import { RocketStatusCard } from '@/components/monetize/dashboard/RocketStatusCard'
import { RevenueSummaryCard } from '@/components/monetize/dashboard/RevenueSummaryCard'
import { BlogGradeTable } from '@/components/monetize/dashboard/BlogGradeTable'
import { RevenueLineChart } from '@/components/monetize/dashboard/RevenueLineChart'
import { RevenueGuidePanel } from '@/components/monetize/dashboard/RevenueGuidePanel'

type BlogLanguage = 'ko' | 'en' | 'ja' | 'de' | 'pt_br' | 'es'

export default function MonetizePage() {
  const [blogInfo, setBlogInfo] = useState<{ count: number; language: BlogLanguage; primaryCategory: string }>({
    count: 0, language: 'ko', primaryCategory: 'lifestyle',
  })

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const res = await fetch('/api/blogs')
        const json = await res.json()
        const blogs = json.data ?? []
        const primary = blogs[0]
        setBlogInfo({
          count: blogs.length,
          language: primary?.language ?? 'ko',
          primaryCategory: primary?.blog_type ?? 'lifestyle',
        })
      } catch { /* ignore */ }
    }
    fetchBlogs()
  }, [])

  return (
    <>
    <MonetizeSubNav />
    <FeatureGate featureKey="revenue_dashboard" minPlan="pro" featureName="수익화 대시보드">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">수익화 대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">파이프라인 현황과 수익 분석을 한눈에 확인합니다.</p>
        </div>
        <ConsentGate consentType="automation" ui="modal">
        <div className="grid grid-cols-2 gap-4">
          <RocketStatusCard />
          <RevenueSummaryCard />
        </div>
        </ConsentGate>
        <RevenueLineChart />
        <BlogGradeTable />
        <RevenueGuidePanel
          blogCount={blogInfo.count}
          language={blogInfo.language}
          primaryCategory={blogInfo.primaryCategory}
        />
      </div>
    </FeatureGate>
    </>
  )
}
