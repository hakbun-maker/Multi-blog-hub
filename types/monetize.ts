// 수익화 로켓 공통 타입 정의

// 블로그 등급
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'

// Intent 유형 (6가지)
export type IntentType = 'AD' | 'REVIEW' | 'INFO' | 'CRITIC' | 'COMPARE' | 'TREND'

// 키워드 유형
export type KeywordType = 'gold' | 'event' | 'seasonal'

// 파이프라인 상태
export type PipelineStatus = 'pending' | 'writing' | 'reviewing' | 'review_queue' | 'auto_published' | 'published' | 'rejected'

// 글쓰기 모드
export type WritingMode = 'auto' | 'manual'

// 검수 유형
export type CheckType = 'standard' | 'event'

// 블로그 언어
export type BlogLanguage = 'ko' | 'en' | 'ja' | 'de' | 'pt_br' | 'es'

// Revenue Score 결과
export interface RevenueScore {
  traffic: number    // 25%
  revenue: number    // 40%
  difficulty: number // 25%
  trend: number      // 10%
  total: number
  grade: Grade
}

// 키워드
export interface Keyword {
  id: string
  userId: string
  keyword: string
  keywordType: KeywordType
  intentType: IntentType | null
  revenueScore: number
  keywordGrade: Grade
  monthlySearchVolume: number
  cpcEstimate: number
  competitionScore: number
  trendIndex: number
  isSeasonal: boolean
  seasonalMonths: number[] | null
  expiresAt: string | null
  createdAt: string
}

// 키워드 클러스터
export interface KeywordCluster {
  id: string
  userId: string
  seedKeywordId: string
  clusterKeywords: { keyword: string; intentType: IntentType }[]
  clusterStrategy: string | null
  intentWeights: Record<IntentType, number>
  createdAt: string
}

// 스케줄된 포스트
export interface ScheduledPost {
  id: string
  blogId: string
  keywordId: string | null
  clusterId: string | null
  scheduledDate: string
  scheduledTime: string
  status: PipelineStatus
  writingMode: WritingMode
  contentDraft: string | null
  platformPostId: string | null
  publishedAt: string | null
  intentType: IntentType | null
  intentFitScore: number
  createdAt: string
}

// 품질 검수 점수
export interface PostQualityScore {
  id: string
  postId: string
  checkType: CheckType
  discoveryScore: number
  persuasionScore: number
  conversionScore: number
  eventScore: number
  techScore: number
  totalScore: number
  autoPublished: boolean
  reviewReason: string | null
  scoreBreakdown: Record<string, any>
  createdAt: string
}

// 수익 분석
export interface RevenueAnalytics {
  id: string
  blogId: string
  analyticsDate: string
  estimatedRevenue: number
  actualRevenue: number
  adCategory: string | null
  language: BlogLanguage
  blogType: string | null
  pageViews: number
  ctr: number
  rpm: number
}

// 블로그 키워드 배정
export interface BlogKeywordAssignment {
  id: string
  blogId: string
  keywordId: string
  assignedDate: string
  assignedTime: string
  assignmentReason: string | null
  isConfirmed: boolean
  intentType: IntentType | null
  intentFitScore: number
}

// 대시보드 통합 데이터
export interface DashboardData {
  pipelineStatus: {
    pending: number
    writing: number
    reviewing: number
    published: number
  }
  revenueSummary: {
    thisMonth: number
    lastMonth: number
    estimated: number
    changeRate: number
  }
  blogGrades: {
    blogId: string
    blogName: string
    grade: Grade
    monthlyRevenue: number
    postCount: number
    rpm: number
  }[]
}

// 배분 프리뷰 항목
export interface DistributionPreviewItem {
  keywordId: string
  keyword: string
  keywordGrade: Grade
  intentType: IntentType
  blogId: string
  blogName: string
  blogGrade: Grade
  scheduledDate: string
  scheduledTime: string
  intentFitScore: number
  reason: string
}

// 블로그 설정
export interface BlogSettings {
  id: string
  blogId: string
  snsSettings: {
    instagram?: { enabled: boolean; accessToken?: string }
    twitter?: { enabled: boolean; accessToken?: string }
    threads?: { enabled: boolean; accessToken?: string }
  }
  affiliateConfig: {
    autoInsert: boolean
    maxProductsPerPost: number
    provider: 'coupang' | 'amazon' | 'both'
    intentSettings?: Record<IntentType, boolean>
  }
  languageSettings: {
    writeStyle?: string
  }
  coupangSettings: Record<string, any>
}

// PASONA 구조
export type PasonaSection = 'P' | 'A' | 'S' | 'O' | 'N' | 'A2'

export interface PasonaWeights {
  P: number  // Problem
  A: number  // Agitation/Affinity
  S: number  // Solution
  O: number  // Offer
  N: number  // Narrowing
  A2: number // Action
}
