import type { IntentType, Grade, BlogLanguage, PipelineStatus } from '@/types/monetize'
import { createClient } from '@/lib/supabase/server'
import { buildPasonaPrompt, buildSEOPrompt, buildAdSectionPrompt, buildMetaPrompt, type WritingContext } from './prompt-builder'

export interface WriteResult {
  postId: string
  content: string
  htmlContent: string
  meta: {
    title: string
    description: string
    tags: string[]
  }
  status: PipelineStatus
}

/**
 * 4-Layer AI Writing Engine
 * L1: PASONA × Intent → L2: SEO + AEO → L3: Ad section post-processing
 */
export async function generateMonetizePost(params: {
  scheduledPostId: string
  keyword: string
  intentType: IntentType
  blogGrade: Grade
  adCategory: string | null
  language: BlogLanguage
  aiApiKey: string
  aiModel?: string
  characterConfig?: { name?: string; tone?: string; style?: string; persona?: string }
  clusterKeywords?: string[]
  newsArticles?: { title: string; description: string }[]
}): Promise<WriteResult> {
  const supabase = createClient()
  const model = params.aiModel || (params.blogGrade === 'S' ? 'claude-opus-4-6' : 'claude-sonnet-4-20250514')

  const ctx: WritingContext = {
    keyword: params.keyword,
    intentType: params.intentType,
    blogGrade: params.blogGrade,
    adCategory: params.adCategory,
    language: params.language,
    characterConfig: params.characterConfig,
    clusterKeywords: params.clusterKeywords,
    newsArticles: params.newsArticles,
  }

  // Update status to writing
  await supabase
    .from('scheduled_posts')
    .update({ status: 'writing', updated_at: new Date().toISOString() })
    .eq('id', params.scheduledPostId)

  try {
    // L1: PASONA body generation
    const pasonaPrompt = buildPasonaPrompt(ctx)
    const draft = await callClaude(params.aiApiKey, model, pasonaPrompt)

    // L2: SEO + AEO optimization
    const seoPrompt = buildSEOPrompt(ctx, draft)
    const optimizedDraft = await callClaude(params.aiApiKey, model, seoPrompt)

    // L3: Ad section post-processing
    const adPrompt = buildAdSectionPrompt(ctx, optimizedDraft)
    const finalContent = await callClaude(params.aiApiKey, model, adPrompt)

    // Generate metadata
    const metaPrompt = buildMetaPrompt(ctx)
    const metaRaw = await callClaude(params.aiApiKey, 'claude-sonnet-4-20250514', metaPrompt)
    const meta = parseMetaResponse(metaRaw, params.keyword)

    // Save draft
    await supabase
      .from('scheduled_posts')
      .update({
        content_draft: finalContent,
        status: 'reviewing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.scheduledPostId)

    return {
      postId: params.scheduledPostId,
      content: finalContent,
      htmlContent: markdownToBasicHtml(finalContent),
      meta,
      status: 'reviewing',
    }
  } catch (error: any) {
    // On failure, set back to pending
    await supabase
      .from('scheduled_posts')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', params.scheduledPostId)

    throw error
  }
}

async function callClaude(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(`Claude API error: ${res.status} - ${errorData.error?.message || 'Unknown'}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

function parseMetaResponse(raw: string, fallbackKeyword: string): { title: string; description: string; tags: string[] } {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title: parsed.title || fallbackKeyword,
        description: parsed.description || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      }
    }
  } catch {}
  return { title: fallbackKeyword, description: '', tags: [] }
}

function markdownToBasicHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}
