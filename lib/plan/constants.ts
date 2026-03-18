import type { PlanId, FeatureKey, UpsellTrigger } from '@/types/plan'

export const PLAN_ORDER: Record<PlanId, number> = {
  lite: 0,
  basic: 1,
  pro: 2,
  growth: 3,
  scale: 4,
}

export const PLAN_LABELS: Record<PlanId, string> = {
  lite: '무료',
  basic: 'Basic',
  pro: 'Pro',
  growth: 'Growth',
  scale: 'Scale',
}

export const SIDEBAR_FEATURE_MAP: Record<string, { featureKey: FeatureKey; minPlan: PlanId }> = {
  '/keywords': { featureKey: 'keyword_explorer', minPlan: 'pro' },
  '/scheduler': { featureKey: 'scheduler', minPlan: 'pro' },
  '/monetize': { featureKey: 'revenue_dashboard', minPlan: 'pro' },
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  general_writing: '일반 글쓰기',
  writing_limit_monthly: '월간 글쓰기 한도',
  full_editor: '에디터 전체 기능',
  revenue_dashboard: '수익 대시보드',
  keyword_explorer: '키워드 탐색기',
  scheduler: '스케줄러',
  auto_writing_pipeline: '자동 글쓰기 파이프라인',
  auto_publish: '자동 발행',
  coupang_affiliate: '쿠팡파트너스 연동',
  sns_auto_deploy: 'SNS 자동배포',
  multilingual: '다국어 설정',
  revenue_guide_panel: '수익화 가이드 패널',
  team_accounts: '팀 계정',
  priority_support: '우선 고객지원',
}

export const UPSELL_TRIGGERS: UpsellTrigger[] = [
  {
    currentPlan: 'lite',
    triggerType: 'writing_limit_reached',
    targetPlan: 'basic',
    message: '이번 달 글쓰기 한도(20건)에 도달했어요. Basic으로 업그레이드하면 무제한으로 쓸 수 있어요.',
  },
  {
    currentPlan: 'lite',
    triggerType: 'blog_limit_reached',
    targetPlan: 'basic',
    message: '블로그를 더 연결하려면 Basic 이상이 필요해요.',
  },
  {
    currentPlan: 'basic',
    triggerType: 'monetize_clicked',
    targetPlan: 'pro',
    message: '수익화 로켓은 Pro부터 사용할 수 있어요. 키워드 탐색부터 시작해볼까요?',
  },
  {
    currentPlan: 'pro',
    triggerType: 'auto_writing_clicked',
    targetPlan: 'growth',
    message: '자동 글쓰기 파이프라인은 Growth부터 사용할 수 있어요.',
  },
  {
    currentPlan: 'pro',
    triggerType: 'blog_limit_reached',
    targetPlan: 'growth',
    message: '블로그를 30개까지 늘리려면 Growth로 업그레이드하세요.',
  },
  {
    currentPlan: 'growth',
    triggerType: 'blog_limit_warning',
    targetPlan: 'scale',
    message: '블로그가 30개에 가까워졌어요. Scale에서 최대 100개까지 운영할 수 있어요.',
  },
]
