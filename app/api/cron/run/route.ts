import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAIAdapter, createImageAdapter } from '@/lib/ai/adapter'
import { decrypt } from '@/lib/utils/encryption'
import { uploadImageFromBase64 } from '@/lib/storage/uploadImage'

export async function POST(request: Request) {
  // Vercel Cron 인증
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const supabase = createClient()
  const now = new Date().toISOString()

  // next_run_at <= now인 활성 작업 조회
  const { data: jobs } = await supabase
    .from('scheduler_jobs')
    .select('*')
    .eq('status', 'active')
    .lte('next_run_at', now)

  if (!jobs?.length) return NextResponse.json({ message: '실행할 작업 없음', count: 0 })

  const results = await Promise.allSettled(jobs.map(job => runJob(supabase, job)))

  return NextResponse.json({
    executed: jobs.length,
    results: results.map((r, i) => ({
      jobId: jobs[i].id,
      status: r.status === 'fulfilled' ? 'success' : 'failed',
    })),
  })
}

async function runJob(supabase: ReturnType<typeof createClient>, job: Record<string, unknown>) {
  const userId = job.user_id as string
  const blogIds = job.blog_ids as string[]
  const postsPerRun = (job.posts_per_run as number) ?? 1

  // 로그 시작
  const { data: log } = await supabase
    .from('scheduler_logs')
    .insert({ job_id: job.id, user_id: userId, status: 'running' })
    .select().single()

  try {
    // 키워드 풀에서 pending 키워드 가져오기
    const { data: keywords } = await supabase
      .from('keyword_pool')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(postsPerRun)

    if (!keywords?.length) throw new Error('사용 가능한 키워드가 없습니다.')

    // 블로그 + AI 키 조회
    const [{ data: blogs }, { data: apiKeys }] = await Promise.all([
      supabase.from('blogs').select('id, name, ai_provider, ai_character_config').in('id', blogIds).eq('user_id', userId),
      supabase.from('ai_api_keys').select('provider, encrypted_key').eq('user_id', userId).eq('is_active', true),
    ])

    const keyMap: Record<string, string> = {}
    for (const k of apiKeys ?? []) {
      try { keyMap[k.provider] = decrypt(k.encrypted_key) } catch {}
    }

    const createdPostIds: string[] = []

    for (const kw of keywords) {
      for (const blog of blogs ?? []) {
        const provider = (blog.ai_provider as string) ?? 'claude'
        const apiKey = keyMap[provider]
        if (!apiKey) continue

        const adapter = await createAIAdapter(provider as 'claude' | 'openai' | 'gemini', apiKey)
        const generated = await adapter.generatePost({
          keyword: kw.keyword as string,
          characterConfig: (blog.ai_character_config as Record<string, string>) ?? {},
          imageCount: (job.image_count as number) ?? 0,
          blogId: blog.id as string,
        })

        // imageCount > 0이면 이미지 자동 생성 + HTML에 삽입
        let finalHtml = generated.htmlContent
        const imageCount = (job.image_count as number) ?? 0
        if (imageCount > 0 && keyMap['imagen']) {
          try {
            const imgAdapter = await createImageAdapter('imagen', keyMap['imagen'])
            if (imgAdapter) {
              const images = await imgAdapter.generateImage({
                prompt: `Blog illustration for: ${generated.title}`,
                count: Math.min(imageCount, 4),
                aspectRatio: '16:9',
              })
              const urls = await Promise.all(
                images.map(img => uploadImageFromBase64(img.base64, img.mimeType, userId))
              )
              // 이미지를 HTML 본문 상단에 삽입
              const imgTags = urls.map(url => `<img src="${url}" alt="${generated.title}" style="max-width:100%;height:auto;margin:1em 0;" />`).join('\n')
              finalHtml = imgTags + '\n' + finalHtml
            }
          } catch {
            // 이미지 생성 실패해도 글 발행은 계속
          }
        }

        const { data: post } = await supabase
          .from('posts')
          .insert({
            blog_id: blog.id, user_id: userId,
            title: generated.title,
            slug: generated.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now(),
            content_html: finalHtml,
            keyword: Array.isArray(generated.tags) ? generated.tags.join(',') : '',
            seo_title: generated.seoMeta?.title ?? '',
            meta_description: generated.seoMeta?.description ?? '',
            status: 'published',
            published_at: new Date().toISOString(),
          })
          .select('id').single()

        if (post) createdPostIds.push(post.id as string)
      }

      // 키워드 상태 업데이트
      await supabase.from('keyword_pool').update({ status: 'used' }).eq('id', kw.id)
    }

    // next_run_at 업데이트
    const nextRun = calcNextRun(job)
    await supabase.from('scheduler_jobs').update({ next_run_at: nextRun }).eq('id', job.id)

    // 로그 성공
    await supabase.from('scheduler_logs').update({ status: 'success', post_ids: createdPostIds }).eq('id', log?.id)
  } catch (err) {
    await supabase.from('scheduler_logs').update({
      status: 'failed',
      error_msg: err instanceof Error ? err.message : '알 수 없는 오류',
    }).eq('id', log?.id)
    throw err
  }
}

function calcNextRun(job: Record<string, unknown>): string {
  const next = new Date()
  next.setHours(job.run_hour as number, job.run_minute as number, 0, 0)
  const freq = job.frequency as string
  if (freq === 'daily') next.setDate(next.getDate() + 1)
  else if (freq === 'weekly') next.setDate(next.getDate() + 7)
  else if (freq === 'monthly') next.setMonth(next.getMonth() + 1)
  else next.setFullYear(next.getFullYear() + 100) // once → 매우 먼 미래
  return next.toISOString()
}
