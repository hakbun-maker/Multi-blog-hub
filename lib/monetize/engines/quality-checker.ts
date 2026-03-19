/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CheckType } from '@/types/monetize'
import { createClient } from '@/lib/supabase/server'
import { AUTO_PUBLISH_THRESHOLD } from '../constants'
import { checkStandard, type StandardCheckResult } from './checkers/standard-checker'
import { checkEvent, type EventCheckResult } from './checkers/event-checker'

export interface QualityCheckResult {
  postId: string
  checkType: CheckType
  totalScore: number
  autoPublished: boolean
  reviewReason: string | null
  scoreBreakdown: Record<string, any>
  details: StandardCheckResult | EventCheckResult
}

export async function runQualityCheck(params: {
  postId: string
  content: string
  keyword: string
  keywordType: string
  intentType: string
  blogGrade: string
  adCategory: string | null
}): Promise<QualityCheckResult> {
  // Determine check type based on keyword type
  const checkType: CheckType = params.keywordType === 'event' ? 'event' : 'standard'

  let result: StandardCheckResult | EventCheckResult

  // Run appropriate checker
  if (checkType === 'standard') {
    result = checkStandard({
      content: params.content,
      keyword: params.keyword,
      intentType: params.intentType as any,
      adCategory: params.adCategory,
    })
  } else {
    result = checkEvent({
      content: params.content,
      keyword: params.keyword,
      intentType: params.intentType as any,
      blogGrade: params.blogGrade as any,
    })
  }

  const totalScore = result.totalScore
  const autoPublished = totalScore >= AUTO_PUBLISH_THRESHOLD

  // Build review reason if not auto-published
  let reviewReason: string | null = null
  if (!autoPublished) {
    const weakAreas = result.weakAreas || []
    reviewReason = `점수 ${totalScore}/50 — 미달 항목: ${weakAreas.join(', ')}`
  }

  // Save to database
  const supabase = createClient()
  try {
    await supabase.from('post_quality_scores').upsert(
      {
        post_id: params.postId,
        check_type: checkType,
        discovery_score: 'discoveryScore' in result ? result.discoveryScore : 0,
        persuasion_score: 'persuasionScore' in result ? result.persuasionScore : 0,
        conversion_score: 'conversionScore' in result ? result.conversionScore : 0,
        event_score: 'eventScore' in result ? result.eventScore : 0,
        tech_score: 'techScore' in result ? result.techScore : 0,
        auto_published: autoPublished,
        review_reason: reviewReason,
        score_breakdown: result.breakdown,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'post_id' }
    )

    // Update scheduled post status
    const newStatus = autoPublished ? 'auto_published' : 'review_queue'
    await supabase
      .from('scheduled_posts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', params.postId)
  } catch (error) {
    console.error('Failed to save quality check result:', error)
    // Don't throw, continue with result
  }

  return {
    postId: params.postId,
    checkType,
    totalScore,
    autoPublished,
    reviewReason,
    scoreBreakdown: result.breakdown,
    details: result,
  }
}

export type { StandardCheckResult, EventCheckResult }
