import type { Grade, BlogLanguage } from '@/types/monetize'

export interface RevenueGuideInput {
  targetAmount: number      // 목표 월수익 (원)
  currentBlogCount: number
  primaryCategory: string
  language: BlogLanguage
}

export interface BlogPortfolioItem {
  grade: Grade
  count: number
  recommendedTypes: string[]
  avgCpc: number
  monthlyVisitorsPerPost: number
  postsPerBlogPerDay: number
  revenuePerPost: number
  monthlyRevenue: number
  description: string
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
  portfolio: BlogPortfolioItem[]
  totalMonthlyRevenue: number
  monthlyCostEstimate: number
  netRevenue: number
}

// ─── 등급별 블로그 프로필 ───
// S등급: 고CPC 전문 카테고리, SEO 최적화된 블로그. 월 방문자 높음.
// A등급: 중상위 CPC, 검색 노출 안정적인 블로그.
// B등급: 범용 카테고리, 신규 또는 성장 중인 블로그.

interface GradeProfile {
  avgCpc: number                  // 평균 클릭당 수익 (원)
  monthlyVisitorsPerPost: number  // 게시물 1개당 월 방문자 (6개월 숙성 기준)
  ctr: number                     // 클릭률
  postsPerBlogPerDay: number      // 블로그 1개당 일일 발행량 (현실적 상한)
  recommendedTypes: string[]      // 추천 블로그 유형
  description: string             // 이 등급 설명
}

const GRADE_PROFILES: Record<'S' | 'A' | 'B', GradeProfile> = {
  S: {
    avgCpc: 1200,
    monthlyVisitorsPerPost: 1500,
    ctr: 0.04,
    postsPerBlogPerDay: 2,
    recommendedTypes: ['금융/재테크', '보험/대출', '부동산', '법률', '의료/건강'],
    description: '고CPC 전문 카테고리 블로그. YMYL 분야에서 전문성 있는 콘텐츠로 높은 광고 단가를 확보합니다. 하루 2편 발행, 품질 중심 운영.',
  },
  A: {
    avgCpc: 700,
    monthlyVisitorsPerPost: 800,
    ctr: 0.035,
    postsPerBlogPerDay: 3,
    recommendedTypes: ['IT/테크', '교육', '자동차', '가전/리뷰', '비즈니스'],
    description: '중상위 CPC 카테고리. 리뷰·비교 콘텐츠로 안정적인 검색 유입을 확보합니다. 하루 3편 발행.',
  },
  B: {
    avgCpc: 350,
    monthlyVisitorsPerPost: 500,
    ctr: 0.03,
    postsPerBlogPerDay: 3,
    recommendedTypes: ['여행', '맛집', '라이프스타일', '뷰티/패션', '육아'],
    description: '범용 카테고리. 검색량이 높아 트래픽 확보가 용이하지만 CPC는 낮습니다. 볼륨 전략으로 보완.',
  },
}

const ADSENSE_SHARE = 0.68

// 게시물 1개당 월 예상 수익
function revenuePerPost(profile: GradeProfile): number {
  return Math.round(profile.monthlyVisitorsPerPost * profile.ctr * profile.avgCpc * ADSENSE_SHARE)
}

// 월 AI API 비용 추정 (게시물 1편당 약 ₩150~200)
const API_COST_PER_POST = 180

export function calculateRevenueGuide(input: RevenueGuideInput): RevenueGuideResult {
  const target = input.targetAmount

  // ─── 포트폴리오 역산: S/A/B 블로그 조합으로 목표 달성 ───
  // 기본 구성: S 2개 + A 2개 + B 1개 (총 5개 블로그)에서 시작
  // 수익이 부족하면 블로그 수를 늘림

  const rppS = revenuePerPost(GRADE_PROFILES.S)
  const rppA = revenuePerPost(GRADE_PROFILES.A)
  const rppB = revenuePerPost(GRADE_PROFILES.B)

  // 블로그 1개당 월 게시물 수 (일 발행량 × 30일)
  const monthlyPostsS = GRADE_PROFILES.S.postsPerBlogPerDay * 30
  const monthlyPostsA = GRADE_PROFILES.A.postsPerBlogPerDay * 30
  const monthlyPostsB = GRADE_PROFILES.B.postsPerBlogPerDay * 30

  // 블로그 1개당 월 수익
  const monthlyPerBlogS = rppS * monthlyPostsS
  const monthlyPerBlogA = rppA * monthlyPostsA
  const monthlyPerBlogB = rppB * monthlyPostsB

  // 0에서 시작하여 목표 달성까지 스케일업
  let sCount = 0
  let aCount = 0
  let bCount = 0

  const calcTotal = (s: number, a: number, b: number) =>
    s * monthlyPerBlogS + a * monthlyPerBlogA + b * monthlyPerBlogB

  // 소액 목표: B등급(입문 친화적)부터 추가
  while (calcTotal(sCount, aCount, bCount) < target && bCount < 3) {
    bCount++
  }
  // A등급 추가
  while (calcTotal(sCount, aCount, bCount) < target && aCount < 4) {
    aCount++
  }
  // S등급 추가 (고CPC, 전문성 필요)
  while (calcTotal(sCount, aCount, bCount) < target && sCount < 5) {
    sCount++
  }
  // 그래도 부족하면 골고루 추가
  while (calcTotal(sCount, aCount, bCount) < target && (sCount + aCount + bCount) < 15) {
    if (sCount <= aCount) sCount++
    else if (aCount <= bCount) aCount++
    else sCount++
  }

  // 최소 1개 블로그 보장
  if (sCount + aCount + bCount === 0) bCount = 1

  const totalBlogs = sCount + aCount + bCount
  const totalMonthlyRevenue = calcTotal(sCount, aCount, bCount)

  const totalPostsPerMonth = sCount * monthlyPostsS + aCount * monthlyPostsA + bCount * monthlyPostsB
  const totalPostsPerDay = sCount * GRADE_PROFILES.S.postsPerBlogPerDay
    + aCount * GRADE_PROFILES.A.postsPerBlogPerDay
    + bCount * GRADE_PROFILES.B.postsPerBlogPerDay

  const monthlyCost = totalPostsPerMonth * API_COST_PER_POST
  const netRevenue = totalMonthlyRevenue - monthlyCost

  // 가중 평균 게시물당 수익
  const avgRevenuePerPost = Math.round(totalMonthlyRevenue / totalPostsPerMonth)

  // 포트폴리오 상세
  const portfolio: BlogPortfolioItem[] = []
  if (sCount > 0) {
    portfolio.push({
      grade: 'S',
      count: sCount,
      recommendedTypes: GRADE_PROFILES.S.recommendedTypes,
      avgCpc: GRADE_PROFILES.S.avgCpc,
      monthlyVisitorsPerPost: GRADE_PROFILES.S.monthlyVisitorsPerPost,
      postsPerBlogPerDay: GRADE_PROFILES.S.postsPerBlogPerDay,
      revenuePerPost: rppS,
      monthlyRevenue: sCount * monthlyPerBlogS,
      description: GRADE_PROFILES.S.description,
    })
  }
  if (aCount > 0) {
    portfolio.push({
      grade: 'A',
      count: aCount,
      recommendedTypes: GRADE_PROFILES.A.recommendedTypes,
      avgCpc: GRADE_PROFILES.A.avgCpc,
      monthlyVisitorsPerPost: GRADE_PROFILES.A.monthlyVisitorsPerPost,
      postsPerBlogPerDay: GRADE_PROFILES.A.postsPerBlogPerDay,
      revenuePerPost: rppA,
      monthlyRevenue: aCount * monthlyPerBlogA,
      description: GRADE_PROFILES.A.description,
    })
  }
  if (bCount > 0) {
    portfolio.push({
      grade: 'B',
      count: bCount,
      recommendedTypes: GRADE_PROFILES.B.recommendedTypes,
      avgCpc: GRADE_PROFILES.B.avgCpc,
      monthlyVisitorsPerPost: GRADE_PROFILES.B.monthlyVisitorsPerPost,
      postsPerBlogPerDay: GRADE_PROFILES.B.postsPerBlogPerDay,
      revenuePerPost: rppB,
      monthlyRevenue: bCount * monthlyPerBlogB,
      description: GRADE_PROFILES.B.description,
    })
  }

  const blogComposition = portfolio.map(p => ({
    grade: p.grade,
    count: p.count,
    percentage: Math.round((p.count / totalBlogs) * 100),
  }))

  const dailyPublishPlan = portfolio.map(p => ({
    grade: p.grade,
    postsPerDay: p.count * p.postsPerBlogPerDay,
  }))

  // 달성 기간: 6개월 숙성 기간 + 현재 블로그 수 고려
  const existingBlogRatio = Math.min(input.currentBlogCount / totalBlogs, 1)
  const monthsToGoal = Math.max(3, Math.round(6 - existingBlogRatio * 3))
  const estimatedTimeToGoal = `약 ${monthsToGoal}개월 (게시물 숙성 기간 포함)`

  // 구체적인 전략 팁
  const tips: string[] = []

  tips.push(
    `S등급 블로그 ${sCount}개가 전체 수익의 ${Math.round((sCount * monthlyPerBlogS / totalMonthlyRevenue) * 100)}%를 담당합니다. 고CPC 카테고리(${GRADE_PROFILES.S.recommendedTypes.slice(0, 3).join(', ')}) 중심으로 운영하세요.`
  )

  if (aCount > 0) {
    tips.push(
      `A등급 블로그는 ${GRADE_PROFILES.A.recommendedTypes.slice(0, 3).join(', ')} 같은 리뷰/비교 콘텐츠에 적합합니다. 상품 리뷰, 서비스 비교 글이 CPC가 높습니다.`
    )
  }

  tips.push(
    `총 ${totalPostsPerDay}편/일 발행 (블로그당 2~3편). AI 자동 발행 파이프라인을 활용하면 운영 부담을 줄일 수 있습니다.`
  )

  tips.push(
    `예상 월 API 비용: ₩${monthlyCost.toLocaleString()} (편당 약 ₩${API_COST_PER_POST}). 순수익 ₩${netRevenue.toLocaleString()}/월.`
  )

  tips.push(
    `게시물은 발행 후 3~6개월에 걸쳐 검색 노출이 안정됩니다. 초기 3개월은 수익보다 콘텐츠 축적에 집중하세요.`
  )

  if (input.currentBlogCount < totalBlogs) {
    tips.push(
      `현재 ${input.currentBlogCount}개 블로그 운영 중입니다. 목표 달성을 위해 ${totalBlogs - input.currentBlogCount}개 블로그를 추가 개설하는 것을 권장합니다.`
    )
  }

  return {
    targetAmount: target,
    estimatedRevenuePerPost: avgRevenuePerPost,
    requiredPostsPerMonth: totalPostsPerMonth,
    requiredPostsPerDay: totalPostsPerDay,
    blogComposition,
    dailyPublishPlan,
    estimatedTimeToGoal,
    tips,
    portfolio,
    totalMonthlyRevenue,
    monthlyCostEstimate: monthlyCost,
    netRevenue,
  }
}
