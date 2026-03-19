'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Plus } from 'lucide-react'

export interface ProviderConfig {
  provider: string
  label: string
  needsSecret: boolean
  placeholder: string
  category?: 'text' | 'image'
}

interface ApiKeyRegisterFormProps {
  providers: ProviderConfig[]
  existingProviders: string[]
  onSave: (data: { provider: string; apiKey: string; apiSecret?: string }) => Promise<void>
  onError?: (message: string) => void
}

export function ApiKeyRegisterForm({
  providers,
  existingProviders,
  onSave,
  onError,
}: ApiKeyRegisterFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  // 선택 가능한 프로바이더 (이미 등록된 것 제외)
  const availableProviders = providers.filter(
    p => !existingProviders.includes(p.provider)
  )

  // 선택된 프로바이더의 정보
  const selectedConfig = providers.find(p => p.provider === selectedProvider)

  // 유효성 검사
  const isValid =
    selectedProvider &&
    apiKey.trim() &&
    (!selectedConfig?.needsSecret || apiSecret.trim())

  const handleSave = async () => {
    if (!selectedConfig) return

    setSaving(true)
    setResult(null)
    try {
      await onSave({
        provider: selectedProvider,
        apiKey: apiKey.trim(),
        apiSecret: selectedConfig.needsSecret ? apiSecret.trim() : undefined,
      })

      setResult({
        ok: true,
        message: `${selectedConfig.label} 키가 성공적으로 등록되었습니다.`,
      })

      // 초기화
      setApiKey('')
      setApiSecret('')
      setShowKey(false)
      setShowSecret(false)
      setSelectedProvider('')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '등록에 실패했습니다.'
      setResult({
        ok: false,
        message: errorMessage,
      })
      onError?.(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (availableProviders.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        모든 API 키가 등록되었습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 프로바이더 선택 */}
      <div className="space-y-2">
        <Label>API 제공자</Label>
        <div className="flex flex-wrap gap-2">
          {availableProviders.map(provider => (
            <button
              key={provider.provider}
              onClick={() => {
                setSelectedProvider(provider.provider)
                setResult(null)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5 ${
                selectedProvider === provider.provider
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {provider.label}
            </button>
          ))}
        </div>
      </div>

      {/* API 키 입력 */}
      {selectedProvider && (
        <>
          <div className="space-y-1.5">
            <Label>API 키</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={selectedConfig?.placeholder || 'API 키 입력'}
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value)
                  setResult(null)
                }}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey(s => !s)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* API 시크릿 입력 (필요한 경우) */}
          {selectedConfig?.needsSecret && (
            <div className="space-y-1.5">
              <Label>API 시크릿</Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="API 시크릿 입력"
                  value={apiSecret}
                  onChange={e => {
                    setApiSecret(e.target.value)
                    setResult(null)
                  }}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret(s => !s)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                시크릿은 AES-256-GCM으로 암호화되어 안전하게 저장됩니다.
              </p>
            </div>
          )}

          {/* 보안 안내 */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            모든 API 키와 시크릿은 AES-256-GCM으로 암호화되어 안전하게
            저장됩니다.
          </div>

          {/* 저장 버튼 */}
          <Button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            API 키 등록
          </Button>

          {/* 결과 메시지 */}
          {result && (
            <div
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                result.ok
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.ok ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              {result.message}
            </div>
          )}
        </>
      )}
    </div>
  )
}
