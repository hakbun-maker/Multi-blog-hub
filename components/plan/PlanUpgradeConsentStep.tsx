'use client'

import { useState } from 'react'
import type { PlanId } from '@/types/plan'
import type { ConsentType } from '@/types/consent'
import { CONSENT_LABELS } from '@/lib/consent/constants'
import { useConsentCheck } from '@/hooks/useConsentCheck'
import { CheckSquare, Square, ExternalLink, Info } from 'lucide-react'

// Plan → required consent mapping
const PLAN_CONSENT_MAP: Record<string, { bundled: ConsentType[]; deferred: ConsentType[] }> = {
  growth: {
    bundled: ['automation', 'affiliate_marketing'],
    deferred: ['sns_oauth_instagram', 'sns_oauth_twitter', 'sns_oauth_threads', 'adsense_oauth'],
  },
  scale: {
    bundled: ['automation', 'affiliate_marketing'],
    deferred: ['sns_oauth_instagram', 'sns_oauth_twitter', 'sns_oauth_threads', 'adsense_oauth'],
  },
}

interface PlanUpgradeConsentStepProps {
  targetPlan: PlanId
  onConsentsGranted: () => void
  onCancel: () => void
}

export function PlanUpgradeConsentStep({ targetPlan, onConsentsGranted, onCancel }: PlanUpgradeConsentStepProps) {
  const consentMap = PLAN_CONSENT_MAP[targetPlan]
  const [checkedAll, setCheckedAll] = useState(false)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If no consent needed for this plan, skip
  if (!consentMap || consentMap.bundled.length === 0) {
    onConsentsGranted()
    return null
  }

  const bundled = consentMap.bundled
  const deferred = consentMap.deferred

  const handleToggleAll = (value: boolean) => {
    setCheckedAll(value)
    const newChecked: Record<string, boolean> = {}
    bundled.forEach(type => { newChecked[type] = value })
    setChecked(newChecked)
  }

  const handleToggle = (type: ConsentType) => {
    const newChecked = { ...checked, [type]: !checked[type] }
    setChecked(newChecked)
    setCheckedAll(bundled.every(t => newChecked[t]))
  }

  const allBundledChecked = bundled.every(t => checked[t])

  const handleSubmit = async () => {
    if (!allBundledChecked) {
      setError('모든 동의 항목에 체크해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      for (const consentType of bundled) {
        if (checked[consentType]) {
          const res = await fetch('/api/consents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consentType, method: 'upgrade_flow' }),
          })
          if (!res.ok) throw new Error(`동의 기록 실패: ${consentType}`)
        }
      }
      onConsentsGranted()
    } catch (err: any) {
      setError(err.message || '동의 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const planLabel = targetPlan === 'growth' ? 'Growth' : 'Scale'

  return (
    <div className="rounded-lg border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {planLabel} 업그레이드 — 추가 기능 동의
      </h3>
      <p className="text-sm text-gray-600">
        새로 사용 가능한 기능에 대한 동의가 필요합니다.
      </p>

      {/* 전체 동의 */}
      <button
        onClick={() => handleToggleAll(!checkedAll)}
        className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700"
      >
        {checkedAll ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-gray-400" />}
        전체 동의
      </button>

      {/* 번들 동의 항목 */}
      <div className="space-y-2 ml-1">
        {bundled.map(type => (
          <button
            key={type}
            onClick={() => handleToggle(type)}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 w-full text-left"
          >
            {checked[type] ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-gray-400" />}
            {CONSENT_LABELS[type]}
            <span className="text-gray-400 text-xs ml-auto">[상세 보기]</span>
          </button>
        ))}
      </div>

      {/* 디퍼드 안내 */}
      {deferred.length > 0 && (
        <div className="bg-gray-50 rounded p-3 space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <Info className="w-3 h-3" />
            아래 기능은 실제 연결 시 별도 동의
          </div>
          {deferred.map(type => (
            <p key={type} className="text-xs text-gray-400 ml-4">· {CONSENT_LABELS[type]}</p>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={loading}
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allBundledChecked || loading}
          className="px-4 py-2 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중...' : '동의 후 업그레이드'}
        </button>
      </div>
    </div>
  )
}
