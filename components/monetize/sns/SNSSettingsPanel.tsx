'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

interface SNSPlatformConfig {
  enabled: boolean
  accessToken?: string
}

interface SNSSettings {
  instagram?: SNSPlatformConfig
  twitter?: SNSPlatformConfig
  threads?: SNSPlatformConfig
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-100' },
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'bg-gray-100' },
  { id: 'threads', name: 'Threads', icon: '🧵', color: 'bg-purple-100' },
] as const

export function SNSSettingsPanel({ blogId }: { blogId: string }) {
  const [settings, setSettings] = useState<SNSSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  // 실제 OAuth 토큰이 있는지 확인
  const isConnected = (platformId: string) => {
    const config = settings[platformId as keyof SNSSettings]
    return !!(config?.accessToken)
  }

  const handleToggle = async (platformId: string) => {
    // 연결되지 않은 상태에서는 토글 불가
    if (!isConnected(platformId)) {
      toast.info('먼저 플랫폼을 연결해주세요.')
      return
    }

    const config = settings[platformId as keyof SNSSettings]
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

  const handleConnect = (platformId: string) => {
    toast.info(`${platformId} OAuth 연동은 준비 중입니다. 추후 업데이트를 기다려주세요.`)
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">로딩 중...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SNS 설정</CardTitle>
        <CardDescription>블로그 포스트를 SNS에 자동 공유할 플랫폼을 선택하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id)
          const config = settings[platform.id as keyof SNSSettings]

          return (
            <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`${platform.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                  {platform.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{platform.name}</h3>
                  <p className="text-sm text-gray-600">
                    {connected ? (
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>연결됨{config?.enabled ? ' · 자동 공유 ON' : ''}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span>연결 안 됨</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {connected ? (
                  <Switch
                    checked={config?.enabled || false}
                    onCheckedChange={() => handleToggle(platform.id)}
                    disabled={saving}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnect(platform.id)}
                    disabled={saving}
                  >
                    연결하기 (준비 중)
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-800">
          <p className="font-semibold mb-2">📌 SNS 연동 안내</p>
          <p>SNS 자동 공유 기능은 현재 준비 중입니다. 각 플랫폼의 OAuth 인증이 구현되면 연결 및 자동 공유가 가능해집니다.</p>
        </div>
      </CardContent>
    </Card>
  )
}
