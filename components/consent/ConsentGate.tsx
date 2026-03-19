'use client'

import { useState, ReactNode } from 'react'
import type { ConsentType } from '@/types/consent'
import { CONSENT_UI_CONFIG } from '@/lib/consent/constants'
import { useConsentCheck } from '@/hooks/useConsentCheck'
import { ConsentInlinePanel } from './ConsentInlinePanel'
import { ConsentPreActionModal } from './ConsentPreActionModal'

interface ConsentGateProps {
  consentType: ConsentType
  ui?: 'inline_panel' | 'modal'
  onConsent?: () => void
  children: ReactNode
}

export function ConsentGate({
  consentType,
  ui,
  onConsent,
  children,
}: ConsentGateProps) {
  const { hasConsent, refresh } = useConsentCheck(consentType)
  const [showModal, setShowModal] = useState(false)
  const uiType = ui || (CONSENT_UI_CONFIG[consentType] as 'inline_panel' | 'modal')

  if (hasConsent === null) {
    return <div className="text-sm text-muted-foreground">로딩 중...</div>
  }

  if (hasConsent) {
    return <>{children}</>
  }

  const handleConsent = async () => {
    await refresh()
    setShowModal(false)
    onConsent?.()
  }

  const handleCancel = () => {
    setShowModal(false)
  }

  if (uiType === 'inline_panel') {
    return (
      <ConsentInlinePanel
        consentType={consentType}
        onConsent={handleConsent}
      />
    )
  }

  return (
    <>
      <ConsentPreActionModal
        consentType={consentType}
        open={showModal}
        onConsent={handleConsent}
        onCancel={handleCancel}
      />
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          이 기능을 사용하려면 동의가 필요합니다.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          동의 후 계속하기
        </button>
      </div>
    </>
  )
}
