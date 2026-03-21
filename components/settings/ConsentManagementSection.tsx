'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { ConsentType } from '@/types/consent'
import { CONSENT_LABELS, ESSENTIAL_CONSENTS, REVOKE_CASCADES } from '@/lib/consent/constants'

interface ConsentRow {
  consent_type: ConsentType
  title: string
  latest_version: string
  agreed_version: string | null
  is_agreed: boolean
  agreed_at: string | null
  method: string | null
  needs_update: boolean
}

export function ConsentManagementSection() {
  const [consents, setConsents] = useState<ConsentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState<ConsentType | null>(null)
  const [bulkConsenting, setBulkConsenting] = useState(false)

  useEffect(() => {
    fetchConsents()
  }, [])

  const fetchConsents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/consents')
      const json = await res.json()
      if (json.data) {
        setConsents(json.data as ConsentRow[])
      }
    } catch (err) {
      console.error('Failed to fetch consents:', err)
      toast.error('동의 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const isEssential = (consentType: ConsentType) =>
    ESSENTIAL_CONSENTS.includes(consentType)

  // 미동의 항목 수
  const unagreedConsents = consents.filter(c => !c.is_agreed)

  // 일괄 동의
  const handleBulkConsent = async () => {
    if (unagreedConsents.length === 0) return
    setBulkConsenting(true)
    let successCount = 0
    let failCount = 0

    for (const consent of unagreedConsents) {
      try {
        const res = await fetch('/api/consents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consent_type: consent.consent_type,
            method: 'bulk_consent',
          }),
        })
        if (res.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setBulkConsenting(false)

    if (successCount > 0) {
      toast.success(`${successCount}개 항목에 동의했습니다.`)
    }
    if (failCount > 0) {
      toast.error(`${failCount}개 항목 동의에 실패했습니다.`)
    }

    // 동의 현황 새로고침
    fetchConsents()
  }

  // 개별 동의
  const handleSingleConsent = async (consentType: ConsentType) => {
    try {
      const res = await fetch('/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_type: consentType,
          method: 'inline_panel',
        }),
      })
      if (!res.ok) throw new Error('동의 처리 실패')
      toast.success(`${CONSENT_LABELS[consentType]} 동의가 완료되었습니다.`)
      fetchConsents()
    } catch {
      toast.error('동의 처리에 실패했습니다.')
    }
  }

  const handleRevoke = async (consentType: ConsentType) => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/consents/${consentType}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '사용자 직접 철회' }),
      })

      if (!res.ok) {
        throw new Error('Failed to revoke consent')
      }

      setConsents(prev =>
        prev.map(c =>
          c.consent_type === consentType
            ? { ...c, is_agreed: false, agreed_at: null }
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
    if (isEssential(consentType)) {
      return '필수 동의입니다. 철회 시 서비스 이용이 불가능합니다.'
    }
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>동의 관리</CardTitle>
              <CardDescription>
                서비스 이용 시 수집한 동의 현황과 철회 관리
              </CardDescription>
            </div>
            {unagreedConsents.length > 0 && (
              <Button
                onClick={handleBulkConsent}
                disabled={bulkConsenting}
                size="sm"
              >
                {bulkConsenting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    전체 동의 ({unagreedConsents.length}개)
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {consents.length === 0 ? (
              <p className="text-sm text-muted-foreground">동의 정보가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {consents.map(consent => (
                  <div
                    key={consent.consent_type}
                    className="flex items-start justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{consent.title}</h4>
                        {isEssential(consent.consent_type) && (
                          <span className="inline-block bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            필수
                          </span>
                        )}
                      </div>
                      {consent.is_agreed ? (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            동의일: {new Date(consent.agreed_at!).toLocaleDateString('ko-KR')}
                          </p>
                          <p>
                            버전: v{consent.agreed_version}
                            {consent.needs_update && (
                              <span className="ml-2 inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                                업데이트 필요 (최신: v{consent.latest_version})
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">동의하지 않음</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!consent.is_agreed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSingleConsent(consent.consent_type)}
                        >
                          동의
                        </Button>
                      )}
                      {consent.is_agreed && !isEssential(consent.consent_type) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokeConfirm(consent.consent_type)}
                          disabled={revoking}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          철회
                        </Button>
                      )}
                    </div>
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
