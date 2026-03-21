'use client'

import { useState, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck } from 'lucide-react'
import type { ConsentType } from '@/types/consent'
import { CONSENT_LABELS, CONSENT_UI_CONFIG } from '@/lib/consent/constants'
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
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">{CONSENT_LABELS[consentType]}</CardTitle>
              <CardDescription className="text-sm mt-1">
                이 기능을 사용하기 위해 동의가 필요합니다.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
            className="w-full"
          >
            동의 후 계속하기
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
