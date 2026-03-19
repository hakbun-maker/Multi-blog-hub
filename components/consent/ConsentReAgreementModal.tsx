'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import type { ConsentType } from '@/types/consent'
import { CONSENT_LABELS, ESSENTIAL_CONSENTS } from '@/lib/consent/constants'

interface ConsentReAgreementModalProps {
  pendingConsents: ConsentType[]
  onComplete: () => void
}

export function ConsentReAgreementModal({
  pendingConsents,
  onComplete,
}: ConsentReAgreementModalProps) {
  const [selectedConsents, setSelectedConsents] = useState<Set<ConsentType>>(
    new Set(pendingConsents.filter(type => ESSENTIAL_CONSENTS.includes(type)))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiredConsents = pendingConsents.filter(type => ESSENTIAL_CONSENTS.includes(type))
  const optionalConsents = pendingConsents.filter(type => !ESSENTIAL_CONSENTS.includes(type))
  const canClose = requiredConsents.length === 0
  const isOpen = pendingConsents.length > 0

  const handleToggleConsent = (consentType: ConsentType) => {
    if (ESSENTIAL_CONSENTS.includes(consentType)) return // Can't uncheck essential

    const newSelected = new Set(selectedConsents)
    if (newSelected.has(consentType)) {
      newSelected.delete(consentType)
    } else {
      newSelected.add(consentType)
    }
    setSelectedConsents(newSelected)
  }

  const handleAgree = async () => {
    if (requiredConsents.length > 0) {
      // Ensure all required are selected
      const allRequiredSelected = requiredConsents.every(type => selectedConsents.has(type))
      if (!allRequiredSelected) {
        setError('필수 동의 항목에 모두 동의해야 합니다.')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      for (const consentType of Array.from(selectedConsents)) {
        const res = await fetch('/api/consents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentType }),
        })

        if (!res.ok) {
          throw new Error(`Failed to consent to ${consentType}`)
        }
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : '동의 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    // Only consent to required consents and skip optional ones
    setLoading(true)
    setError(null)

    try {
      for (const consentType of requiredConsents) {
        const res = await fetch('/api/consents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentType }),
        })

        if (!res.ok) {
          throw new Error(`Failed to consent to ${consentType}`)
        }
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : '동의 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Prevent closing dialog when required consents need agreement
  const handleOpenChange = (open: boolean) => {
    if (open === false && !canClose) {
      return // Don't allow closing if there are required consents
    }
    if (open === false && canClose) {
      onComplete()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            동의 재확인
          </DialogTitle>
          <DialogDescription>
            일부 약관이 업데이트되었습니다. 다시 동의해주시기 바랍니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Required Consents */}
          {requiredConsents.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground">필수 동의</h3>
              {requiredConsents.map(consentType => (
                <div key={consentType} className="flex items-center gap-2">
                  <Checkbox
                    id={`required-${consentType}`}
                    checked={selectedConsents.has(consentType)}
                    onCheckedChange={() => handleToggleConsent(consentType)}
                    disabled
                  />
                  <Label
                    htmlFor={`required-${consentType}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {CONSENT_LABELS[consentType]}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {/* Optional Consents */}
          {optionalConsents.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground">선택 동의</h3>
              {optionalConsents.map(consentType => (
                <div key={consentType} className="flex items-center gap-2">
                  <Checkbox
                    id={`optional-${consentType}`}
                    checked={selectedConsents.has(consentType)}
                    onCheckedChange={() => handleToggleConsent(consentType)}
                  />
                  <Label
                    htmlFor={`optional-${consentType}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {CONSENT_LABELS[consentType]}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 justify-end">
          {canClose && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={loading}
            >
              다음에
            </Button>
          )}
          <Button
            onClick={handleAgree}
            disabled={loading}
          >
            {loading ? '처리 중...' : '동의합니다'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
