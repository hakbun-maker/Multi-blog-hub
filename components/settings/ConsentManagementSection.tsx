'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { ConsentStatusItem, ConsentType } from '@/types/consent'
import { CONSENT_LABELS, REVOKE_CASCADES } from '@/lib/consent/constants'

export function ConsentManagementSection() {
  const [consents, setConsents] = useState<ConsentStatusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState<ConsentType | null>(null)

  useEffect(() => {
    fetchConsents()
  }, [])

  const fetchConsents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/consents')
      const data = await res.json()
      if (data.consents) {
        setConsents(data.consents)
      }
    } catch (err) {
      console.error('Failed to fetch consents:', err)
      toast.error('동의 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (consentType: ConsentType) => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/consents/${consentType}/revoke`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error('Failed to revoke consent')
      }

      setConsents(prev =>
        prev.map(c =>
          c.consentType === consentType
            ? { ...c, isAgreed: false, agreedAt: null }
            : c
        )
      )

      toast.success(`${CONSENT_LABELS[consentType]} 동의가 철회되었습니다.`)
    } catch (err) {
      console.error('Revoke error:', err)
      toast.error('동의 철회에 실패했습니다.')
    } finally {
      setRevoking(false)
      setRevokeConfirm(null)
    }
  }

  const getRevokeMessage = (consentType: ConsentType) => {
    const cascade = REVOKE_CASCADES[consentType]
    if (!cascade) return null
    return `이 동의를 철회하면 다음이 적용됩니다: ${cascade}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>동의 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>동의 관리</CardTitle>
          <CardDescription>
            서비스 이용 시 수집한 동의 현황과 철회 관리
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {consents.length === 0 ? (
              <p className="text-sm text-muted-foreground">동의 정보가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {consents.map(consent => (
                  <div
                    key={consent.consentType}
                    className="flex items-start justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">{consent.title}</h4>
                      {consent.isAgreed ? (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            동의일: {new Date(consent.agreedAt!).toLocaleDateString('ko-KR')}
                          </p>
                          <p>
                            버전: v{consent.version}
                            {consent.needsUpdate && (
                              <span className="ml-2 inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                                업데이트 필요
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">동의하지 않음</p>
                      )}
                    </div>

                    {consent.isAgreed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRevokeConfirm(consent.consentType)}
                        disabled={revoking}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        철회
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeConfirm !== null} onOpenChange={isOpen => !isOpen && setRevokeConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              동의 철회 확인
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-foreground">
              {revokeConfirm ? CONSENT_LABELS[revokeConfirm] : ''}에 대한 동의를 철회하시겠습니까?
            </p>

            {revokeConfirm && getRevokeMessage(revokeConfirm) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{getRevokeMessage(revokeConfirm)}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              이 작업은 취소할 수 없습니다.
            </p>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setRevokeConfirm(null)}
              disabled={revoking}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeConfirm && handleRevoke(revokeConfirm)}
              disabled={revoking}
            >
              {revoking ? '처리 중...' : '철회'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
