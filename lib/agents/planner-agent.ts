/**
 * Planner 에이전트 — 분석된 키워드를 블로그에 배정하고 스케줄을 결정합니다.
 * scored → assigned → scheduled 단계로 전환합니다.
 * 이벤트 키워드는 D-Day 기반 타임라인으로 기획합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { INTENT_BLOG_FIT } from '@/lib/monetize/constants'
import type { AgentRunResult, EventPhase } from './types'
import type { Grade, IntentType } from '@/types/monetize'

/** 이벤트 Phase별 설정 */
const EVENT_PHASE_CONFIG: Record<string, { dDayOffset: number; intentType: IntentType; suffix: string }[]> = {
  concert: [
    { dDayOffset: -30, intentType: 'INFO', suffix: '정보 총정리' },
    { dDayOffset: -14, intentType: 'COMPARE', suffix: '좌석 추천 가격 비교' },
    { dDayOffset: -7, intentType: 'AD', suffix: '준비물 주변 맛집' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기 현장 리뷰' },
  ],
  sports: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '경기 일정 정보' },
    { dDayOffset: -1, intentType: 'COMPARE', suffix: '승부 예측 분석' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '경기 결과 하이라이트' },
  ],
  festival: [
    { dDayOffset: -21, intentType: 'INFO', suffix: '일정 프로그램 안내' },
    { dDayOffset: -7, intentType: 'AD', suffix: '입장권 교통편 준비' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '축제 후기 현장' },
  ],
  exhibition: [
    { dDayOffset: -14, intentType: 'INFO', suffix: '전시 정보 관람 포인트' },
    { dDayOffset: -3, intentType: 'AD', suffix: '티켓 예매 할인' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '관람 후기' },
  ],
  other: [
    { dDayOffset: -7, intentType: 'INFO', suffix: '정보' },
    { dDayOffset: 1, intentType: 'REVIEW', suffix: '후기' },
  ],
}

export async function runPlannerAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'planner', async () => {
    const supabase = getServiceClient()
    let assigned = 0
    let eventPlanned = 0

    // 1. scored 단계 키워드 가져오기
    const { data: scoredKeywords } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', userId)
      .eq('stage', 'scored')
      .order('revenue_score', { ascending: false })
      .limit(50)

    if (!scoredKeywords || scoredKeywords.length === 0) return { assigned: 0, eventPlanned: 0 }

    // 2. 사용자 블로그 목록
    const { data: blogs } = await supabase
      .from('blogs')
      .select('id, name, grade, primary_ad_category')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!blogs || blogs.length === 0) return { assigned: 0, eventPlanned: 0, error: 'no_active_blogs' }

    // 3. 각 키워드를 최적 블로그에 배정
    let nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 1) // 내일부터
    let timeSlot = 9 // 09:00부터 시작

    for (const kw of scoredKeywords) {
      // 이벤트 키워드: D-Day 기반 클러스터 기획
      if (kw.keyword_type === 'event' && kw.event_title && kw.event_date) {
        const clusterId = `evt_${kw.event_title.replace(/\s+/g, '_').slice(0, 30)}_${kw.event_date}`

        // 이미 이 이벤트의 클러스터가 있는지 확인
        const { data: existingCluster } = await supabase
          .from('keyword_pipeline')
          .select('id')
          .eq('user_id', userId)
          .eq('event_cluster_id', clusterId)
          .limit(1)

        if (existingCluster && existingCluster.length > 0) {
          // 이미 기획된 이벤트: 이 키워드만 배정
          const blog = pickBestBlog(blogs, kw.intent_type, kw.keyword_grade)
          await assignKeyword(supabase, kw, blog, nextDate, timeSlot)
          assigned++
          timeSlot = advanceTimeSlot(timeSlot)
          if (timeSlot > 17) { timeSlot = 9; nextDate.setDate(nextDate.getDate() + 1) }
          continue
        }

        // 새 이벤트: Phase별 키워드 클러스터 생성
        const eventDate = new Date(kw.event_date)
        const category = inferEventCategory(kw.event_title)
        const phases = EVENT_PHASE_CONFIG[category] ?? EVENT_PHASE_CONFIG.other

        for (const phase of phases) {
          const publishDate = new Date(eventDate)
          publishDate.setDate(publishDate.getDate() + phase.dDayOffset)

          // 과거 날짜면 건너뛰기 (D+1 후기는 이벤트 이후에만)
          if (publishDate < new Date() && phase.dDayOffset < 0) continue

          const phaseKeyword = `${kw.event_title} ${phase.suffix}`
          const phaseName = phase.dDayOffset <= -14 ? 'pre_info'
            : phase.dDayOffset <= -3 ? 'comparison'
            : phase.dDayOffset <= 0 ? 'preparation'
            : 'review'

          const blog = pickBestBlog(blogs, phase.intentType, kw.keyword_grade ?? 'C')

          // 클러스터 키워드 추가
          await supabase.from('keyword_pipeline').insert({
            user_id: userId,
            keyword_text: phaseKeyword,
            keyword_type: 'event',
            stage: 'scheduled',
            revenue_score: kw.revenue_score ?? 0,
            keyword_grade: kw.keyword_grade ?? 'C',
            intent_type: phase.intentType,
            assigned_blog_id: blog.id,
            assigned_blog_name: blog.name,
            scheduled_date: publishDate.toISOString().split('T')[0],
            scheduled_time: `${String(9 + (phases.indexOf(phase) % 8)).padStart(2, '0')}:00`,
            event_title: kw.event_title,
            event_date: kw.event_date,
            event_d_day: phase.dDayOffset,
            event_phase: phaseName,
            event_cluster_id: clusterId,
            assigned_at: new Date().toISOString(),
          })
          eventPlanned++
        }

        // 원본 이벤트 키워드도 배정 완료 처리
        await supabase
          .from('keyword_pipeline')
          .update({
            stage: 'assigned',
            event_cluster_id: clusterId,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', kw.id)

        assigned++
        continue
      }

      // 일반 키워드: 블로그 배정 + 스케줄
      const blog = pickBestBlog(blogs, kw.intent_type, kw.keyword_grade)
      await assignKeyword(supabase, kw, blog, nextDate, timeSlot)
      assigned++

      timeSlot = advanceTimeSlot(timeSlot)
      if (timeSlot > 17) { timeSlot = 9; nextDate.setDate(nextDate.getDate() + 1) }
    }

    return { assigned, eventPlanned }
  })
}

/** Intent와 Grade 기반 최적 블로그 선택 */
function pickBestBlog(
  blogs: Array<{ id: string; name: string; grade: string | null; primary_ad_category: string | null }>,
  intentType: string | null,
  keywordGrade: string | null
): { id: string; name: string } {
  if (blogs.length === 1) return blogs[0]

  // Intent-Grade 적합도 매트릭스 활용
  let bestBlog = blogs[0]
  let bestScore = 0

  for (const blog of blogs) {
    const blogGrade = (blog.grade ?? 'C') as Grade
    const intent = (intentType ?? 'INFO') as IntentType
    const fitMatrix = INTENT_BLOG_FIT[intent]
    const fitScore = fitMatrix?.[blogGrade] ?? 1
    if (fitScore > bestScore) {
      bestScore = fitScore
      bestBlog = blog
    }
  }

  return bestBlog
}

/** 키워드를 블로그에 배정하고 스케줄 설정 */
async function assignKeyword(
  supabase: ReturnType<typeof getServiceClient>,
  keyword: { id: string },
  blog: { id: string; name: string },
  date: Date,
  timeSlot: number
) {
  const scheduledDate = date.toISOString().split('T')[0]
  const scheduledTime = `${String(timeSlot).padStart(2, '0')}:00`

  await supabase
    .from('keyword_pipeline')
    .update({
      stage: 'scheduled',
      assigned_blog_id: blog.id,
      assigned_blog_name: blog.name,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      assigned_at: new Date().toISOString(),
    })
    .eq('id', keyword.id)
}

function advanceTimeSlot(current: number): number {
  return current + 1 + Math.floor(Math.random() * 2) // 1~2시간 간격
}

function inferEventCategory(title: string): string {
  if (/콘서트|공연|뮤지컬|팬미팅|가수|아이돌/.test(title)) return 'concert'
  if (/야구|축구|농구|KBO|K리그|경기/.test(title)) return 'sports'
  if (/축제|페스티벌|festival/.test(title)) return 'festival'
  if (/전시|박람회|미술/.test(title)) return 'exhibition'
  return 'other'
}
