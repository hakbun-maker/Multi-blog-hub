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
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>({})

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

      // Update connection statuses
      const statuses: Record<string, boolean> = {}
      PLATFORMS.forEach((p) => {
        statuses[p.id] = data.data?.[p.id]?.enabled || false
      })
      setConnectionStatuses(statuses)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (platformId: string) => {
    const newStatus = !connectionStatuses[platformId]
    setConnectionStatuses((prev) => ({
      ...prev,
      [platformId]: newStatus,
    }))

    if (!newStatus) {
      // Disable platform
      await saveSettings({ ...settings, [platformId]: { enabled: false } })
    }
  }

  const handleConnect = (platformId: string) => {
    // In real implementation, would open OAuth flow
    toast.info(`${platformId} 계정 연결이 필요합니다. (준비 중)`)
  }

  const saveSettings = async (newSettings: SNSSettings) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/blogs/${blogId}/settings/sns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })

      if (!res.ok) throw new Error('설정 저장 실패')

      toast.success('SNS 설정이 저장되었습니다.')
      setSettings(newSettings)
    } catch (error: any) {
      toast.error(error.message)
      // Revert toggle
      loadSettings()
    } finally {
      setSaving(false)
    }
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
        {PLATFORMS.map((platform) => (
          <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className={`${platform.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                {platform.icon}
              </div>
              <div>
                <h3 className="font-semibold">{platform.name}</h3>
                <p className="text-sm text-gray-600">
                  {connectionStatuses[platform.id] ? (
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>연결됨</span>
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
              <Switch
                checked={connectionStatuses[platform.id] || false}
                onCheckedChange={() => handleToggle(platform.id)}
                disabled={saving}
              />
              {!connectionStatuses[platform.id] && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(platform.id)}
                  disabled={saving}
                >
                  연결하기
                </Button>
              )}
            </div>
          </div>
        ))}

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-2">💡 자동 공유 설정</p>
          <p>활성화된 플랫폼에 블로그 포스트 발행 시 자동으로 SNS에 공유됩니다.</p>
        </div>
      </CardContent>
    </Card>
  )
}
