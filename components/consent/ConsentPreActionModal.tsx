'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import type { ConsentType, ConsentVersion } from '@/types/consent'
import { CONSENT_LABELS } from '@/lib/consent/constants'

interface ConsentPreActionModalProps {
  consentType: ConsentType
  open: boolean
  onConsent: () => void
  onCancel: () => void
}

export function ConsentPreActionModal({
  consentType,
  open,
  onConsent,
  onCancel,
}: ConsentPreActionModalProps) {
  const [version, setVersion] = useState<ConsentVersion | null>(null)
  const [loading, setLoading] = useState(false)
  const [consenting, setConsenting] = useState(false)

  useEffect(() => {
    if (!open) return

    const fetchVersion = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/consents/versions?type=${consentType}`)
        const data = await res.json()
        if (data.version) {
          setVersion(data.version)
        }
      } catch (err) {
        console.error('Failed to fetch consent version:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVersion()
  }, [consentType, open])

  const handleConsent = async () => {
    setConsenting(true)
    try {
      const res = await fetch('/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_type: consentType,
          version: version?.version,
          method: 'modal',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to consent')
      }

      onConsent()
    } catch (err) {
      console.error('Consent error:', err)
    } finally {
      setConsenting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            {CONSENT_LABELS[consentType]}
          </DialogTitle>
          <DialogDescription>
            이 기능을 사용하려면 동의가 필요합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">로딩 중...</div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {version?.summary && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-muted-foreground">{version.summary}</p>
                </div>
              )}

              {version?.contentUrl && (
                <p className="text-xs text-muted-foreground">
                  자세한 내용은 동의 후 설정에서 확인할 수 있습니다.
                </p>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  <strong>동의하면:</strong> {CONSENT_LABELS[consentType]} 기능을 사용할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={consenting}
          >
            취소
          </Button>
          <Button
            onClick={handleConsent}
            disabled={consenting}
          >
            {consenting ? '처리 중...' : '동의합니다'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
