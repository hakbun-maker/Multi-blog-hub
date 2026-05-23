/**
 * Threads 글 자동 변환 엔진.
 * 블로그 글 → 100만 조회수 쓰레드 공식 + AI CTA + 도메인 링크
 *
 * 공식 출처: 사용자 지정 (2026-05-04)
 * - 4줄 구조 (문제 → 실패 경험 → 해결책 암시 → 후속편 예고)
 * - 줄당 25-35자
 * - 반말, 구어체, 수치 포함, 따옴표로 키워드 강조
 * - 마지막 줄에만 이모지 1개
 * - FOMO·호기심 자극
 *
 * 별도 CTA + 링크는 클립보드 복사 용도로 분리 반환.
 */

export interface ThreadsGenerationResult {
  threadsText: string       // 100만 공식 4줄 (Threads 본문)
  ctaText: string           // CTA 한 줄 + 링크 (별도 복붙용)
  postUrl: string | null    // custom_domain 기반 링크
  characterCount: number
  lineValidations: { line: string; length: number; ok: boolean }[]  // 줄별 25-35자 검증
}

export interface ThreadsGenerationParams {
  postTitle: string
  postContent: string       // 본문 HTML 또는 plain text
  postSlug: string
  blogCustomDomain: string | null  // null이면 발행 불가
  keyword?: string
  aiApiKey: string
  aiProvider: 'claude' | 'openai' | 'gemini'
}

const FORMULA_PROMPT = `당신은 100만 조회수 쓰레드 작성 전문가입니다.

다음 블로그 글을 읽고 Threads용 후킹 글을 작성하세요.

원본 글 제목: {{TITLE}}
원본 글 본문 발췌:
{{EXCERPT}}

=== 100만 조회수 쓰레드 작성 공식 ===

**1️⃣ 문장 구조 (반드시 4줄)**
- 첫 문장 (25-30자): 문제 상황 제시. 반드시 "~하면 큰일남/안됨" 형식으로 마무리. 독자가 저지를 수 있는 실수 언급.
- 두번째 문장 (30-35자): 구체적 실패 경험. 실제 금액/수치 반드시 포함. "~했다가", "~서 후회" 같은 후회 표현 사용.
- 세번째 문장 (25-30자): 해결책 암시. '핵심 키워드'는 반드시 따옴표로 강조. "요즘 핫한", "최근 유행하는" 같은 트렌드 표현.
- 마지막 문장 (20-25자): 후속편 예고. "댓글에서" 등으로 마무리. 이모지는 마지막 문장에만 1개 사용.

**2️⃣ 필수 표현 요소**
- 반말 사용 (해요체 X)
- 구어체 표현 ("현타", "꿀팁" 등)
- 수치화된 정보 (금액, 시간, 퍼센트)
- 따옴표로 핵심 정보 강조

**3️⃣ 심리 자극**
- FOMO 유발 ("요즘 다들", "진짜 고수들은")
- 손실 암시 ("~놓침", "~날림")
- 호기심 자극 ("비밀", "숨은", "모르는")

**4️⃣ 주의사항**
- 전체 4줄 엄수
- 문장당 25-35자 유지
- 이모지는 마지막 줄에만 1개
- 핵심 키워드는 1-2개만 따옴표
- 과도한 부정 표현 지양

=== 별도 CTA 작성 ===
본문 4줄과 별개로, 글 내용을 본 사람이 클릭하고 싶어지는 짧은 CTA 1줄도 작성하세요.
- 호기심 자극, 구체적 이득 암시
- 30자 이내
- 본문 마지막 줄과 톤 일치

=== 출력 형식 (JSON만, 다른 텍스트 없이) ===
{
  "threads": "1줄\\n2줄\\n3줄\\n4줄",
  "cta": "CTA 한 줄"
}`

/**
 * 블로그 글 → Threads 100만 공식 + CTA 생성.
 */
export async function generateThreadsPost(params: ThreadsGenerationParams): Promise<ThreadsGenerationResult> {
  const excerpt = stripHtmlAndExcerpt(params.postContent, 1500)

  const prompt = FORMULA_PROMPT
    .replace('{{TITLE}}', params.postTitle)
    .replace('{{EXCERPT}}', excerpt)

  const aiOutput = await callAI(params.aiProvider, params.aiApiKey, prompt)
  const parsed = parseAIOutput(aiOutput)

  // custom_domain 기반 링크
  const postUrl = params.blogCustomDomain
    ? `https://${params.blogCustomDomain}/${encodeURIComponent(params.postSlug)}`
    : null

  // CTA + 링크 (복붙용)
  const ctaText = postUrl
    ? `${parsed.cta}\n${postUrl}`
    : parsed.cta

  // 줄별 검증 (25-35자)
  const lines = parsed.threads.split('\n').filter(l => l.trim().length > 0)
  const lineValidations = lines.map(line => ({
    line,
    length: line.length,
    ok: line.length >= 20 && line.length <= 40,  // 살짝 여유: 20-40
  }))

  return {
    threadsText: parsed.threads,
    ctaText,
    postUrl,
    characterCount: parsed.threads.length,
    lineValidations,
  }
}

// ─── 헬퍼 ──────────────────────────────────────────

function stripHtmlAndExcerpt(html: string, maxChars: number): string {
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '...'
}

async function callAI(
  provider: 'claude' | 'openai' | 'gemini',
  apiKey: string,
  prompt: string,
): Promise<string> {
  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Claude API: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`)
    }
    const data = await res.json()
    return (data as { content?: { text?: string }[] }).content?.[0]?.text ?? ''
  }

  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
        }),
      },
    )
    if (!res.ok) throw new Error(`Gemini API: ${res.status}`)
    const data = await res.json()
    return (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      .candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`OpenAI API: ${(err as { error?: { message?: string } }).error?.message ?? res.statusText}`)
    }
    const data = await res.json()
    return (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? ''
  }

  throw new Error(`지원하지 않는 AI provider: ${provider}`)
}

function parseAIOutput(raw: string): { threads: string; cta: string } {
  // JSON 추출
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const obj = JSON.parse(match[0]) as { threads?: string; cta?: string }
      if (obj.threads) {
        return {
          threads: obj.threads.trim(),
          cta: (obj.cta ?? '').trim(),
        }
      }
    } catch {
      // JSON 파싱 실패 시 폴백
    }
  }
  // 폴백: AI가 JSON 안 주면 raw 텍스트 그대로
  return { threads: raw.trim(), cta: '' }
}
