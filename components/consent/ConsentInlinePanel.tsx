'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ConsentType } from '@/types/consent'
import { CONSENT_LABELS } from '@/lib/consent/constants'
import { ConsentFullTextModal } from './ConsentFullTextModal'

interface ConsentInlinePanelProps {
  consentType: ConsentType
  onConsent: () => void
}

export function ConsentInlinePanel({
  consentType,
  onConsent,
}: ConsentInlinePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [showFullText, setShowFullText] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConsent = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_type: consentType,
          method: 'inline_panel',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to consent')
      }

      onConsent()
    } catch (err) {
      console.error('Consent error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base">{CONSENT_LABELS[consentType]}</CardTitle>
              <CardDescription className="text-sm mt-1">
                이 기능을 사용하기 위해 동의가 필요합니다.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {CONSENT_LABELS[consentType]}에 동의하면 이 기능을 사용할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => setShowFullText(true)}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              전체 약관 보기
            </button>
          </CardContent>
        )}

        <div className="px-6 pb-4 flex gap-2">
          <Button
            size="sm"
            onClick={handleConsent}
            disabled={loading}
            className="flex-1"
          >
            {loading ? '처리 중...' : '동의 후 저장'}
          </Button>
        </div>
      </Card>

      <ConsentFullTextModal
        consentType={consentType}
        open={showFullText}
        onOpenChange={setShowFullText}
      />
    </>
  )
}
