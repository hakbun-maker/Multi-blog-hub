'use client'

import { useState } from 'react'
import { Save, RotateCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface MonetizeEditorActionsProps {
  postId: string
  content: string
  score?: number
  onSaved?: () => void
}

export function MonetizeEditorActions({ postId, content, score, onSaved }: MonetizeEditorActionsProps) {
  const [saving, setSaving] = useState(false)
  const [reScoring, setReScoring] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const canApprove = (score ?? 0) >= 45

  const handleSaveDraft = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/monetize/writing/draft/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        throw new Error('저장 실패')
      }

      setMessage({ type: 'success', text: '드래프트가 저장되었습니다.' })
      onSaved?.()

      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '저장 중 오류 발생',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReScore = async () => {
    setReScoring(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/monetize/writing/re-score/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        throw new Error('재검수 요청 실패')
      }

      setMessage({ type: 'success', text: '재검수가 요청되었습니다.' })

      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '재검수 요청 중 오류 발생',
      })
    } finally {
      setReScoring(false)
    }
  }

  const handleApprove = async () => {
    if (!canApprove) {
      setMessage({ type: 'error', text: '45점 이상이어야 승인 발행할 수 있습니다.' })
      return
    }

    if (!confirm('이 글을 승인하고 발행하시겠습니까?')) {
      return
    }

    setApproving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/monetize/writing/approve/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        throw new Error('발행 실패')
      }

      setMessage({ type: 'success', text: '글이 발행되었습니다!' })

      setTimeout(() => {
        window.location.href = '/monetize/writing'
      }, 2000)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '발행 중 오류 발생',
      })
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('거절 사유를 입력하세요:')
    if (!reason) return

    setRejecting(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/monetize/writing/reject/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!res.ok) {
        throw new Error('거절 실패')
      }

      setMessage({ type: 'success', text: '글이 거절되었습니다.' })

      setTimeout(() => {
        window.location.href = '/monetize/writing'
      }, 2000)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '거절 중 오류 발생',
      })
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`rounded-lg px-3 py-2.5 text-xs font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleSaveDraft}
          disabled={saving || reScoring || approving || rejecting}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          임시저장
        </button>

        <button
          onClick={handleReScore}
          disabled={saving || reScoring || approving || rejecting}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {reScoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          재검수 요청
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleApprove}
          disabled={!canApprove || approving || saving || reScoring || rejecting}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          승인 발행
        </button>

        <button
          onClick={handleReject}
          disabled={rejecting || saving || reScoring || approving}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          거절
        </button>
      </div>

      {!canApprove && score !== undefined && (
        <div className="bg-amber-50 rounded border border-amber-200 p-2.5">
          <p className="text-xs text-amber-800">
            📌 45점 이상이어야 승인할 수 있습니다. (현재: {score}점)
          </p>
        </div>
      )}
    </div>
  )
}
