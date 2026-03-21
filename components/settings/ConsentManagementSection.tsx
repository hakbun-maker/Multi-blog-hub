'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Trash2, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
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

interface ConsentVersionInfo {
  consentType: string
  version: string
  title: string
  summary: string | null
  contentUrl: string | null
  effectiveDate: string
}

export function ConsentManagementSection() {
  const [consents, setConsents] = useState<ConsentRow[]>([])
  const [consentTexts, setConsentTexts] = useState<Record<string, ConsentVersionInfo>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState<ConsentType | null>(null)

  const fetchConsents = useCallback(async () => {
    setLoading(true)
    try {
      const [consentsRes, versionsRes] = await Promise.all([
        fetch('/api/consents'),
        fetch('/api/consents/versions'),
      ])
      const consentsJson = await consentsRes.json()
      const versionsJson = await versionsRes.json()

      if (consentsJson.data) {
        setConsents(consentsJson.data as ConsentRow[])
      }

      // 버전 텍스트 매핑 (consent_type → version info)
      if (versionsJson.data) {
        const textMap: Record<string, ConsentVersionInfo> = {}
        for (const v of versionsJson.data) {
          // 각 타입의 최신 버전만 유지
          if (!textMap[v.consentType]) {
            textMap[v.consentType] = v
          }
        }
        setConsentTexts(textMap)
      }
    } catch (err) {
      console.error('Failed to fetch consents:', err)
      toast.error('동의 정보를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConsents()
  }, [fetchConsents])

  const isEssential = (consentType: ConsentType) =>
    ESSENTIAL_CONSENTS.includes(consentType)

  const unagreedConsents = consents.filter(c => !c.is_agreed)
  const agreedConsents = consents.filter(c => c.is_agreed)

  // 전체 동의 체크 상태
  const allChecked = unagreedConsents.length > 0 &&
    unagreedConsents.every(c => checked[c.consent_type])

  const checkedCount = unagreedConsents.filter(c => checked[c.consent_type]).length

  const handleToggleAll = (value: boolean) => {
    const newChecked: Record<string, boolean> = {}
    for (const c of unagreedConsents) {
      newChecked[c.consent_type] = value
    }
    setChecked(newChecked)
  }

  const handleToggle = (consentType: ConsentType) => {
    setChecked(prev => ({ ...prev, [consentType]: !prev[consentType] }))
  }

  // 체크된 항목 일괄 동의 제출
  const handleSubmit = async () => {
    const toConsent = unagreedConsents.filter(c => checked[c.consent_type])
    if (toConsent.length === 0) return

    setSubmitting(true)
    let successCount = 0
    let failCount = 0

    for (const consent of toConsent) {
      try {
        const res = await fetch('/api/consents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consent_type: consent.consent_type,
            method: 'checkbox',
          }),
        })
        if (res.ok) successCount++
        else failCount++
      } catch {
        failCount++
      }
    }

    setSubmitting(false)
    setChecked({})

    if (successCount > 0) {
      toast.success(`${successCount}개 항목에 동의했습니다.`)
    }
    if (failCount > 0) {
      toast.error(`${failCount}개 항목 동의에 실패했습니다.`)
    }

    fetchConsents()
  }

  const handleRevoke = async (consentType: ConsentType) => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/consents/${consentType}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '사용자 직접 철회' }),
      })

      if (!res.ok) throw new Error('Failed to revoke consent')

      toast.success(`${CONSENT_LABELS[consentType]} 동의가 철회되었습니다.`)
      fetchConsents()
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            동의 정보를 불러오는 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* ── 미동의 항목: 은행식 동의 UI ── */}
      {unagreedConsents.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              동의가 필요한 항목
            </CardTitle>
            <CardDescription>
              각 항목의 내용을 확인한 후 체크박스를 선택해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 전체 동의 */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Checkbox
                id="consent-all"
                checked={allChecked}
                onCheckedChange={(v) => handleToggleAll(!!v)}
              />
              <label
                htmlFor="consent-all"
                className="text-sm font-semibold cursor-pointer select-none"
              >
                전체 동의 ({unagreedConsents.length}개 항목)
              </label>
            </div>

            <Separator />

            {/* 각 동의 항목: 스크롤 영역 + 체크박스 */}
            <div className="space-y-6">
              {unagreedConsents.map((consent, idx) => {
                const versionInfo = consentTexts[consent.consent_type]
                return (
                  <div key={consent.consent_type}>
                    {idx > 0 && <Separator className="mb-6" />}

                    {/* 제목 */}
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold">{consent.title}</h4>
                      {isEssential(consent.consent_type) && (
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          필수
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        v{consent.latest_version}
                      </span>
                    </div>

                    {/* 스크롤 가능한 동의 내용 */}
                    <div className="h-36 overflow-y-auto border rounded-lg p-3 bg-muted/30 text-sm text-muted-foreground leading-relaxed">
                      {versionInfo?.summary ? (
                        <p>{versionInfo.summary}</p>
                      ) : (
                        <p className="italic">동의서 내용을 불러올 수 없습니다.</p>
                      )}
                    </div>

                    {/* 체크박스 */}
                    <div className="flex items-center gap-3 mt-3">
                      <Checkbox
                        id={`consent-${consent.consent_type}`}
                        checked={!!checked[consent.consent_type]}
                        onCheckedChange={() => handleToggle(consent.consent_type)}
                      />
                      <label
                        htmlFor={`consent-${consent.consent_type}`}
                        className="text-sm cursor-pointer select-none"
                      >
                        {consent.title}에 동의합니다.
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>

            <Separator />

            {/* 동의 제출 버튼 */}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || checkedCount === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  위 내용을 모두 확인하였으며, 동의합니다 ({checkedCount}/{unagreedConsents.length})
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── 동의 완료 항목 ── */}
      <Card>
        <CardHeader>
          <CardTitle>동의 현황</CardTitle>
          <CardDescription>
            서비스 이용 시 수집한 동의 현황과 철회 관리
          </CardDescription>
        </CardHeader>
        <CardContent>
          {consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">동의 정보가 없습니다.</p>
          ) : agreedConsents.length === 0 && unagreedConsents.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 동의한 항목이 없습니다. 위에서 동의를 완료해주세요.
            </p>
          ) : (
            <div className="space-y-3">
              {agreedConsents.map(consent => (
                <div
                  key={consent.consent_type}
                  className="flex items-start justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-sm">{consent.title}</h4>
                      {isEssential(consent.consent_type) && (
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          필수
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 pl-6">
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
                  </div>

                  {!isEssential(consent.consent_type) && (
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
              ))}
            </div>
          )}
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
