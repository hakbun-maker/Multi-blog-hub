/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'
import { generateMonetizePost } from '../engines/ai-writer'
import { runQualityCheck } from '../engines/quality-checker'

export interface PublishResult {
  postId: string
  keyword: string
  status: string
  score?: number
  error?: string
}

export async function runAutoPublishPipeline(): Promise<PublishResult[]> {
  const supabase = createClient()
  const results: PublishResult[] = []

  // 1. Get today's pending posts
  const today = new Date().toISOString().split('T')[0]
  const { data: pendingPosts } = await supabase
    .from('scheduled_posts')
    .select(`
      id, blog_id, keyword_id, cluster_id, scheduled_time, intent_type,
      keywords (keyword, keyword_type, intent_type),
      blogs (grade, primary_ad_category, language, ai_character_config, user_id)
    `)
    .eq('scheduled_date', today)
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toTimeString().slice(0, 5))
    .order('scheduled_time', { ascending: true })

  if (!pendingPosts?.length) return results

  for (const post of pendingPosts) {
    const p = post as any
    try {
      // Get user's Claude API key
      const { data: apiKey } = await supabase
        .from('ai_api_keys')
        .select('encrypted_key')
        .eq('user_id', p.blogs?.user_id)
        .eq('provider', 'claude')
        .eq('is_active', true)
        .single()

      if (!apiKey?.encrypted_key) {
        results.push({ postId: p.id, keyword: p.keywords?.keyword || '', status: 'skipped', error: 'No Claude API key' })
        continue
      }

      // Get cluster keywords
      let clusterKeywords: string[] = []
      if (p.cluster_id) {
        const { data: cluster } = await supabase
          .from('keyword_clusters')
          .select('cluster_keywords')
          .eq('id', p.cluster_id)
          .single()
        if (cluster?.cluster_keywords) {
          clusterKeywords = (cluster.cluster_keywords as any[]).map((k: any) => k.keyword)
        }
      }

      // 2. AI Writing (L1→L2→L3)
      const writeResult = await generateMonetizePost({
        scheduledPostId: p.id,
        keyword: p.keywords?.keyword || '',
        intentType: p.keywords?.intent_type || p.intent_type || 'INFO',
        blogGrade: p.blogs?.grade || 'C',
        adCategory: p.blogs?.primary_ad_category || null,
        language: p.blogs?.language || 'ko',
        aiApiKey: apiKey.encrypted_key,
        characterConfig: p.blogs?.ai_character_config || undefined,
        clusterKeywords,
      })

      // 3. Quality Check (A or B based on keyword_type)
      const checkResult = await runQualityCheck({
        postId: p.id,
        content: writeResult.content,
        keyword: p.keywords?.keyword || '',
        keywordType: p.keywords?.keyword_type || 'gold',
        intentType: p.keywords?.intent_type || 'INFO',
        blogGrade: p.blogs?.grade || 'C',
        adCategory: p.blogs?.primary_ad_category || null,
      })

      results.push({
        postId: p.id,
        keyword: p.keywords?.keyword || '',
        status: checkResult.autoPublished ? 'auto_published' : 'review_queue',
        score: checkResult.totalScore,
      })
    } catch (error: any) {
      results.push({
        postId: p.id,
        keyword: p.keywords?.keyword || '',
        status: 'error',
        error: error.message,
      })
    }
  }

  return results
}
