'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Scissors, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AD_SLOT_KEYS,
  AD_SLOT_LABELS,
  DEFAULT_USER_ADS_CONFIG,
  type AdSlotKey,
  type UserAdsConfig,
} from '@/lib/ads/types'

interface Snippet {
  id: string
  name: string
  content: string
  type: string
}

export function AdsConfigTab() {
  const [config, setConfig] = useState<UserAdsConfig>(DEFAULT_USER_ADS_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 스니펫 picker 상태
  const [snippetPickerSlot, setSnippetPickerSlot] = useState<AdSlotKey | null>(null)
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [snippetsLoading, setSnippetsLoading] = useState(false)

  useEffect(() => {
    fetch('/api/user/ads')
      .then(r => r.json())
      .then(j => {
        if (j.data) setConfig(j.data)
      })
      .catch(() => setError('광고 설정을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const update = (patch: Partial<UserAdsConfig>) => setConfig(prev => ({ ...prev, ...patch }))
  const updateSlot = (key: AdSlotKey, patch: { enabled?: boolean; code?: string }) =>
    setConfig(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const openSnippetPicker = async (slotKey: AdSlotKey) => {
    if (snippetPickerSlot === slotKey) {
      setSnippetPickerSlot(null)
      return
    }
    setSnippetPickerSlot(slotKey)
    setSnippetsLoading(true)
    try {
      const res = await fetch('/api/snippets')
      const json = await res.json()
      setSnippets(json.data ?? [])
    } catch { /* ignore */ }
    setSnippetsLoading(false)
  }

  const applySnippet = (slotKey: AdSlotKey, content: string) => {
    updateSlot(slotKey, { code: content })
    setSnippetPickerSlot(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || '저장 실패')
      if (j.data) setConfig(j.data)
      setSavedAt(new Date().toLocaleTimeString('ko-KR'))
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold mb-1">📌 한 번 설정으로 모든 블로그 공통 적용</p>
        <p className="text-blue-800/80 leading-relaxed">
          여기서 입력한 Publisher ID, 슬롯 ID, 배너 코드는 회원님의 모든 블로그에 동일하게 적용됩니다.
          블로그별로 따로 입력할 필요가 없습니다.
        </p>
      </div>

      {/* AdSense Publisher ID */}
      <section className="space-y-2">
        <Label className="text-sm font-semibold">AdSense Publisher ID</Label>
        <Input
          placeholder="ca-pub-XXXXXXXXXXXXXXXX"
          value={config.adsense_pub_id}
          onChange={e => update({ adsense_pub_id: e.target.value })}
        />
        <p className="text-xs text-gray-500">
          AdSense 계정의 Publisher ID (예: ca-pub-1234567890123456). 광고 코드의 <code className="text-[10px] bg-gray-100 px-1">data-ad-client</code> 값.
        </p>
      </section>

      {/* 수익화 글 광고 슬롯 ID */}
      <section className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-4">
        <Label className="text-sm font-semibold text-orange-900">💰 수익화 글 광고 슬롯 ID</Label>
        <p className="text-xs text-orange-800">
          AI 글 생성에서 <strong>수익화 글 작성</strong> 토글을 켜고 발행한 글의 S단계(핵심 본문) 직후에 자동 삽입되는 광고 슬롯입니다.
        </p>
        <Input
          placeholder="1234567890"
          value={config.adsense_slot_mid}
          onChange={e => update({ adsense_slot_mid: e.target.value })}
        />
        <p className="text-[11px] text-orange-700/80 leading-relaxed">
          AdSense 콘솔 → 광고 → 광고 단위 기준 → 새 광고 단위 생성 → 코드의 <code className="text-[10px] bg-white px-1">data-ad-slot</code> 숫자만 입력
        </p>
      </section>

      {/* 광고 슬롯 (배너) */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">광고 슬롯</h3>
        <p className="text-xs text-gray-500">각 위치에 배치할 광고 코드를 입력하세요. 빈 슬롯은 자동으로 비활성화됩니다.</p>
        {AD_SLOT_KEYS.map(key => {
          const slot = config[key]
          const meta = AD_SLOT_LABELS[key]
          return (
            <div key={key} className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">{meta.label}</Label>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>
                <Switch
                  checked={slot.enabled}
                  onCheckedChange={v => updateSlot(key, { enabled: v })}
                />
              </div>
              {slot.enabled && (
                <div className="space-y-1.5">
                  <textarea
                    className="w-full text-xs font-mono p-2 border border-gray-200 rounded resize-y focus:outline-none focus:ring-1 focus:ring-blue-300 min-h-[80px]"
                    placeholder="광고 코드를 붙여넣으세요 (AdSense, etc.)"
                    value={slot.code}
                    onChange={e => updateSlot(key, { code: e.target.value })}
                  />
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openSnippetPicker(key)}
                      className="h-7 text-xs gap-1"
                    >
                      <Scissors className="w-3 h-3" />스니펫 불러오기
                    </Button>
                    {snippetPickerSlot === key && (
                      <div className="absolute left-0 bottom-8 z-20 w-72 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">스니펫 선택</span>
                          <button
                            type="button"
                            onClick={() => setSnippetPickerSlot(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {snippetsLoading ? (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">
                              <Loader2 className="w-4 h-4 animate-spin inline mr-1" />불러오는 중...
                            </div>
                          ) : snippets.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">
                              저장된 스니펫이 없습니다.
                            </div>
                          ) : (
                            snippets.map(s => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => applySnippet(key, s.content)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-800 truncate flex-1">
                                    {s.name}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      s.type === 'html'
                                        ? 'bg-orange-100 text-orange-600'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {s.type}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                  {s.content.slice(0, 60)}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* 저장 */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
          {saving ? '저장 중...' : '저장'}
        </Button>
        {savedAt && <span className="text-xs text-green-600">저장됨 ({savedAt})</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
