'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ConsentType, ConsentVersion } from '@/types/consent'
import { CONSENT_LABELS } from '@/lib/consent/constants'

interface ConsentFullTextModalProps {
  consentType: ConsentType
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConsentFullTextModal({
  consentType,
  open,
  onOpenChange,
}: ConsentFullTextModalProps) {
  const [version, setVersion] = useState<ConsentVersion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const fetchVersion = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/consents/versions?type=${consentType}`)
        const data = await res.json()
        if (data.version) {
          setVersion(data.version)
        } else {
          setError('동의서를 불러올 수 없습니다.')
        }
      } catch (err) {
        setError('동의서를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchVersion()
  }, [consentType, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{CONSENT_LABELS[consentType]}</DialogTitle>
          {version && (
            <DialogDescription>
              v{version.version} • 시작: {new Date(version.effectiveDate).toLocaleDateString('ko-KR')}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">로딩 중...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          {version && !loading && (
            <div className="space-y-4 pr-4">
              {version.summary && (
                <div className="text-sm text-muted-foreground">
                  <strong>요약:</strong> {version.summary}
                </div>
              )}

              {version.contentUrl ? (
                <div className="border rounded-lg">
                  <iframe
                    src={version.contentUrl}
                    className="w-full h-96 border-none rounded"
                    title={CONSENT_LABELS[consentType]}
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  동의서 내용이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
