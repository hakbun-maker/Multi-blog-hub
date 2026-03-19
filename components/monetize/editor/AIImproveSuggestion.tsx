'use client'

import { useState } from 'react'
import { Wand2, Loader2 } from 'lucide-react'

interface AIImproveSuggestionProps {
  postId: string
}

type ImprovementType = 'pasona' | 'seo' | 'cta'

interface ButtonState {
  loading: boolean
  error: string | null
}

export function AIImproveSuggestion({ postId }: AIImproveSuggestionProps) {
  const [buttonStates, setButtonStates] = useState<Record<ImprovementType, ButtonState>>({
    pasona: { loading: false, error: null },
    seo: { loading: false, error: null },
    cta: { loading: false, error: null },
  })

  const handleImprove = async (improvementType: ImprovementType) => {
    setButtonStates((prev) => ({
      ...prev,
      [improvementType]: { loading: true, error: null },
    }))

    try {
      const res = await fetch(`/api/writing/ai-improve/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ improvementType }),
      })

      if (!res.ok) {
        throw new Error('개선 실패')
      }

      const json = await res.json()

      // Dispatch custom event for parent to handle content update
      window.dispatchEvent(
        new CustomEvent('ai-improve-content', {
          detail: { content: json.data.improvedContent, type: improvementType },
        })
      )

      setButtonStates((prev) => ({
        ...prev,
        [improvementType]: { loading: false, error: null },
      }))

      // Auto-clear success after 2 seconds
      setTimeout(() => {
        setButtonStates((prev) => ({
          ...prev,
          [improvementType]: { loading: false, error: null },
        }))
      }, 2000)
    } catch (err) {
      setButtonStates((prev) => ({
        ...prev,
        [improvementType]: {
          loading: false,
          error: err instanceof Error ? err.message : '개선 실패',
        },
      }))
    }
  }

  const buttons: Array<{ type: ImprovementType; label: string; icon: string }> = [
    { type: 'pasona', label: 'PASONA 구조 보강', icon: '📋' },
    { type: 'seo', label: 'SEO 최적화', icon: '🔍' },
    { type: 'cta', label: 'CTA 강화', icon: '🎯' },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">AI 개선 제안</h3>
      <div className="space-y-2">
        {buttons.map(({ type, label }) => {
          const state = buttonStates[type]
          return (
            <button
              key={type}
              onClick={() => handleImprove(type)}
              disabled={state.loading || Object.values(buttonStates).some((s) => s.loading)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              {label}
            </button>
          )
        })}
      </div>

      {Object.entries(buttonStates).map(
        ([type, state]) =>
          state.error && (
            <div key={type} className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
              {state.error}
            </div>
          )
      )}
    </div>
  )
}
