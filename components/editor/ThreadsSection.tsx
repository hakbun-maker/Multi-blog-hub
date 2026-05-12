'use client'

/**
 * 에디터 블로그 탭 안의 Threads 발행 섹션.
 *
 * - "이 블로그 발행 시 Threads도 발행" 체크박스
 * - "AI 생성" 버튼 (100만 공식 + CTA)
 * - 본문 textarea (4줄, 25-35자/줄, 실시간 검증)
 * - CTA + 링크 textarea (별도 복붙용)
 * - 글자 수 + 줄별 검증 표시
 */

import { useMemo, useState } from 'react'
import { Sparkles, Copy, Check, AlertTriangle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

export interface ThreadsState {
  enabled: boolean       // 발행 여부 체크박스
  threadsText: string    // 본문 4줄
  ctaText: string        // CTA + 링크 (복붙용)
  postUrl: string | null
  generating: boolean
  generated: boolean     // 한 번이라도 AI 생성 했는지
}

interface ThreadsSectionProps {
  blogId: string
  blogName: string
  blogCustomDomain: string | null
  postTitle: string
  postContent: string  // HTML
  postSlug: string
  state: ThreadsState
  onChange: (patch: Partial<ThreadsState>) => void
}

export function ThreadsSection({
  blogId,
  blogName,
  blogCustomDomain,
  postTitle,
  postContent,
  postSlug,
  state,
  onChange,
}: ThreadsSectionProps) {
  const [copiedField, setCopiedField] = useState<'threads' | 'cta' | null>(null)

  const lines = useMemo(() => state.threadsText.split('\n').filter(l => l.length > 0), [state.threadsText])
  const charCount = state.threadsText.length

  const lineValidations = lines.map((line, i) => {
    const len = line.length
    let ok = true
    let hint = ''
    if (i === 0) {
      ok = len >= 25 && len <= 30
      hint = '25-30자 (문제 상황)'
    } else if (i === 1) {
      ok = len >= 30 && len <= 35
      hint = '30-35자 (실패 경험 + 수치)'
    } else if (i === 2) {
      ok = len >= 25 && len <= 30
      hint = '25-30자 (해결책 암시 + 따옴표)'
    } else if (i === 3) {
      ok = len >= 20 && len <= 25
      hint = '20-25자 (후속편 예고 + 이모지 1개)'
    }
    return { line, length: len, ok, hint }
  })

  const totalLineCountOk = lines.length === 4
  const allLinesOk = lineValidations.every(l => l.ok)
  const allValid = totalLineCountOk && allLinesOk

  const canGenerate = !!postTitle && !!postContent && !!postSlug && !!blogCustomDomain

  const handleGenerate = async () => {
    if (!canGenerate) {
      alert('글 제목 + 본문 + 슬러그가 필요합니다. 먼저 본문을 생성하세요.')
      return
    }
    onChange({ generating: true })
    try {
      const res = await fetch('/api/sns/threads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId, postTitle, postContent, postSlug }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(`Threads 생성 실패: ${json.error || '알 수 없는 오류'}`)
        return
      }
      onChange({
        threadsText: json.threadsText ?? '',
        ctaText: json.ctaText ?? '',
        postUrl: json.postUrl ?? null,
        generated: true,
      })
    } catch (e) {
      alert(`네트워크 오류: ${e instanceof Error ? e.message : ''}`)
    } finally {
      onChange({ generating: false })
    }
  }

  const handleCopy = async (text: string, field: 'threads' | 'cta') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      window.prompt('복사:', text)
    }
  }

  return (
    <div className="border border-purple-200 bg-purple-50/30 rounded-lg p-4 space-y-3">
      {/* 헤더 + 발행 체크박스 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Threads 동시 발행</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {blogName} 발행 시 Threads에도 100만 공식으로 게시 (외부 링크 노출 ↑)
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={state.enabled}
            onCheckedChange={(checked) => onChange({ enabled: !!checked })}
            disabled={!blogCustomDomain}
          />
          <span className="text-xs text-gray-600 font-medium">발행</span>
        </label>
      </div>

      {/* custom_domain 없는 경우 안내 */}
      {!blogCustomDomain && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>이 블로그는 custom_domain이 없어 Threads 발행 불가. 블로그 설정 &gt; 도메인을 먼저 등록하세요.</span>
        </div>
      )}

      {/* 발행 ON일 때만 콘텐츠 노출 */}
      {state.enabled && blogCustomDomain && (
        <>
          {/* AI 생성 버튼 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={state.generating || !canGenerate}
              className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {state.generating
                ? <>생성 중…</>
                : <><Sparkles className="w-3.5 h-3.5 mr-1" />{state.generated ? '다시 생성' : 'AI로 생성'}</>}
            </Button>
            {!canGenerate && (
              <span className="text-[11px] text-gray-400 self-center">먼저 본문을 생성하세요</span>
            )}
          </div>

          {/* 본문 4줄 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                Threads 본문 <span className="text-gray-400 font-normal">(100만 조회수 공식 4줄)</span>
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`tabular-nums ${charCount > 500 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                  {charCount}/500자
                </span>
                <button
                  onClick={() => handleCopy(state.threadsText, 'threads')}
                  disabled={!state.threadsText}
                  className="text-purple-600 hover:underline disabled:opacity-30 inline-flex items-center gap-1"
                >
                  {copiedField === 'threads'
                    ? <><Check className="w-3 h-3" />복사됨</>
                    : <><Copy className="w-3 h-3" />복사</>}
                </button>
              </div>
            </div>
            <Textarea
              value={state.threadsText}
              onChange={(e) => onChange({ threadsText: e.target.value })}
              placeholder="AI 생성 버튼을 누르면 100만 공식대로 작성됩니다. 직접 입력도 가능."
              className="text-sm font-mono min-h-[120px] resize-y"
              maxLength={500}
            />

            {/* 줄별 검증 */}
            {lines.length > 0 && (
              <div className="space-y-0.5">
                {[0, 1, 2, 3].map(i => {
                  const v = lineValidations[i]
                  const exists = !!v
                  return (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-400 w-3">{i + 1}.</span>
                      {exists ? (
                        <>
                          <span className={`px-1.5 rounded text-[10px] tabular-nums ${v.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {v.length}자 {v.ok ? '✓' : '⚠'}
                          </span>
                          <span className="text-gray-400 text-[10px]">{v.hint}</span>
                        </>
                      ) : (
                        <span className="text-gray-300 text-[10px]">— 미작성</span>
                      )}
                    </div>
                  )
                })}
                {lines.length > 4 && (
                  <div className="text-[11px] text-amber-700">
                    ⚠ {lines.length - 4}줄 초과 — 4줄 엄수
                  </div>
                )}
              </div>
            )}

            {!allValid && lines.length > 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                형식 권장사항을 벗어났지만 발행은 가능합니다. AI 다시 생성하거나 직접 수정하세요.
              </p>
            )}
          </div>

          {/* CTA + 링크 (별도) */}
          <div className="space-y-1.5 pt-2 border-t border-purple-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                CTA + 링크 <span className="text-gray-400 font-normal">(댓글이나 별도 게시용 — 복붙)</span>
              </label>
              <button
                onClick={() => handleCopy(state.ctaText, 'cta')}
                disabled={!state.ctaText}
                className="text-[11px] text-purple-600 hover:underline disabled:opacity-30 inline-flex items-center gap-1"
              >
                {copiedField === 'cta'
                  ? <><Check className="w-3 h-3" />복사됨</>
                  : <><Copy className="w-3 h-3" />복사</>}
              </button>
            </div>
            <Textarea
              value={state.ctaText}
              onChange={(e) => onChange({ ctaText: e.target.value })}
              placeholder="AI 생성 시 자동으로 채워집니다. (1줄 CTA + 글 링크)"
              className="text-xs font-mono min-h-[60px] resize-y"
            />
            {state.postUrl && (
              <p className="text-[10px] text-gray-400 truncate">
                링크: {state.postUrl}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

