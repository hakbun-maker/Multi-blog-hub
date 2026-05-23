'use client'

/**
 * 블로그 글 관리 테이블에서 행별로 호출하는 Threads 글 작성 Sheet.
 *
 * 흐름:
 * 1. 글 제목 + 본문(스크롤 미리보기) 표시
 * 2. "쓰레드 글 생성" 버튼 → AI(100만 공식 4줄) 호출
 * 3. 생성된 4줄 + CTA를 편집 가능한 textarea로 표시
 * 4. 이모지 빠른 삽입 버튼
 * 5. 복사 버튼 → 클립보드 → 사용자가 Threads에 수동 붙여넣기
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Copy, Check, Loader2, MessageSquare, AlertTriangle } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const QUICK_EMOJIS = [
  '💡', '🔥', '✨', '👀', '💰', '💸', '😱', '🤯',
  '😭', '😅', '🥺', '🤔', '🤫', '😎', '🥹', '😂',
  '🎯', '⚡', '🚀', '📈', '💯', '⭐', '🔑', '💪',
  '👇', '⬇️', '📌', '🙌', '🙏', '‼️',
]

interface ThreadsComposerSheetProps {
  postId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PostData {
  id: string
  title: string | null
  slug: string | null
  content_html: string | null
  blog_id: string
}

export function ThreadsComposerSheet({ postId, open, onOpenChange }: ThreadsComposerSheetProps) {
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState<PostData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [threadsText, setThreadsText] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [postUrl, setPostUrl] = useState<string | null>(null)

  const [copiedField, setCopiedField] = useState<'threads' | 'cta' | 'full' | null>(null)

  // 본문 textarea ref — 이모지 커서 위치 삽입용
  const threadsTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 글 로드
  useEffect(() => {
    if (!open || !postId) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPost(null)
    setThreadsText('')
    setCtaText('')
    setPostUrl(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/posts/${postId}`)
        const json = await res.json()
        if (!res.ok) {
          if (!cancelled) setLoadError(json.error ?? '글을 불러올 수 없습니다.')
          return
        }
        if (!cancelled) setPost(json.data as PostData)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : '네트워크 오류')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, postId])

  // 본문은 HTML 그대로 렌더링 (자기 글이라 위험 없음).
  // 글자 수 카운트용 plain 텍스트만 별도 추출.
  const plainCharCount = useMemo(() => {
    if (!post?.content_html) return 0
    return post.content_html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length
  }, [post])

  const lines = useMemo(() => threadsText.split('\n').filter(l => l.trim().length > 0), [threadsText])
  const lineValidations = lines.map((line, i) => {
    const len = line.length
    let ok = true
    let hint = ''
    if (i === 0) { ok = len >= 25 && len <= 30; hint = '25-30자' }
    else if (i === 1) { ok = len >= 30 && len <= 35; hint = '30-35자' }
    else if (i === 2) { ok = len >= 25 && len <= 30; hint = '25-30자' }
    else if (i === 3) { ok = len >= 20 && len <= 25; hint = '20-25자' }
    return { line, length: len, ok, hint }
  })

  const handleGenerate = async () => {
    if (!post || !post.title || !post.content_html || !post.slug) {
      alert('글 제목·본문·슬러그가 필요합니다.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/sns/threads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId: post.blog_id,
          postTitle: post.title,
          postContent: post.content_html,
          postSlug: post.slug,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(`생성 실패: ${json.error ?? '알 수 없는 오류'}`)
        return
      }
      setThreadsText(json.threadsText ?? '')
      setCtaText(json.ctaText ?? '')
      setPostUrl(json.postUrl ?? null)
    } catch (e) {
      alert(`네트워크 오류: ${e instanceof Error ? e.message : ''}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (text: string, field: 'threads' | 'cta' | 'full') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      window.prompt('복사 (Ctrl+C):', text)
    }
  }

  const insertEmoji = (emoji: string) => {
    const ta = threadsTextareaRef.current
    if (!ta) {
      // ref 없으면 fallback — 끝에 추가
      setThreadsText(prev => prev + emoji)
      return
    }
    const start = ta.selectionStart ?? threadsText.length
    const end = ta.selectionEnd ?? threadsText.length
    const next = threadsText.slice(0, start) + emoji + threadsText.slice(end)
    setThreadsText(next)
    // 다음 렌더 후 커서를 이모지 뒤로 이동
    requestAnimationFrame(() => {
      const pos = start + emoji.length
      ta.focus()
      ta.setSelectionRange(pos, pos)
    })
  }

  const fullText = threadsText + (ctaText ? `\n\n${ctaText}` : '')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-700" />
            쓰레드 글 작성
          </SheetTitle>
          <SheetDescription>
            블로그 글을 기반으로 100만 공식 4줄 쓰레드를 생성하고, 복사해서 Threads에 수동 업로드하세요.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
          {loading && (
            <div className="text-center text-sm text-gray-400 py-8">
              <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
              글 불러오는 중...
            </div>
          )}

          {loadError && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {post && (
            <>
              {/* ── 원본 글 미리보기 (HTML 렌더링) ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">원본 글</h3>
                  <span className="text-[11px] text-gray-400">{plainCharCount.toLocaleString()}자</span>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{post.title || '(제목 없음)'}</p>
                  {post.content_html ? (
                    <div
                      className="max-h-72 overflow-y-auto rounded bg-white border border-gray-100 p-3 prose prose-sm prose-gray max-w-none [&_img]:max-w-full [&_iframe]:max-w-full [&_table]:text-xs [&_p]:my-2 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                      dangerouslySetInnerHTML={{ __html: post.content_html }}
                    />
                  ) : (
                    <div className="text-xs text-gray-400 italic">(본문 없음)</div>
                  )}
                </div>
              </section>

              {/* ── 생성 버튼 ── */}
              <section className="space-y-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full"
                >
                  {generating
                    ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />생성 중...</>
                    : <><Sparkles className="w-4 h-4 mr-1.5" />쓰레드 글 생성 (AI)</>}
                </Button>
                <p className="text-[11px] text-gray-400">
                  100만 공식 4줄 — 문제 제시 → 실패 경험 → 해결책 암시 → 후속편 예고
                </p>
              </section>

              {/* ── 생성 결과 (편집 가능) ── */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">쓰레드 본문 (4줄)</h3>
                  <span className="text-[11px] text-gray-400">{threadsText.length}자</span>
                </div>

                <Textarea
                  ref={threadsTextareaRef}
                  value={threadsText}
                  onChange={e => setThreadsText(e.target.value)}
                  placeholder="여기에 4줄 본문이 생성됩니다. 직접 편집 가능."
                  rows={6}
                  className="text-sm font-mono"
                />

                {/* 줄별 길이 검증 */}
                {lines.length > 0 && (
                  <ul className="space-y-0.5 text-[11px]">
                    {lineValidations.map((v, i) => (
                      <li key={i} className={`flex items-center gap-1.5 ${v.ok ? 'text-green-600' : 'text-amber-600'}`}>
                        {v.ok ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        <span>{i + 1}번째 줄</span>
                        <span className="text-gray-400">·</span>
                        <span>{v.length}자 / {v.hint}</span>
                      </li>
                    ))}
                    {lines.length !== 4 && (
                      <li className="text-amber-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        총 {lines.length}줄 — 4줄 권장
                      </li>
                    )}
                  </ul>
                )}

                {/* 이모지 빠른 삽입 — 커서 위치에 삽입 */}
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-500">이모지 삽입 (textarea 커서 위치에 들어감)</p>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        // textarea 포커스/선택 유지를 위해 mousedown 기본 동작 차단
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => insertEmoji(emoji)}
                        className="w-7 h-7 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-base leading-none flex items-center justify-center"
                        title={`${emoji} 삽입`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 복사 버튼 (본문만) */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(threadsText, 'threads')}
                    disabled={!threadsText}
                    className="flex-1"
                  >
                    {copiedField === 'threads'
                      ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />복사됨</>
                      : <><Copy className="w-3.5 h-3.5 mr-1.5" />본문 복사</>}
                  </Button>
                </div>
              </section>

              {/* ── CTA + 링크 (있을 때만) ── */}
              {ctaText && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CTA + 링크 (별도 댓글용)</h3>
                  <Textarea
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(ctaText, 'cta')}
                    className="w-full"
                  >
                    {copiedField === 'cta'
                      ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />복사됨</>
                      : <><Copy className="w-3.5 h-3.5 mr-1.5" />CTA 복사</>}
                  </Button>
                </section>
              )}

              {/* ── 전체 복사 (본문 + CTA) ── */}
              {threadsText && (
                <section>
                  <Button
                    onClick={() => handleCopy(fullText, 'full')}
                    className="w-full"
                  >
                    {copiedField === 'full'
                      ? <><Check className="w-4 h-4 mr-1.5" />전체 복사 완료</>
                      : <><Copy className="w-4 h-4 mr-1.5" />전체 복사 (본문 + CTA)</>}
                  </Button>
                </section>
              )}

              {postUrl && (
                <p className="text-[11px] text-gray-400 text-center">
                  원본 글 URL: {postUrl}
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t bg-gray-50/60 text-[11px] text-gray-500 leading-relaxed">
          💡 자동 발행은 안 합니다 — <strong>복사 후 Threads 앱·웹에 직접 붙여넣어</strong> 업로드하세요.
        </div>
      </SheetContent>
    </Sheet>
  )
}
