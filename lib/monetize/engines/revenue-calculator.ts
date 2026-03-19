import type { Grade, BlogLanguage } from '@/types/monetize'

export interface RevenueGuideInput {
  targetAmount: number      // 목표 월수익 (원)
  currentBlogCount: number
  primaryCategory: string
  language: BlogLanguage
}

export interface RevenueGuideResult {
  targetAmount: number
  estimatedRevenuePerPost: number
  requiredPostsPerMonth: number
  requiredPostsPerDay: number
  blogComposition: { grade: Grade; count: number; percentage: number }[]
  dailyPublishPlan: { grade: Grade; postsPerDay: number }[]
  estimatedTimeToGoal: string
  tips: string[]
}

// CPC estimates by category (KRW)
const CATEGORY_CPC: Record<string, number> = {
  '금융': 1500, '보험': 1800, '건강': 800, '다이어트': 600,
  '뷰티': 500, '가전': 700, '여행': 400, '교육': 900,
  '부동산': 1200, '자동차': 1000, 'IT': 600, '일반': 300,
}

export function calculateRevenueGuide(input: RevenueGuideInput): RevenueGuideResult {
  const cpc = CATEGORY_CPC[input.primaryCategory] || CATEGORY_CPC['일반']

  // Revenue per post: monthly visitors × CTR 3% × CPC × AdSense share 68%
  const avgMonthlyVisitorsPerPost = 500  // conservative estimate
  const ctr = 0.03
  const adsenseShare = 0.68
  const revenuePerPost = Math.round(avgMonthlyVisitorsPerPost * ctr * cpc * adsenseShare)

  const requiredPostsPerMonth = Math.ceil(input.targetAmount / revenuePerPost)
  const requiredPostsPerDay = Math.round((requiredPostsPerMonth / 30) * 10) / 10

  // Blog composition: S(60%) + A(30%) + B(10%)
  const totalBlogs = Math.max(input.currentBlogCount, Math.ceil(requiredPostsPerDay / 3))
  const blogComposition: { grade: Grade; count: number; percentage: number }[] = [
    { grade: 'S', count: Math.ceil(totalBlogs * 0.6), percentage: 60 },
    { grade: 'A', count: Math.ceil(totalBlogs * 0.3), percentage: 30 },
    { grade: 'B', count: Math.max(1, totalBlogs - Math.ceil(totalBlogs * 0.6) - Math.ceil(totalBlogs * 0.3)), percentage: 10 },
  ]

  // Daily publish plan
  const dailyPublishPlan = blogComposition.map(b => ({
    grade: b.grade,
    postsPerDay: Math.ceil(requiredPostsPerDay * (b.percentage / 100)),
  }))

  // Time estimate
  const monthsToGoal = totalBlogs <= input.currentBlogCount ? 3 : 6
  const estimatedTimeToGoal = `약 ${monthsToGoal}개월`

  const tips = [
    `${input.primaryCategory} 카테고리 평균 CPC: ₩${cpc.toLocaleString()}`,
    `S등급 블로그를 ${blogComposition[0].count}개 이상 운영하는 것이 핵심입니다`,
    `일 ${Math.ceil(requiredPostsPerDay)}편 발행으로 월 ${input.targetAmount.toLocaleString()}원 달성 가능`,
    `Growth 플랜의 자동 발행 파이프라인 활용을 추천합니다`,
  ]

  return {
    targetAmount: input.targetAmount,
    estimatedRevenuePerPost: revenuePerPost,
    requiredPostsPerMonth,
    requiredPostsPerDay,
    blogComposition,
    dailyPublishPlan,
    estimatedTimeToGoal,
    tips,
  }
}
