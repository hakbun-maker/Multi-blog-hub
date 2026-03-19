'use client'

import type { BlogLanguage } from '@/types/monetize'
import { useState } from 'react'
import { Lock } from 'lucide-react'
import { usePlan } from '@/hooks/usePlan'

interface LanguageSelectorProps {
  blogId: string
  currentLanguage: BlogLanguage
  onLanguageChange: (lang: BlogLanguage) => void
}

const LANGUAGES: { code: BlogLanguage; label: string; flag: string }[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt_br', label: 'Português', flag: '🇧🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

export function LanguageSelector({
  blogId,
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { planContext } = usePlan()
  const isMultilingualEnabled = planContext?.features?.multilingual === 'true'

  const handleLanguageChange = async (newLanguage: BlogLanguage) => {
    if (newLanguage === currentLanguage) return

    // Check feature gate for non-ko languages
    if (newLanguage !== 'ko' && !isMultilingualEnabled) {
      // Show plan required modal - this would typically be handled by parent
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/blogs/${blogId}/settings/language`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLanguage }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 403) {
          // Plan required
          console.error('Plan required for multilingual:', data.minPlan)
          return
        }
        throw new Error(data.error || 'Failed to update language')
      }

      onLanguageChange(newLanguage)
    } catch (error) {
      console.error('Language update error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">블로그 언어</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LANGUAGES.map(lang => {
          const isLocked = lang.code !== 'ko' && !isMultilingualEnabled

          return (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={isLoading || isLocked}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                currentLanguage === lang.code
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              } ${isLoading || isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="text-sm font-medium">{lang.label}</span>
              {isLocked && (
                <Lock className="w-3 h-3 ml-auto text-gray-400" />
              )}
            </button>
          )
        })}
      </div>
      {!isMultilingualEnabled && (
        <p className="text-xs text-gray-500">
          다국어 지원은 Growth+ 플랜 이상에서 이용 가능합니다.
        </p>
      )}
    </div>
  )
}
