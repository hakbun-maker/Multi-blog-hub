'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ConsentGate } from '@/components/consent/ConsentGate'
import type { IntentType } from '@/types/monetize'

interface AffiliateConfig {
  autoInsert: boolean
  maxProductsPerPost: number
  provider: 'coupang' | 'amazon' | 'both'
  intentSettings?: Record<IntentType, boolean>
}

interface AffiliateSettingsData {
  affiliateConfig: AffiliateConfig
  coupangConfigured: boolean
  amazonConfigured: boolean
}

interface ApiKeyInfo {
  provider: string
  is_active: boolean
}

const INTENT_TYPES: { type: IntentType; label: string; description: string }[] = [
  { type: 'AD', label: '광고 (AD)', description: '항상 제품 삽입' },
  { type: 'REVIEW', label: '리뷰 (REVIEW)', description: '항상 제품 삽입' },
  { type: 'COMPARE', label: '비교 (COMPARE)', description: '항상 제품 삽입' },
  { type: 'INFO', label: '정보 (INFO)', description: 'AI가 판단' },
  { type: 'TREND', label: '트렌드 (TREND)', description: 'AI가 판단' },
  { type: 'CRITIC', label: '비평 (CRITIC)', description: '제품 삽입 안 함' },
]

export function AffiliateSettingsPanel({ blogId }: { blogId: string }) {
  const [settings, setSettings] = useState<AffiliateSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<AffiliateConfig>({
    autoInsert: false,
    maxProductsPerPost: 1,
    provider: 'coupang',
    intentSettings: { AD: true, REVIEW: true, INFO: false, CRITIC: false, COMPARE: true, TREND: false },
  })
  const [apiKeyCoupang, setApiKeyCoupang] = useState(false)
  const [apiKeyAmazon, setApiKeyAmazon] = useState(false)

  useEffect(() => {
    loadSettings()
    loadApiKeys()
  }, [blogId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/blogs/${blogId}/settings/affiliate`)
      if (!res.ok) throw new Error('설정 로드 실패')

      const data = await res.json()
      setSettings(data.data)
      setConfig(data.data?.affiliateConfig || config)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  // 설정 > API 키 관리에서 등록된 키도 확인
  const loadApiKeys = async () => {
    try {
      const res = await fetch('/api/ai-keys')
      const data = await res.json()
      const keys: ApiKeyInfo[] = data.data || data.keys || []
      setApiKeyCoupang(keys.some(k => k.provider === 'coupang' && k.is_active))
      setApiKeyAmazon(keys.some(k => k.provider === 'amazon' && k.is_active))
    } catch { /* ignore */ }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/blogs/${blogId}/settings/affiliate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) throw new Error('설정 저장 실패')

      toast.success('제휴 설정이 저장되었습니다.')

      const data = await res.json()
      setSettings(data.data)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateIntentSetting = (intentType: IntentType, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      intentSettings: {
        ...prev.intentSettings,
        [intentType]: enabled,
      } as Record<IntentType, boolean>,
    }))
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      {/* 자동 삽입 카드 — 제휴마케팅 동의 필요 */}
      <ConsentGate consentType="affiliate_marketing" ui="inline_panel">
      <Card>
        <CardHeader>
          <CardTitle>자동 삽입 설정</CardTitle>
          <CardDescription>블로그 포스트에 제휴 제품을 자동으로 삽입할지 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="auto-insert" className="text-base font-semibold">
                자동 제품 삽입
              </Label>
              <p className="text-sm text-gray-600 mt-1">활성화 시 Intent 규칙에 따라 자동으로 제품이 삽입됩니다.</p>
            </div>
            <Switch
              id="auto-insert"
              checked={config.autoInsert}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, autoInsert: checked }))}
            />
          </div>

          {config.autoInsert && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="max-products" className="text-sm font-semibold">
                  포스트당 최대 제품 수
                </Label>
                <div className="flex space-x-2 mt-2">
                  {[1, 2, 3].map((num) => (
                    <Button
                      key={num}
                      variant={config.maxProductsPerPost === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setConfig((prev) => ({ ...prev, maxProductsPerPost: num }))}
                    >
                      {num}개
                    </Button>
                  ))}
                </div>
              </div>

              {/* Intent Settings */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-semibold mb-3 block">Intent별 삽입 규칙</Label>
                <div className="space-y-3">
                  {INTENT_TYPES.map(({ type, label, description }) => (
                    <div key={type} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={`intent-${type}`}
                        checked={config.intentSettings?.[type] ?? false}
                        onCheckedChange={(checked) => updateIntentSetting(type, checked as boolean)}
                        disabled={['AD', 'REVIEW', 'COMPARE'].includes(type) || type === 'CRITIC'}
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`intent-${type}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {label}
                        </Label>
                        <p className="text-xs text-gray-500">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      </ConsentGate>

      {/* API 설정 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>제휴사 API 설정</CardTitle>
          <CardDescription>Coupang 또는 Amazon 제휴 API 키를 설정하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Coupang */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">쿠팡 (Coupang)</h4>
              <ApiKeyStatusBadge
                configured={(settings?.coupangConfigured ?? false) || apiKeyCoupang}
                platform="Coupang"
              />
            </div>
            <p className="text-xs text-gray-600 mb-3">
              쿠팡 파트너스 API 키가 필요합니다.{' '}
              <a
                href="https://partners.coupang.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                파트너스 콘솔에서 발급받기
              </a>
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings?tab=ai-keys">설정 &gt; API 키 관리에서 등록</Link>
            </Button>
          </div>

          {/* Amazon */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">아마존 (Amazon)</h4>
              <ApiKeyStatusBadge
                configured={(settings?.amazonConfigured ?? false) || apiKeyAmazon}
                platform="Amazon"
              />
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Amazon Product Advertising API 접근 권한이 필요합니다.{' '}
              <a
                href="https://affiliate-program.amazon.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Amazon Associates에서 신청하기
              </a>
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings?tab=ai-keys">설정 &gt; API 키 관리에서 등록</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  )
}

/**
 * API 키 상태 배지 컴포넌트
 */
function ApiKeyStatusBadge({ configured, platform }: { configured: boolean; platform: string }) {
  return (
    <div
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${configured ? 'bg-green-600' : 'bg-gray-400'}`}></span>
      <span>{configured ? '연결됨' : '미연결'}</span>
    </div>
  )
}
