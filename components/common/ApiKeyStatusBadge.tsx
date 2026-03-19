'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ApiKeyStatusBadgeProps {
  provider: string
  label?: string
}

export function ApiKeyStatusBadge({ provider, label }: ApiKeyStatusBadgeProps) {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/ai-keys')
      .then(res => res.json())
      .then(data => {
        const keys = data.data || data.keys || []
        const found = keys.some((k: any) => k.provider === provider && k.is_active)
        setIsRegistered(found)
      })
      .catch(() => setIsRegistered(false))
  }, [provider])

  if (isRegistered === null) {
    return <span className="text-xs text-gray-400">확인 중...</span>
  }

  if (isRegistered) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="w-3.5 h-3.5" />
        {label || provider} 등록됨
      </span>
    )
  }

  return (
    <Link
      href="/settings?tab=api-keys"
      className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600"
    >
      <XCircle className="w-3.5 h-3.5" />
      미등록 — API 키 관리에서 등록
      <ArrowRight className="w-3 h-3" />
    </Link>
  )
}
