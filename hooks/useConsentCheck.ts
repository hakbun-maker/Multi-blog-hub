'use client'

import { useState, useEffect } from 'react'
import type { ConsentType } from '@/types/consent'

export function useConsentCheck(consentType: ConsentType) {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/consents/check?type=${consentType}`)
      .then(res => res.json())
      .then(data => { setHasConsent(data.hasValidConsent); setLoading(false) })
      .catch(() => { setHasConsent(false); setLoading(false) })
  }, [consentType])

  const refresh = () => {
    setLoading(true)
    fetch(`/api/consents/check?type=${consentType}`)
      .then(res => res.json())
      .then(data => { setHasConsent(data.hasValidConsent); setLoading(false) })
      .catch(() => { setHasConsent(false); setLoading(false) })
  }

  return { hasConsent, loading, refresh }
}
