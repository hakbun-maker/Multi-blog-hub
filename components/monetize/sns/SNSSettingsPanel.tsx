'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConsentGate } from '@/components/consent/ConsentGate'
import { ApiKeyStatusBadge } from '@/components/common/ApiKeyStatusBadge'
import type { ConsentType } from '@/types/consent'
import { Unlink, ExternalLink, TestTube, Loader2, ImageIcon, Save } from 'lucide-react'

// ─── 타입 ───

interface SNSPlatformConfig {
  enabled: boolean
  accessToken?: string
  connectedAt?: string
  formatPrompt?: string
}

interface ImageGenConfig {
  enabled: boolean
  style: string
}

interface SNSSettings {
  instagram?: SNSPlatformConfig
  twitter?: SNSPlatformConfig
  threads?: SNSPlatformConfig
  imageGen?: ImageGenConfig
}

type PlatformId = 'instagram' | 'twitter' | 'threads'

// ─── 상수 ───

const PLATFORMS = [
  { id: 'instagram' as PlatformId, name: 'Instagram', icon: '📷', color: 'bg-pink-100', charLimit: 2200 },
  { id: 'twitter' as PlatformId, name: 'X (Twitter)', icon: '𝕏', color: 'bg-gray-100', charLimit: 280 },
  { id: 'threads' as PlatformId, name: 'Threads', icon: '🧵', color: 'bg-purple-100', charLimit: 500 },
] as const

const DEFAULT_FORMAT_PROMPTS: Record<PlatformId, string> = {
  instagram: '블로그 글을 Instagram 형식으로 변환합니다.\n- PASONA 구조 (문제제기 → 공감 → 해결) 활용\n- 이모지를 적절히 사용\n- 해시태그는 최대 30개\n- 행동유도(CTA): "프로필 링크 클릭!"',
  twitter: '블로그 글을 280자 이내 트윗으로 변환합니다.\n- 핵심 인사이트 1개만 전달\n- 임팩트 있는 문장\n- 해시태그 최대 2개\n- 행동유도(CTA): "더 읽기 →"',
  threads: '블로그 글을 Threads 형식(500자)으로 변환합니다.\n- PASONA 구조 활용\n- 대화체 스타일\n- 해시태그 최대 5개\n- 행동유도(CTA): "전문 가이드 확인하기"',
}

const IMAGE_STYLES = [
  { value: 'photorealistic', label: '사실적 사진' },
  { value: 'digital-art', label: '디지털 아트' },
  { value: 'illustration', label: '일러스트레이션' },
  { value: 'minimalist', label: '미니멀' },
  { value: 'watercolor', label: '수채화' },
]

// ─── 컴포넌트 ───

export function SNSSettingsPanel({ blogId }: { blogId: string }) {
  const [settings, setSettings] = useState<SNSSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})

  useEffect(() => {
    loadSettings()
  }, [blogId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/blogs/${blogId}/settings/sns`)
      if (!res.ok) throw new Error('설정 로드 실패')
      const data = await res.json()
      setSettings(data.data || {})
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const isConnected = (platformId: PlatformId) => {
    const config = settings[platformId]
    return !!(config?.accessToken)
  }

  const getStatus = (platformId: PlatformId): 'connected' | 'error' | 'not_configured' => {
    const config = settings[platformId]
    if (!config?.accessToken) return 'not_configured'
    if (testResults[platformId]?.success === false) return 'error'
    return 'connected'
  }

  // ─── OAuth 연결 ───

  const handleConnect = (platformId: PlatformId) => {
    window.location.href = `/api/oauth/${platformId}/authorize?blogId=${blogId}`
  }

  const handleDisconnect = async (platformId: PlatformId) => {
    if (!confirm(`${PLATFORMS.find(p => p.id === platformId)?.name} 연결을 해제하시겠습니까?`)) return

    try {
      setSaving(true)
      const newSettings = {
        ...settings,
        [platformId]: { enabled: false },
      }
      const res = await fetch(`/api/blogs/${blogId}/settings/sns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      if (!res.ok) throw new Error('연결 해제 실패')
      setSettings(newSettings)
      setTestResults(prev => { const next = { ...prev }; delete next[platformId]; return next })
      toast.success('연결이 해제되었습니다.')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── 플랫폼 ON/OFF 토글 ───

  const handleToggle = async (platformId: PlatformId) => {
    if (!isConnected(platformId)) {
      toast.info('먼저 플랫폼을 연결해주세요.')
      return
    }

    const config = settings[platformId]
    const newEnabled = !config?.enabled
    const newSettings = {
      ...settings,
      [platformId]: { ...config, enabled: newEnabled },
    }

    try {
      setSaving(true)
      const res = await fetch(`/api/blogs/${blogId}/settings/sns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      if (!res.ok) throw new Error('설정 저장 실패')
      setSettings(newSettings)
      toast.success(newEnabled ? '자동 공유가 활성화되었습니다.' : '자동 공유가 비활성화되었습니다.')
    } catch (error: any) {
      toast.error(error.message)
      loadSettings()
    } finally {
      setSaving(false)
    }
  }

  // ─── 연결 테스트 ───

  const handleTest = async (platformId: PlatformId) => {
    setTesting(platformId)
    setTestResults(prev => { const next = { ...prev }; delete next[platformId]; return next })
    try {
      const res = await fetch(`/api/blogs/${blogId}/settings/sns/test/${platformId}`, {
        method: 'POST',
      })
      const data = await res.json()
      setTestResults(prev => ({
        ...prev,
        [platformId]: { success: data.success, message: data.message || (data.success ? '연결 정상' : '연결 실패') },
      }))
      if (data.success) {
        toast.success(`${PLATFORMS.find(p => p.id === platformId)?.name} 연결 테스트 성공`)
      } else {
        toast.error(`연결 테스트 실패: ${data.message}`)
      }
    } catch {
      setTestResults(prev => ({
        ...prev,
        [platformId]: { success: false, message: '테스트 요청 실패' },
      }))
      toast.error('연결 테스트 요청 실패')
    } finally {
      setTesting(null)
    }
  }

  // ─── 포맷 프롬프트 변경 ───

  const handleFormatPromptChange = (platformId: PlatformId, prompt: string) => {
    setSettings(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], formatPrompt: prompt },
    }))
  }

  // ─── 이미지 생성 설정 변경 ───

  const handleImageGenToggle = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      imageGen: { ...prev.imageGen, enabled, style: prev.imageGen?.style || 'photorealistic' },
    }))
  }

  const handleImageStyleChange = (style: string) => {
    setSettings(prev => ({
      ...prev,
      imageGen: { ...prev.imageGen, enabled: prev.imageGen?.enabled || false, style },
    }))
  }

  // ─── 전체 설정 저장 ───

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/blogs/${blogId}/settings/sns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('설정 저장 실패')
      toast.success('SNS 설정이 저장되었습니다.')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      {/* ─── 플랫폼 연결 (PlatformToggleGroup) ─── */}
      <Card>
        <CardHeader>
          <CardTitle>SNS 플랫폼 연결</CardTitle>
          <CardDescription>블로그 포스트를 자동 공유할 플랫폼을 연결하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PLATFORMS.map((platform) => {
            const connected = isConnected(platform.id)
            const config = settings[platform.id]
            const status = getStatus(platform.id)
            const testResult = testResults[platform.id]

            return (
              <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`${platform.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{platform.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {status === 'connected' && (
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                          <span>연결됨{config?.enabled ? ' · 자동 공유 ON' : ''}</span>
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span>
                          <span>오류 — {testResult?.message}</span>
                        </span>
                      )}
                      {status === 'not_configured' && (
                        <span className="flex items-center space-x-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
                          <span>연결 안 됨</span>
                        </span>
                      )}
                    </p>
                    {connected && config?.connectedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        연결일: {new Date(config.connectedAt).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {connected ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(platform.id)}
                        disabled={testing === platform.id || saving}
                        title="연결 테스트"
                      >
                        {testing === platform.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                      </Button>
                      <Switch
                        checked={config?.enabled || false}
                        onCheckedChange={() => handleToggle(platform.id)}
                        disabled={saving}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(platform.id)}
                        disabled={saving}
                        className="text-red-500 hover:text-red-600"
                        title="연결 해제"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <ConsentGate
                      consentType={`sns_oauth_${platform.id}` as ConsentType}
                      ui="modal"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(platform.id)}
                        disabled={saving}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        연결하기
                      </Button>
                    </ConsentGate>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ─── SNS 포맷 프롬프트 (SNSFormatPromptInput) ─── */}
      <Card>
        <CardHeader>
          <CardTitle>SNS 포맷 프롬프트</CardTitle>
          <CardDescription>
            플랫폼별로 블로그 글을 SNS 포스트로 변환할 때 사용하는 PASONA 기반 프롬프트입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {PLATFORMS.map((platform) => {
            const config = settings[platform.id]
            const prompt = config?.formatPrompt || DEFAULT_FORMAT_PROMPTS[platform.id]

            return (
              <div key={platform.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span className="text-lg">{platform.icon}</span>
                    {platform.name}
                    <span className="text-xs text-muted-foreground">({platform.charLimit}자 제한)</span>
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatPromptChange(platform.id, DEFAULT_FORMAT_PROMPTS[platform.id])}
                    className="text-xs"
                  >
                    기본값 복원
                  </Button>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => handleFormatPromptChange(platform.id, e.target.value)}
                  rows={4}
                  className="text-sm font-mono"
                  placeholder={DEFAULT_FORMAT_PROMPTS[platform.id]}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ─── 이미지 생성 설정 (ImageGenToggle) ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            이미지 자동 생성
          </CardTitle>
          <CardDescription>
            SNS 포스트에 사용할 대표 이미지를 자동으로 생성합니다. (Imagen API 필요)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">이미지 자동 생성</p>
              <p className="text-xs text-muted-foreground">Instagram 게시 시 이미지가 필수입니다.</p>
            </div>
            <Switch
              checked={settings.imageGen?.enabled || false}
              onCheckedChange={handleImageGenToggle}
              disabled={saving}
            />
          </div>

          {/* Imagen API 키 상태 — 항상 표시 */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Imagen API 키 상태</Label>
            </div>
            <ApiKeyStatusBadge provider="google_imagen" label="Imagen" />
          </div>

          {settings.imageGen?.enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-muted">
              <div className="space-y-1.5">
                <Label className="text-sm">이미지 스타일</Label>
                <Select
                  value={settings.imageGen?.style || 'photorealistic'}
                  onValueChange={handleImageStyleChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLES.map(style => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 저장 버튼 ─── */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
