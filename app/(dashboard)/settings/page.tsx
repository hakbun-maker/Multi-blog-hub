'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Plus, Trash2, User, Key, Bell } from 'lucide-react'

interface AIKey {
  id: string
  provider: 'claude' | 'openai' | 'gemini' | 'imagen'
  masked_key: string
  is_active: boolean
  created_at: string
}

interface UserProfile {
  email: string
  name: string | null
}

const TEXT_PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', placeholder: 'sk-ant-api...' },
  { value: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { value: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
]

const IMAGE_PROVIDERS = [
  {
    value: 'imagen',
    label: 'Google Imagen 3',
    placeholder: 'AIza...',
    note: 'Google AI Studio API Key (Gemini 키와 동일한 형식). Imagen 3 모델로 이미지를 자동 생성합니다.',
  },
]

const ALL_PROVIDERS = [...TEXT_PROVIDERS, ...IMAGE_PROVIDERS]

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [aiKeys, setAIKeys] = useState<AIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 프로필 폼
  const [name, setName] = useState('')

  // AI 키 폼
  const [selectedProvider, setSelectedProvider] = useState<string>('claude')
  const [newKey, setNewKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean>>({})
  const [addingKey, setAddingKey] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, keysRes] = await Promise.all([
        fetch('/api/me'),
        fetch('/api/ai-keys'),
      ])
      const [p, k] = await Promise.all([profileRes.json(), keysRes.json()])
      if (p.data) {
        setProfile(p.data)
        setName(p.data.name ?? '')
      }
      setAIKeys(k.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveProfile() {
    setSaving(true)
    try {
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setProfile(p => p ? { ...p, name } : p)
    } finally {
      setSaving(false)
    }
  }

  async function addKey() {
    if (!newKey.trim()) return
    setAddingKey(true)
    try {
      const res = await fetch('/api/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, apiKey: newKey.trim() }),
      })
      if (res.ok) {
        setNewKey('')
        fetchAll()
      }
    } finally {
      setAddingKey(false)
    }
  }

  async function testKey(id: string) {
    setTestingId(id)
    try {
      const res = await fetch('/api/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', keyId: id }),
      })
      const json = await res.json()
      setTestResults(prev => ({ ...prev, [id]: json.success ?? false }))
    } finally {
      setTestingId(null)
    }
  }

  async function deleteKey(id: string) {
    if (!confirm('이 API 키를 삭제하시겠습니까?')) return
    await fetch(`/api/ai-keys/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  function providerLabel(p: string) {
    return ALL_PROVIDERS.find(pr => pr.value === p)?.label ?? p
  }

  function isImageProvider(p: string) {
    return IMAGE_PROVIDERS.some(pr => pr.value === p)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground text-sm">계정 및 API 키를 관리합니다</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> 계정
            </TabsTrigger>
            <TabsTrigger value="ai-keys" className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" /> AI API 키
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" /> 알림
            </TabsTrigger>
          </TabsList>

          {/* 계정 탭 */}
          <TabsContent value="account" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">프로필</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>이메일</Label>
                  <Input value={profile?.email ?? ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">이메일은 변경할 수 없습니다.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>표시 이름</Label>
                  <Input
                    placeholder="이름 입력"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  저장
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base text-destructive">위험 구역</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">계정 삭제</p>
                    <p className="text-xs text-muted-foreground mt-0.5">모든 데이터가 영구적으로 삭제됩니다.</p>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    계정 삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI API 키 탭 */}
          <TabsContent value="ai-keys" className="mt-6 space-y-4">
            {/* 등록된 키 목록 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">등록된 AI API 키</CardTitle>
              </CardHeader>
              <CardContent>
                {aiKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">등록된 API 키가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {aiKeys.map(key => (
                      <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{providerLabel(key.provider)}</span>
                              <Badge variant={isImageProvider(key.provider) ? 'outline' : 'default'}>
                                {isImageProvider(key.provider) ? '이미지 생성' : '텍스트 생성'}
                              </Badge>
                              <Badge variant={key.is_active ? 'secondary' : 'outline'}>
                                {key.is_active ? '활성' : '비활성'}
                              </Badge>
                              {key.id in testResults && (
                                testResults[key.id]
                                  ? <CheckCircle className="h-4 w-4 text-green-500" />
                                  : <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{key.masked_key}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testKey(key.id)}
                            disabled={testingId === key.id}
                          >
                            {testingId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '테스트'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteKey(key.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 새 키 추가 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">API 키 추가</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>텍스트 생성 AI</Label>
                  <div className="flex gap-2 flex-wrap">
                    {TEXT_PROVIDERS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setSelectedProvider(p.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          selectedProvider === p.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <Label className="mt-2 block">이미지 생성 AI</Label>
                  <div className="flex gap-2 flex-wrap">
                    {IMAGE_PROVIDERS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setSelectedProvider(p.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          selectedProvider === p.value
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {isImageProvider(selectedProvider) && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-1">
                      {IMAGE_PROVIDERS.find(p => p.value === selectedProvider)?.note}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>API 키</Label>
                  <div className="relative">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      placeholder={ALL_PROVIDERS.find(p => p.value === selectedProvider)?.placeholder}
                      value={newKey}
                      onChange={e => setNewKey(e.target.value)}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowKey(s => !s)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    키는 AES-256-GCM으로 암호화되어 안전하게 저장됩니다.
                  </p>
                </div>

                <Button onClick={addKey} disabled={addingKey || !newKey.trim()}>
                  {addingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  API 키 등록
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 알림 탭 */}
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">알림 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: '스케줄러 실행 완료', desc: '자동화 작업이 완료되면 알림을 받습니다.' },
                    { label: '스케줄러 실행 실패', desc: '자동화 작업이 실패하면 알림을 받습니다.' },
                    { label: '키워드 풀 고갈', desc: '사용 가능한 키워드가 없을 때 알림을 받습니다.' },
                  ].map((item, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-4" />}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <Badge variant="secondary">준비 중</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
