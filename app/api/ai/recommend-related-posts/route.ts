import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { articleTitle, articleContent, h2Text } = await request.json()

  const { data: apiKeys } = await supabase
    .from('ai_api_keys')
    .select('provider, encrypted_key')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('provider', ['claude', 'openai', 'gemini'])
    .limit(1)

  if (!apiKeys?.length) {
    return NextResponse.json({ error: 'AI API 키가 등록되지 않았습니다.' }, { status: 400 })
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug, blog_id, content_html')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!posts?.length) {
    return NextResponse.json({ recommendations: [] })
  }

  const { data: blogs } = await supabase
    .from('blogs')
    .select('id, name, url, custom_domain')
    .eq('user_id', user.id)

  const blogMap = new Map(blogs?.map(b => [b.id, b]) ?? [])

  const postsList = posts.map(p => {
    const blog = blogMap.get(p.blog_id)
    const excerpt = (p.content_html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)
    const blogBaseUrl = (blog?.url || blog?.custom_domain || '').replace(/\/$/, '')
    const postUrl = blogBaseUrl ? `${blogBaseUrl}/${p.slug}` : ''
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      blogName: blog?.name || '알 수 없는 블로그',
      blogId: p.blog_id,
      excerpt,
      postUrl,
    }
  })

  try {
    const row = apiKeys[0]
    const apiKey = decrypt(row.encrypted_key)
    const adapter = await createAIAdapter(row.provider, apiKey)

    const topicContext = h2Text
      ? `소주제(H2): "${h2Text}"`
      : `글 제목: "${articleTitle || ''}"`

    const articleSummary = (articleContent || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)
    const postTitles = postsList.map((p, i) => `${i}: ${p.title}`).join('\n')

    const prompt = `당신은 블로그 SEO 전문가입니다. 현재 작성 중인 블로그 글의 특정 섹션과 관련된 글을 추천해야 합니다.

현재 글 정보:
${topicContext}
${articleSummary ? `본문 요약: ${articleSummary}` : ''}

보유한 글 목록 (인덱스: 제목):
${postTitles}

위 글 목록 중에서 "${h2Text || articleTitle}"과 가장 관련성 높은 글의 인덱스를 최대 6개 선택하세요.
반드시 JSON 배열로만 응답하세요 (예: [0, 2, 5]): `

    const text = await adapter.generateText(prompt)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const arrMatch = cleaned.match(/\[[\d\s,]*\]/)

    let recommendations = postsList.slice(0, 6)
    if (arrMatch) {
      try {
        const indices: number[] = JSON.parse(arrMatch[0])
        const filtered = indices
          .filter(i => typeof i === 'number' && i >= 0 && i < postsList.length)
          .map(i => postsList[i])
        if (filtered.length > 0) recommendations = filtered
      } catch { /* fallback to first 6 */ }
    }

    return NextResponse.json({ recommendations })
  } catch {
    return NextResponse.json({ recommendations: postsList.slice(0, 6) })
  }
}
