/**
 * Writer 에이전트 — 스케줄된 키워드로 AI 글을 자동 생성합니다.
 * scheduled → writing → review 단계로 전환합니다.
 */
import { getServiceClient, runAgent } from './agent-runner'
import { decrypt } from '@/lib/utils/encryption'
import type { AgentRunResult } from './types'

export async function runWriterAgent(userId: string): Promise<AgentRunResult> {
  return runAgent(userId, 'writer', async () => {
    const supabase = getServiceClient()
    let written = 0
    let errors = 0

    // 1. 오늘 발행 예정인 scheduled 키워드 가져오기
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const { data: scheduled } = await supabase
      .from('keyword_pipeline')
      .select('*')
      .eq('user_id', userId)
      .eq('stage', 'scheduled')
      .lte('scheduled_date', today)
      .order('scheduled_time', { ascending: true })
      .limit(5) // 한 번에 최대 5개씩 작성

    if (!scheduled || scheduled.length === 0) return { written: 0, queued: 0 }

    // 2. AI API 키 확인
    const { data: aiKeys } = await supabase
      .from('ai_api_keys')
      .select('provider, encrypted_key')
      .eq('user_id', userId)
      .in('provider', ['claude', 'openai', 'gemini'])
      .eq('is_active', true)

    if (!aiKeys || aiKeys.length === 0) return { written: 0, error: 'no_ai_key' }

    // 가장 먼저 발견된 AI 키 사용
    const aiKey = aiKeys[0]
    let decryptedKey: string
    try {
      decryptedKey = decrypt(aiKey.encrypted_key)
    } catch {
      return { written: 0, error: 'key_decrypt_failed' }
    }

    // 3. 각 키워드에 대해 글 생성
    for (const kw of scheduled) {
      try {
        // writing 단계로 전환
        await supabase
          .from('keyword_pipeline')
          .update({
            stage: 'writing',
            writing_started_at: new Date().toISOString(),
            writing_progress: 10,
          })
          .eq('id', kw.id)

        // 블로그 정보 조회
        const { data: blog } = kw.assigned_blog_id
          ? await supabase
              .from('blogs')
              .select('id, name, primary_ad_category, language, character_config')
              .eq('id', kw.assigned_blog_id)
              .single()
          : { data: null }

        // 진행률 업데이트
        await supabase.from('keyword_pipeline').update({ writing_progress: 30 }).eq('id', kw.id)

        // AI 글 생성 API 호출 (기존 generate 엔드포인트 활용)
        const generateRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: kw.keyword_text,
            relatedKeywords: [],
            blogIds: kw.assigned_blog_id ? [kw.assigned_blog_id] : [],
            imageCount: 1,
            // 내부 서비스 호출임을 표시
            _serviceCall: true,
            _userId: userId,
            _apiKey: decryptedKey,
            _provider: aiKey.provider,
          }),
        })

        await supabase.from('keyword_pipeline').update({ writing_progress: 70 }).eq('id', kw.id)

        if (generateRes.ok) {
          const result = await generateRes.json()
          const postId = result.results?.[0]?.postId

          // review 단계로 전환
          await supabase
            .from('keyword_pipeline')
            .update({
              stage: 'review',
              writing_progress: 100,
              post_id: postId ?? null,
            })
            .eq('id', kw.id)

          written++
        } else {
          // 실패 시 scheduled로 롤백
          await supabase
            .from('keyword_pipeline')
            .update({ stage: 'scheduled', writing_progress: 0 })
            .eq('id', kw.id)
          errors++
        }
      } catch (err) {
        console.error(`[Writer] Error writing keyword ${kw.keyword_text}:`, err)
        await supabase
          .from('keyword_pipeline')
          .update({ stage: 'scheduled', writing_progress: 0 })
          .eq('id', kw.id)
        errors++
      }
    }

    return { written, errors, queued: (scheduled?.length ?? 0) - written - errors }
  })
}
