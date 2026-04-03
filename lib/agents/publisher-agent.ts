/**
 * Publisher 에이전트 — 완성된 글을 발행하고, 이벤트 후기를 자동 기획합니다.
 * review → published 단계로 전환합니다.
 * 이벤트 D+1 이후: 뉴스 검색 → 후기 글 자동 기획
 */
import { getServiceClient, runAgent } from './agent-runner'
import type { AgentRunResult } from './types'

export async function runPublisherAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'publisher', async () => {
    const supabase = getServiceClient()
    let published = 0
    let reviewPlanned = 0

    // 1. review 단계인 글 발행 처리
    const { data: reviewReady } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', userId)
      .eq('stage', 'review')
      .limit(10)

    for (const kw of reviewReady ?? []) {
      if (!kw.post_id) continue

      try {
        // 포스트 상태를 published로 업데이트
        await supabase
          .from('posts')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', kw.post_id)

        // 파이프라인도 published로
        await supabase
          .from('keyword_pipeline')
          .update({
            stage: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', kw.id)

        published++
      } catch (err) {
        console.error(`[Publisher] Error publishing ${kw.keyword_text}:`, err)
      }
    }

    // 2. 이벤트 후기 자동 기획 (D+1 이후 이벤트 확인)
    const today = new Date()
    const { data: pastEvents } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', userId)
      .eq('keyword_type', 'event')
      .not('event_date', 'is', null)
      .not('event_cluster_id', 'is', null)
      .eq('event_phase', 'preparation') // preparation까지 완료된 이벤트
      .eq('stage', 'published')

    for (const evt of pastEvents ?? []) {
      if (!evt.event_date || !evt.event_cluster_id) continue

      const eventDate = new Date(evt.event_date)
      const daysSinceEvent = Math.floor((today.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))

      // D+1 ~ D+3 사이면 후기 글 기획
      if (daysSinceEvent >= 1 && daysSinceEvent <= 3) {
        // 이미 후기 글이 있는지 확인
        const { data: existingReview } = await supabase
          .from('keyword_pipeline')
          .select('id')
          .eq('event_cluster_id', evt.event_cluster_id)
          .eq('event_phase', 'review')
          .limit(1)

        if (existingReview && existingReview.length > 0) continue

        // 후기 글 자동 기획
        const reviewKeyword = `${evt.event_title} 후기 현장 리뷰`
        const publishDate = new Date(today)
        publishDate.setDate(publishDate.getDate() + 1) // 내일 발행

        await supabase.from('keyword_pipeline').insert({
          user_id: userId,
          keyword_text: reviewKeyword,
          keyword_type: 'event',
          stage: 'scheduled',
          revenue_score: evt.revenue_score ?? 70,
          keyword_grade: evt.keyword_grade ?? 'B',
          intent_type: 'REVIEW',
          assigned_blog_id: evt.assigned_blog_id,
          assigned_blog_name: evt.assigned_blog_name,
          scheduled_date: publishDate.toISOString().split('T')[0],
          scheduled_time: '10:00',
          event_title: evt.event_title,
          event_date: evt.event_date,
          event_d_day: daysSinceEvent,
          event_phase: 'review',
          event_cluster_id: evt.event_cluster_id,
          assigned_at: new Date().toISOString(),
        })

        reviewPlanned++
      }
    }

    return { published, reviewPlanned }
  })
}
