'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Loader2, Zap, ZapOff } from 'lucide-react'

interface AutoDiscoveryToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export function AutoDiscoveryToggle({ enabled, onToggle }: AutoDiscoveryToggleProps) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      const res = await fetch('/api/keywords/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_discover: checked }),
      })
      if (res.ok) {
        onToggle(checked)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
      ) : enabled ? (
        <Zap className="w-4 h-4 text-orange-500" />
      ) : (
        <ZapOff className="w-4 h-4 text-gray-400" />
      )}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-700">
          {enabled ? '자동 수집 ON' : '자동 수집 OFF'}
        </span>
        <span className="text-[10px] text-gray-400">
          {enabled ? '매일 05시 자동 발굴' : '수동 검색만'}
        </span>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
        className="data-[state=checked]:bg-orange-500"
      />
    </div>
  )
}
