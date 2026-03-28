import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMonetizePost } from '@/lib/monetize/engines/ai-writer'
import { fetchNaverNewsForUser } from '@/lib/utils/naver-news'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { scheduledPostId } = body

    if (!scheduledPostId) {
      return NextResponse.json({ error: 'scheduledPostId is required' }, { status: 400 })
    }

    // Get scheduled post with keyword and blog info
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .select('*, keywords(keyword, intent_type, keyword_type), blogs(grade, primary_ad_category, language, ai_character_config)')
      .eq('id', scheduledPostId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const postAny = post as any

    // Get user's Claude API key
    const { data: apiKey } = await supabase
      .from('ai_api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('provider', 'claude')
      .eq('is_active', true)
      .single()

    if (!apiKey?.encrypted_key) {
      return NextResponse.json({ error: 'Claude API key not found' }, { status: 400 })
    }

    // Get cluster keywords if available
    let clusterKeywords: string[] = []
    if (postAny.cluster_id) {
      const { data: cluster } = await supabase
        .from('keyword_clusters')
        .select('cluster_keywords')
        .eq('id', postAny.cluster_id)
        .single()
      if (cluster?.cluster_keywords) {
        clusterKeywords = (cluster.cluster_keywords as any[]).map((k: any) => k.keyword)
      }
    }

    // 네이버 뉴스 기사 검색 (키가 있으면 자동으로 활용)
    const keyword = postAny.keywords?.keyword || ''
    const searchKeywords = [keyword, ...clusterKeywords.slice(0, 2)]
    const newsArticles = await fetchNaverNewsForUser(supabase, user.id, searchKeywords)

    const result = await generateMonetizePost({
      scheduledPostId,
      keyword,
      intentType: postAny.keywords?.intent_type || postAny.intent_type || 'INFO',
      blogGrade: postAny.blogs?.grade || 'C',
      adCategory: postAny.blogs?.primary_ad_category || null,
      language: postAny.blogs?.language || 'ko',
      aiApiKey: apiKey.encrypted_key,
      characterConfig: postAny.blogs?.ai_character_config || undefined,
      clusterKeywords,
      newsArticles: newsArticles.length > 0 ? newsArticles : undefined,
    })

    return NextResponse.json({ data: result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
